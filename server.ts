import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI } from '@google/genai';
import dotenv from 'dotenv';
import { createServer } from 'http';
import { WebSocketServer, WebSocket } from 'ws';
import { GameEngine } from './src/engine/gameEngine.js';
import { GameState, Action, PlayerId } from './src/types/game.js';
import { getCardById } from './src/data/cards.js';

dotenv.config();

const app = express();
const PORT = 3000;
const httpServer = createServer(app);

app.use(express.json({ limit: '10mb' }));

// CORS Middleware for HTTP APIs
app.use((req, res, next) => {
  const origin = req.headers.origin;
  const allowedOrigins = [
    'https://mikado420.github.io',
    'http://localhost:5173',
    'http://localhost:3000',
  ];
  if (origin && (allowedOrigins.includes(origin) || (origin.startsWith('https://ais-') && origin.endsWith('.run.app')))) {
    res.setHeader('Access-Control-Allow-Origin', origin);
  } else {
    res.setHeader('Access-Control-Allow-Origin', '*');
  }
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  if (req.method === 'OPTIONS') {
    return res.sendStatus(204);
  }
  next();
});

// Lazy Google GenAI Client
let genAIClient: GoogleGenAI | null = null;
function getGenAI(): GoogleGenAI | null {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return null;
  }
  if (!genAIClient) {
    genAIClient = new GoogleGenAI({ apiKey });
  }
  return genAIClient;
}

// ==========================================
// Native WebSocket Multiplayer Rooms (Mirroring Durable Objects)
// ==========================================

interface PlayerSession {
  connectionId: string;
  ws: WebSocket;
  role: PlayerId;
  ready: boolean;
  deckCards: string[] | null;
}

interface Room {
  id: string;
  playerA: PlayerSession | null;
  playerB: PlayerSession | null;
  gameState: GameState | null;
  engine: GameEngine | null;
}

const rooms = new Map<string, Room>();

function generateRoomCode() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

function sanitizeGameState(state: GameState, playerId: PlayerId): GameState {
  const safeState = JSON.parse(JSON.stringify(state));
  const opponentRole = playerId === 'PLAYER_A' ? 'playerB' : 'playerA';
  const opponent = safeState[opponentRole];

  if (opponent) {
    opponent.deck = opponent.deck.map((c: any) => ({
      instanceId: c.instanceId,
      ownerPlayerId: c.ownerPlayerId,
      controllerPlayerId: c.controllerPlayerId,
      zone: c.zone,
      isRested: false,
      hasAttackedThisTurn: false,
      turnPlayed: c.turnPlayed,
      damageTaken: 0,
      buffs: [],
      baseCard: {
        cardId: 'HIDDEN',
        name: 'Hidden Card',
        cardType: 'UNIT',
        faction: 'NEUTRAL',
        factionName: '無',
        cost: 0,
        atk: 0,
        def: 0,
        brk: 0,
        effectsText: '',
        effectKeywords: [],
      },
    }));

    opponent.hand = opponent.hand.map((c: any) => ({
      instanceId: c.instanceId,
      ownerPlayerId: c.ownerPlayerId,
      controllerPlayerId: c.controllerPlayerId,
      zone: c.zone,
      isRested: false,
      hasAttackedThisTurn: false,
      turnPlayed: c.turnPlayed,
      damageTaken: 0,
      buffs: [],
      baseCard: {
        cardId: 'HIDDEN',
        name: 'Hidden Card',
        cardType: 'UNIT',
        faction: 'NEUTRAL',
        factionName: '無',
        cost: 0,
        atk: 0,
        def: 0,
        brk: 0,
        effectsText: '',
        effectKeywords: [],
      },
    }));

    if (opponent.runes && opponent.runes.length > 0) {
      opponent.runes = opponent.runes.map((r: any) => ({
        instanceId: r.instanceId,
        ownerPlayerId: r.ownerPlayerId,
        controllerPlayerId: r.controllerPlayerId,
        zone: r.zone,
        isRested: false,
        hasAttackedThisTurn: false,
        turnPlayed: r.turnPlayed,
        damageTaken: 0,
        buffs: [],
        baseCard: {
          cardId: 'HIDDEN_RUNE',
          name: '伏せルーン',
          cardType: 'RUNE',
          faction: 'NEUTRAL',
          factionName: '無',
          cost: 0,
          atk: 0,
          def: 0,
          brk: 0,
          effectsText: '',
          effectKeywords: [],
        },
      }));
    }
  }

  return safeState;
}

function sendMsg(ws: WebSocket, msg: any) {
  if (ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify(msg));
  }
}

function broadcastRoom(room: Room, msg: any) {
  if (room.playerA?.ws) sendMsg(room.playerA.ws, msg);
  if (room.playerB?.ws) sendMsg(room.playerB.ws, msg);
}

const wss = new WebSocketServer({ noServer: true });

wss.on('connection', (ws: WebSocket, req) => {
  const url = new URL(req.url || '', `http://${req.headers.host || 'localhost'}`);
  let roomCode = url.searchParams.get('code') || '';
  const connectionId = Math.random().toString(36).substring(2, 10);

  let currentRoom: Room | null = null;
  if (roomCode) {
    roomCode = roomCode.toUpperCase();
    if (!rooms.has(roomCode)) {
      rooms.set(roomCode, {
        id: roomCode,
        playerA: null,
        playerB: null,
        gameState: null,
        engine: null,
      });
    }
    currentRoom = rooms.get(roomCode)!;
  }

  ws.on('message', (raw) => {
    try {
      const msg = JSON.parse(raw.toString());

      if (msg.type === 'ping') {
        return sendMsg(ws, { type: 'pong' });
      }

      if (msg.type === 'create_room') {
        if (msg.version !== '2.3') {
          return sendMsg(ws, { type: 'error', message: 'クライアントのバージョンがサーバーと異なります (Required: v2.3)。' });
        }
        const code = roomCode || generateRoomCode();
        let room = rooms.get(code);
        if (!room) {
          room = {
            id: code,
            playerA: null,
            playerB: null,
            gameState: null,
            engine: null,
          };
          rooms.set(code, room);
        }
        currentRoom = room;
        room.playerA = {
          connectionId,
          ws,
          role: 'PLAYER_A',
          ready: false,
          deckCards: null,
        };
        return sendMsg(ws, { type: 'room_created', code });
      }

      if (msg.type === 'join_room') {
        if (msg.version !== '2.3') {
          return sendMsg(ws, { type: 'error', message: 'クライアントのバージョンがサーバーと異なります (Required: v2.3)。' });
        }
        const targetCode = (msg.code || roomCode).toUpperCase();
        let room = rooms.get(targetCode);
        if (!room) {
          return sendMsg(ws, { type: 'error', message: 'ルームが見つかりません。' });
        }
        currentRoom = room;

        if (room.playerA && room.playerB) {
          if (room.playerA.connectionId !== connectionId && room.playerB.connectionId !== connectionId) {
            return sendMsg(ws, { type: 'error', message: 'ルームは満員です。' });
          }
        }

        if (!room.playerA) {
          room.playerA = { connectionId, ws, role: 'PLAYER_A', ready: false, deckCards: null };
          return sendMsg(ws, { type: 'room_created', code: targetCode });
        } else if (room.playerA.connectionId === connectionId) {
          room.playerA.ws = ws;
          return sendMsg(ws, { type: 'room_joined', code: targetCode });
        } else {
          room.playerB = { connectionId, ws, role: 'PLAYER_B', ready: false, deckCards: null };
          return sendMsg(ws, { type: 'room_joined', code: targetCode });
        }
      }

      if (msg.type === 'player_ready') {
        const room = currentRoom || (msg.code ? rooms.get(msg.code.toUpperCase()) : null);
        if (!room) return sendMsg(ws, { type: 'error', message: 'ルームが存在しません。' });

        const deckCards = msg.deckCards;
        let detectedRole = 'UNKNOWN';
        if (room.playerA && room.playerA.connectionId === connectionId) detectedRole = 'PLAYER_A';
        else if (room.playerB && room.playerB.connectionId === connectionId) detectedRole = 'PLAYER_B';

        console.log('[ONLINE READY DEBUG] SERVER RECEIVE', {
          connectionId,
          detectedRole,
          deckLength: Array.isArray(deckCards) ? deckCards.length : -1,
          firstCardIds: Array.isArray(deckCards) ? deckCards.slice(0, 10) : []
        });

        if (!Array.isArray(deckCards)) {
          return sendMsg(ws, { type: 'error', message: 'デッキデータが不正です (配列ではありません)。' });
        }
        if (deckCards.length !== 40) {
          return sendMsg(ws, { type: 'error', message: `デッキデータが不正です (40枚ではありません。現在の枚数: ${deckCards.length})。` });
        }
        for (const cardId of deckCards) {
          if (typeof cardId !== 'string' || cardId.trim() === '') {
            return sendMsg(ws, { type: 'error', message: 'デッキデータが不正です (空のIDが含まれています)。' });
          }
          try {
            const c = getCardById(cardId); if (c.cardId !== cardId) console.log("ID MISMATCH", cardId, c.cardId);
          } catch (err) {
            return sendMsg(ws, { type: 'error', message: `デッキデータが不正です (存在しないカード: ${cardId})。` });
          }
        }

        if (room.playerA && room.playerA.connectionId === connectionId) {
          room.playerA.ready = true;
          room.playerA.deckCards = deckCards;
        } else if (room.playerB && room.playerB.connectionId === connectionId) {
          room.playerB.ready = true;
          room.playerB.deckCards = deckCards;
        } else {
          return sendMsg(ws, { type: 'error', message: '未登録のプレイヤーです。' });
        }

        console.log('[ONLINE READY DEBUG] SERVER STATE', {
          playerAReady: !!room.playerA?.ready,
          playerBReady: !!room.playerB?.ready,
          playerADeckLength: room.playerA?.deckCards?.length || 0,
          playerBDeckLength: room.playerB?.deckCards?.length || 0
        });

        console.log('[ONLINE READY DEBUG] SERVER BROADCAST', {
          hostReady: !!room.playerA?.ready,
          guestReady: !!room.playerB?.ready,
        });

        broadcastRoom(room, {
          type: 'player_ready_state',
          hostReady: !!room.playerA?.ready,
          guestReady: !!room.playerB?.ready,
        });

        if (room.playerA?.ready && room.playerB?.ready && room.playerA.deckCards && room.playerB.deckCards && !room.gameState) {
          const seed = Date.now();
          room.engine = new GameEngine(seed);
          room.gameState = room.engine.createInitialState(
            `game_${room.id}`,
            room.playerA.deckCards,
            room.playerB.deckCards,
            'Player 1 (朱)',
            'Player 2 (蒼)',
            false,
            false,
            'HUMAN',
            'HUMAN'
          );

          if (room.playerA?.ws) {
            sendMsg(room.playerA.ws, {
              type: 'game_started',
              playerId: 'PLAYER_A',
              state: sanitizeGameState(room.gameState, 'PLAYER_A'),
            });
          }
          if (room.playerB?.ws) {
            sendMsg(room.playerB.ws, {
              type: 'game_started',
              playerId: 'PLAYER_B',
              state: sanitizeGameState(room.gameState, 'PLAYER_B'),
            });
          }
        }
      }

      if (msg.type === 'action') {
        const room = currentRoom || (msg.code ? rooms.get(msg.code.toUpperCase()) : null);
        if (!room || !room.gameState || !room.engine) return;

        const senderRole: PlayerId = room.playerA?.connectionId === connectionId ? 'PLAYER_A' : 'PLAYER_B';

        try {
          const { nextState, log } = room.engine.step(room.gameState, msg.action);
          room.gameState = nextState;

          if (room.playerA?.ws) {
            sendMsg(room.playerA.ws, {
              type: 'state_update',
              state: sanitizeGameState(room.gameState, 'PLAYER_A'),
              log,
            });
          }
          if (room.playerB?.ws) {
            sendMsg(room.playerB.ws, {
              type: 'state_update',
              state: sanitizeGameState(room.gameState, 'PLAYER_B'),
              log,
            });
          }
        } catch (e: any) {
          console.error(e);
          sendMsg(ws, { type: 'error', message: `Action failed: ${e?.message || ''}` });
        }
      }
    } catch (err) {
      console.error('WS Error:', err);
    }
  });

  ws.on('close', () => {
    if (currentRoom) {
      if (currentRoom.playerA?.connectionId === connectionId) {
        currentRoom.playerA = null;
        if (currentRoom.playerB?.ws) {
          sendMsg(currentRoom.playerB.ws, { type: 'opponent_disconnected' });
        }
      } else if (currentRoom.playerB?.connectionId === connectionId) {
        currentRoom.playerB = null;
        if (currentRoom.playerA?.ws) {
          sendMsg(currentRoom.playerA.ws, { type: 'opponent_disconnected' });
        }
      }
    }
  });
});

// Upgrade HTTP requests for WebSocket on /ws
httpServer.on('upgrade', (request, socket, head) => {
  const url = new URL(request.url || '', `http://${request.headers.host || 'localhost'}`);
  if (url.pathname === '/ws' || url.pathname.startsWith('/ws/')) {
    wss.handleUpgrade(request, socket, head, (ws) => {
      wss.emit('connection', ws, request);
    });
  } else {
    socket.destroy();
  }
});

// ==========================================
// API Routes
// ==========================================

app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'SCRIPTIA Online Server (Express Dev/Preview & Cloudflare DO Compatible)',
    hasApiKey: !!process.env.GEMINI_API_KEY,
    rulesVersion: 'Version 0.03',
    cardPoolVersion: 'Ver.2.3',
  });
});

app.post('/api/room/create', (req, res) => {
  const code = generateRoomCode();
  res.json({ code });
});

// AI Decision Endpoint (Tactical TCG Action Selection)
app.post('/api/ai/decision', async (req, res) => {
  try {
    const { visibleState, legalActions } = req.body;
    if (!visibleState || !legalActions || legalActions.length === 0) {
      return res.status(400).json({ error: 'visibleState and non-empty legalActions are required' });
    }

    const ai = getGenAI();
    if (!ai) {
      return res.json({
        fallback: true,
        reason: 'No GEMINI_API_KEY configured on server. Used Heuristic AI.',
      });
    }

    const systemPrompt = `You are a Grandmaster TCG AI Player in a high-strategy card game (80-card pool Ver 2.3).
Your goal is to maximize your win probability by evaluating board state, tempo, card advantage, mana curves, lethal threats, and enemy triggers.

Given the current visible GameState and the list of Legal Actions (0-indexed):
1. Analyze your board vs opponent board, HP levels, active arcana mana, and threats.
2. Evaluate candidates and select the single BEST action index from the legal actions list.
3. Provide a clear tactical reasoning in Japanese.

You must respond with valid JSON adhering to this structure:
{
  "selectedIndex": number,
  "reason": "string (Japanese explanation of strategic reasoning)",
  "evaluations": [
    {
      "index": number,
      "score": number (0.0 to 10.0),
      "rationale": "string"
    }
  ]
}`;

    const prompt = `Current Game State:
${JSON.stringify(visibleState, null, 2)}

Legal Actions:
${JSON.stringify(
  legalActions.map((act: any, idx: number) => ({
    index: idx,
    description: act.description,
    category: act.category,
    cardName: act.cardName,
  })),
  null,
  2
)}

Select the optimal action index and provide reasoning.`;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: [
        { role: 'user', parts: [{ text: `${systemPrompt}\n\n${prompt}` }] },
      ],
      config: {
        responseMimeType: 'application/json',
        temperature: 0.2,
      },
    });

    const responseText = response.text || '{}';
    let parsed: any;
    try {
      parsed = JSON.parse(responseText);
    } catch {
      return res.json({ fallback: true, reason: 'Failed to parse Gemini JSON response.' });
    }

    const selectedIndex =
      typeof parsed.selectedIndex === 'number' &&
      parsed.selectedIndex >= 0 &&
      parsed.selectedIndex < legalActions.length
        ? parsed.selectedIndex
        : 0;

    return res.json({
      fallback: false,
      selectedIndex,
      selectedAction: legalActions[selectedIndex].action,
      reason: parsed.reason || 'Gemini戦略分析による最適行動',
      evaluations: parsed.evaluations || [],
    });
  } catch (error: any) {
    console.error('Gemini Decision API Error:', error);
    return res.json({
      fallback: true,
      reason: `Gemini API Error: ${error.message || 'Unknown error'}. Fallback to Heuristic AI.`,
    });
  }
});

// AI Strategic Analysis & Commentary Endpoint
app.post('/api/ai/explain', async (req, res) => {
  try {
    const { visibleState } = req.body;
    const ai = getGenAI();
    if (!ai) {
      return res.json({
        analysis: '【戦況分析】現在の盤面は互角の攻防が続いています。アルカナの効率的な運用と相手ガードへの対処が鍵となります。',
      });
    }

    const prompt = `あなたはプロTCG解説者兼コーチです。以下の局面（プレイヤー視点）の戦況を日本語で簡潔にプロ目線で分析してください。
- 現在の優勢度（盤面、リソース、ライフ）
- 次のターンの狙い目・勝ち筋
- 警戒すべき相手の動き

GameState:
${JSON.stringify(visibleState, null, 2)}`;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      config: {
        temperature: 0.3,
      },
    });

    res.json({ analysis: response.text });
  } catch (error: any) {
    res.json({
      analysis: '戦況分析の取得中にエラーが発生しました。盤面の有利トレードとアルカナ管理を維持してください。',
    });
  }
});

// AI Match Replay Post-Mortem Analysis
app.post('/api/ai/analyze-match', async (req, res) => {
  try {
    const { matchSummary } = req.body;
    const ai = getGenAI();
    if (!ai) {
      return res.json({
        review: '【総括】序盤のマナカーブとテンポ維持が勝敗を分けました。デッキの平均コスト配分と除去スペルの採用枚数の調整が有効です。',
      });
    }

    const prompt = `あなたはTCGのシミュレーション分析官です。以下の対戦結果サマリーを基に、勝因・敗因・デッキ調整の提案（キーカードの採用枚数など）を日本語で具体的にフィードバックしてください。

Match Data:
${JSON.stringify(matchSummary, null, 2)}`;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      config: {
        temperature: 0.3,
      },
    });

    res.json({ review: response.text });
  } catch (error: any) {
    res.json({
      review: '対戦レビューの生成に失敗しました。',
    });
  }
});

// ==========================================
// Vite Middleware & Server Start
// ==========================================

async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  httpServer.listen(PORT, '0.0.0.0', () => {
    console.log(`TCG Simulator Server (WebSocket + DO protocol) running on http://localhost:${PORT}`);
  });
}

startServer();
