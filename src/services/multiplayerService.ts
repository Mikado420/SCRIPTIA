import { GameState, Action, PlayerId } from '../types/game';

export interface MultiplayerCallbacks {
  onStateUpdate?: (state: GameState, log?: any) => void;
  onGameStarted?: (playerId: PlayerId, state: GameState) => void;
  onError?: (err: string) => void;
  onRoomCreated?: (code: string) => void;
  onRoomJoined?: (code: string) => void;
  onPlayerReadyState?: (hostReady: boolean, guestReady: boolean) => void;
  onOpponentDisconnected?: () => void;
  onConnectionChange?: (status: 'CONNECTING' | 'ONLINE' | 'OFFLINE') => void;
}

export class MultiplayerClient {
  private ws: WebSocket | null = null;
  private serverUrl: string;
  private callbacks: MultiplayerCallbacks = {};
  private currentRoomCode: string = '';
  private isExplicitlyClosed = false;
  private reconnectTimer: any = null;
  private pingInterval: any = null;

  constructor(serverUrl: string) {
    this.serverUrl = serverUrl;
    this.connect();
  }

  private resolveWsUrl(url: string, roomCode?: string): string {
    let wsUrl = url;
    if (wsUrl.startsWith('http://')) {
      wsUrl = wsUrl.replace('http://', 'ws://');
    } else if (wsUrl.startsWith('https://')) {
      wsUrl = wsUrl.replace('https://', 'wss://');
    } else if (wsUrl.startsWith('/')) {
      const loc = window.location;
      const proto = loc.protocol === 'https:' ? 'wss:' : 'ws:';
      wsUrl = `${proto}//${loc.host}${wsUrl}`;
    }

    // Ensure WebSocket endpoint format: /ws?code=XXXXXX
    try {
      const parsed = new URL(wsUrl);
      if (!parsed.pathname.includes('/ws')) {
        parsed.pathname = parsed.pathname.replace(/\/$/, '') + '/ws';
      }
      if (roomCode) {
        parsed.searchParams.set('code', roomCode);
      }
      return parsed.toString();
    } catch {
      return wsUrl;
    }
  }

  public connect(roomCode?: string) {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }

    if (roomCode) {
      this.currentRoomCode = roomCode;
    }

    const wsEndpoint = this.resolveWsUrl(this.serverUrl, this.currentRoomCode);

    try {
      this.callbacks.onConnectionChange?.('CONNECTING');
      this.ws = new WebSocket(wsEndpoint);

      this.ws.onopen = () => {
        this.callbacks.onConnectionChange?.('ONLINE');
        this.startPing();
      };

      this.ws.onclose = () => {
        this.stopPing();
        this.callbacks.onConnectionChange?.('OFFLINE');
        if (!this.isExplicitlyClosed) {
          // Auto retry connection after 3s
          this.reconnectTimer = setTimeout(() => {
            this.connect(this.currentRoomCode);
          }, 3000);
        }
      };

      this.ws.onerror = (e) => {
        console.warn('WebSocket connection error:', e);
        this.callbacks.onConnectionChange?.('OFFLINE');
      };

      this.ws.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data);
          this.handleServerMessage(msg);
        } catch (err) {
          console.error('Failed to parse WebSocket message:', err);
        }
      };
    } catch (err) {
      console.error('WebSocket creation error:', err);
      this.callbacks.onConnectionChange?.('OFFLINE');
    }
  }

  private startPing() {
    this.stopPing();
    this.pingInterval = setInterval(() => {
      if (this.ws && this.ws.readyState === WebSocket.OPEN) {
        this.ws.send(JSON.stringify({ type: 'ping' }));
      }
    }, 20000);
  }

  private stopPing() {
    if (this.pingInterval) {
      clearInterval(this.pingInterval);
      this.pingInterval = null;
    }
  }

  private handleServerMessage(msg: any) {
    switch (msg.type) {
      case 'room_created':
        this.currentRoomCode = msg.code;
        this.callbacks.onRoomCreated?.(msg.code);
        break;
      case 'room_joined':
        this.currentRoomCode = msg.code;
        this.callbacks.onRoomJoined?.(msg.code);
        break;
      case 'player_ready_state':
        this.callbacks.onPlayerReadyState?.(msg.hostReady, msg.guestReady);
        break;
      case 'game_started':
        this.callbacks.onGameStarted?.(msg.playerId, msg.state);
        break;
      case 'state_update':
        this.callbacks.onStateUpdate?.(msg.state, msg.log);
        break;
      case 'error':
        this.callbacks.onError?.(msg.message || 'Error occurred');
        break;
      case 'opponent_disconnected':
        this.callbacks.onOpponentDisconnected?.();
        break;
      case 'pong':
        break;
      default:
        break;
    }
  }

  public setCallbacks(callbacks: MultiplayerCallbacks) {
    this.callbacks = { ...this.callbacks, ...callbacks };
  }

  private send(data: any) {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      this.callbacks.onError?.('サーバーに接続されていません。');
      return;
    }
    this.ws.send(JSON.stringify(data));
  }

  public createRoom() {
    // If not connected to a room specific DO, we can reconnect with room code or send create_room
    const code = Math.random().toString(36).substring(2, 8).toUpperCase();
    this.currentRoomCode = code;
    this.connect(code);

    // Wait until connection opens then send create_room
    const sendCreate = () => {
      if (this.ws && this.ws.readyState === WebSocket.OPEN) {
        this.send({ type: 'create_room', version: '2.3' });
      } else {
        setTimeout(sendCreate, 50);
      }
    };
    sendCreate();
  }

  public joinRoom(code: string) {
    this.currentRoomCode = code;
    this.connect(code);

    const sendJoin = () => {
      if (this.ws && this.ws.readyState === WebSocket.OPEN) {
        this.send({ type: 'join_room', code, version: '2.3' });
      } else {
        setTimeout(sendJoin, 50);
      }
    };
    sendJoin();
  }

  public setReady(code: string, deckCards: any[]) {
    this.send({ type: 'player_ready', code, deckCards });
  }

  public sendAction(code: string, action: Action) {
    this.send({ type: 'action', code, action });
  }

  public disconnect() {
    this.isExplicitlyClosed = true;
    this.stopPing();
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }
}
