import { GameEngine } from '../engine/gameEngine';
import { Action, GameState, PlayerId, CardData } from '../types/game';
import { Env, ClientMessage, ServerMessage } from './types';
import { sanitizeGameState } from './sanitize';

interface PlayerSession {
  connectionId: string;
  ws: WebSocket;
  role: PlayerId;
  ready: boolean;
  deckCards: CardData[] | null;
  name: string;
}

interface ReplayLogEntry {
  step: number;
  timestamp: number;
  playerId: PlayerId;
  action: Action;
}

export class GameRoom {
  private state: DurableObjectState;
  private env: Env;
  private roomCode: string = '';
  
  private playerA: PlayerSession | null = null;
  private playerB: PlayerSession | null = null;
  
  private engine: GameEngine | null = null;
  private gameState: GameState | null = null;
  private replayLog: ReplayLogEntry[] = [];
  private stepCount: number = 0;

  constructor(state: DurableObjectState, env: Env) {
    this.state = state;
    this.env = env;
  }

  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);
    const upgradeHeader = request.headers.get('Upgrade');

    if (upgradeHeader !== 'websocket') {
      return new Response('Expected WebSocket upgrade', { status: 426 });
    }

    const roomCode = url.searchParams.get('code') || '';
    if (!this.roomCode && roomCode) {
      this.roomCode = roomCode;
    }

    const webSocketPair = new WebSocketPair();
    const client = webSocketPair[0];
    const server = webSocketPair[1];

    // Accept WebSocket connection on the DO server side
    server.accept();

    const connectionId = crypto.randomUUID();

    server.addEventListener('message', async (event: MessageEvent) => {
      try {
        const rawData = typeof event.data === 'string' ? event.data : new TextDecoder().decode(event.data as ArrayBuffer);
        const msg = JSON.parse(rawData) as ClientMessage;
        await this.handleMessage(server, connectionId, msg);
      } catch (err: any) {
        console.error('Error handling WS message:', err);
        this.send(server, { type: 'error', message: err?.message || 'Invalid message format' });
      }
    });

    server.addEventListener('close', () => {
      this.handleDisconnect(connectionId);
    });

    server.addEventListener('error', (err) => {
      console.error('WS Error:', err);
      this.handleDisconnect(connectionId);
    });

    return new Response(null, {
      status: 101,
      webSocket: client,
    });
  }

  private send(ws: WebSocket, msg: ServerMessage) {
    try {
      ws.send(JSON.stringify(msg));
    } catch (e) {
      console.error('Failed to send message:', e);
    }
  }

  private broadcast(msg: ServerMessage) {
    if (this.playerA?.ws) {
      this.send(this.playerA.ws, msg);
    }
    if (this.playerB?.ws) {
      this.send(this.playerB.ws, msg);
    }
  }

  private async handleMessage(ws: WebSocket, connectionId: string, msg: ClientMessage) {
    if (msg.type === 'ping') {
      this.send(ws, { type: 'pong' });
      return;
    }

    if (msg.type === 'create_room') {
      if (msg.version !== '2.3') {
        this.send(ws, {
          type: 'error',
          message: 'クライアントのバージョンが異なります (Required: Ver.2.3)。画面を更新してください。',
        });
        return;
      }

      // Assign as Player A (Host)
      this.playerA = {
        connectionId,
        ws,
        role: 'PLAYER_A',
        ready: false,
        deckCards: null,
        name: 'Player 1',
      };

      this.send(ws, {
        type: 'room_created',
        code: this.roomCode,
      });
      return;
    }

    if (msg.type === 'join_room') {
      if (msg.version !== '2.3') {
        this.send(ws, {
          type: 'error',
          message: 'クライアントのバージョンが異なります (Required: Ver.2.3)。画面を更新してください。',
        });
        return;
      }

      // Check if already full
      if (this.playerA && this.playerB) {
        if (this.playerA.connectionId !== connectionId && this.playerB.connectionId !== connectionId) {
          this.send(ws, { type: 'error', message: 'ルームは満員です (定員2名)。' });
          ws.close(1008, 'Room is full');
          return;
        }
      }

      if (!this.playerA) {
        // First joiner becomes Host
        this.playerA = {
          connectionId,
          ws,
          role: 'PLAYER_A',
          ready: false,
          deckCards: null,
          name: 'Player 1',
        };
        this.send(ws, { type: 'room_created', code: this.roomCode });
      } else if (this.playerA.connectionId === connectionId) {
        // Reconnection of Host
        this.playerA.ws = ws;
        this.send(ws, { type: 'room_joined', code: this.roomCode });
      } else {
        // Second joiner becomes Guest (Player B)
        this.playerB = {
          connectionId,
          ws,
          role: 'PLAYER_B',
          ready: false,
          deckCards: null,
          name: 'Player 2',
        };

        this.broadcast({
          type: 'room_joined',
          code: this.roomCode,
        });
      }
      return;
    }

    if (msg.type === 'player_ready') {
      let isHost = false;
      if (this.playerA && this.playerA.connectionId === connectionId) {
        this.playerA.ready = true;
        this.playerA.deckCards = msg.deckCards;
        isHost = true;
      } else if (this.playerB && this.playerB.connectionId === connectionId) {
        this.playerB.ready = true;
        this.playerB.deckCards = msg.deckCards;
      } else {
        this.send(ws, { type: 'error', message: 'プレイヤーが登録されていません。' });
        return;
      }

      this.broadcast({
        type: 'player_ready_state',
        hostReady: !!this.playerA?.ready,
        guestReady: !!this.playerB?.ready,
      });

      // Both ready -> Start Game
      if (
        this.playerA?.ready &&
        this.playerB?.ready &&
        this.playerA.deckCards &&
        this.playerB.deckCards &&
        !this.gameState
      ) {
        this.startGame();
      }
      return;
    }

    if (msg.type === 'action') {
      if (!this.gameState || !this.engine) {
        this.send(ws, { type: 'error', message: 'ゲームが開始されていません。' });
        return;
      }

      // Sender verification
      let senderRole: PlayerId | null = null;
      if (this.playerA && this.playerA.connectionId === connectionId) {
        senderRole = 'PLAYER_A';
      } else if (this.playerB && this.playerB.connectionId === connectionId) {
        senderRole = 'PLAYER_B';
      }

      if (!senderRole) {
        this.send(ws, { type: 'error', message: '送信者が特定できません。' });
        return;
      }

      this.handlePlayerAction(senderRole, msg.action);
      return;
    }
  }

  private startGame() {
    if (!this.playerA?.deckCards || !this.playerB?.deckCards) return;

    // Server generates deterministic PRNG seed
    const seed = Date.now() ^ (Math.floor(Math.random() * 1000000));
    this.engine = new GameEngine(seed);

    const deckACardIds = this.playerA.deckCards.map((c) => c.cardId);
    const deckBCardIds = this.playerB.deckCards.map((c) => c.cardId);

    this.gameState = this.engine.createInitialState(
      `cf_game_${this.roomCode}`,
      deckACardIds,
      deckBCardIds,
      'Player 1 (朱)',
      'Player 2 (蒼)',
      false,
      false,
      'HUMAN',
      'HUMAN'
    );

    this.stepCount = 0;
    this.replayLog = [];

    // Send initialized state to each player with hidden opponent info
    if (this.playerA?.ws) {
      this.send(this.playerA.ws, {
        type: 'game_started',
        playerId: 'PLAYER_A',
        state: sanitizeGameState(this.gameState, 'PLAYER_A'),
      });
    }

    if (this.playerB?.ws) {
      this.send(this.playerB.ws, {
        type: 'game_started',
        playerId: 'PLAYER_B',
        state: sanitizeGameState(this.gameState, 'PLAYER_B'),
      });
    }
  }

  private handlePlayerAction(senderRole: PlayerId, action: Action) {
    if (!this.gameState || !this.engine) return;

    // 1. Determine which player is expected to respond
    let expectedPlayer: PlayerId = this.gameState.activePlayer;
    if (this.gameState.phase === 'GUARD_STEP' && this.gameState.pendingCombat) {
      expectedPlayer = this.engine.getOpponent(this.gameState, this.gameState.pendingCombat.attackerPlayerId).playerId;
    } else if (this.gameState.phase === 'RUNE_STEP' && this.gameState.pendingTrigger) {
      expectedPlayer = this.gameState.pendingTrigger.triggeringPlayerId;
    }

    if (senderRole !== expectedPlayer) {
      console.warn(`[Security] Action rejected: sender is ${senderRole}, but expected is ${expectedPlayer}`);
      const senderWs = senderRole === 'PLAYER_A' ? this.playerA?.ws : this.playerB?.ws;
      if (senderWs) {
        this.send(senderWs, { type: 'error', message: '相手の手番または応答ステップです。' });
      }
      return;
    }

    // 2. Validate Action against legal actions from GameEngine
    const legalActions = this.engine.getLegalActions(this.gameState);
    const isLegal = legalActions.some((legal) => {
      if (legal.action.type !== action.type) return false;
      // Match payload if present
      if (action.payload && legal.action.payload) {
        return JSON.stringify(action.payload) === JSON.stringify(legal.action.payload);
      }
      return true;
    });

    if (!isLegal) {
      console.warn(`[Security] Illegal action rejected from ${senderRole}:`, action);
      const senderWs = senderRole === 'PLAYER_A' ? this.playerA?.ws : this.playerB?.ws;
      if (senderWs) {
        this.send(senderWs, { type: 'error', message: '無効な操作です。' });
      }
      return;
    }

    // 3. Execute Step on GameEngine
    try {
      const { nextState, log } = this.engine.step(this.gameState, action);
      this.gameState = nextState;
      this.stepCount++;

      this.replayLog.push({
        step: this.stepCount,
        timestamp: Date.now(),
        playerId: senderRole,
        action,
      });

      // 4. Synchronize state with sanitization
      if (this.playerA?.ws) {
        this.send(this.playerA.ws, {
          type: 'state_update',
          state: sanitizeGameState(this.gameState, 'PLAYER_A'),
          log,
        });
      }

      if (this.playerB?.ws) {
        this.send(this.playerB.ws, {
          type: 'state_update',
          state: sanitizeGameState(this.gameState, 'PLAYER_B'),
          log,
        });
      }
    } catch (err: any) {
      console.error('GameEngine step execution failed:', err);
      const senderWs = senderRole === 'PLAYER_A' ? this.playerA?.ws : this.playerB?.ws;
      if (senderWs) {
        this.send(senderWs, { type: 'error', message: `操作の実行に失敗しました: ${err?.message || ''}` });
      }
    }
  }

  private handleDisconnect(connectionId: string) {
    if (this.playerA && this.playerA.connectionId === connectionId) {
      this.playerA = null;
      if (this.playerB?.ws) {
        this.send(this.playerB.ws, { type: 'opponent_disconnected' });
      }
    } else if (this.playerB && this.playerB.connectionId === connectionId) {
      this.playerB = null;
      if (this.playerA?.ws) {
        this.send(this.playerA.ws, { type: 'opponent_disconnected' });
      }
    }
  }
}
