import { GameState, Action, PlayerId } from '../types/game';

export const DEFAULT_WORKER_URL = 'https://scriptia.mikadoo420.workers.dev';

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
  private healthCheckTimer: any = null;
  private lastHealthStatus: 'CONNECTING' | 'ONLINE' | 'OFFLINE' = 'CONNECTING';

  constructor(serverUrl: string = DEFAULT_WORKER_URL) {
    this.serverUrl = serverUrl || DEFAULT_WORKER_URL;
    this.checkHealth();
    this.startHealthCheckLoop();
  }

  private getHttpBaseUrl(): string {
    let url = this.serverUrl;
    if (url.startsWith('ws://')) {
      url = url.replace('ws://', 'http://');
    } else if (url.startsWith('wss://')) {
      url = url.replace('wss://', 'https://');
    }
    return url.replace(/\/$/, '');
  }

  public async checkHealth(): Promise<boolean> {
    const httpBase = this.getHttpBaseUrl();
    try {
      this.callbacks.onConnectionChange?.('CONNECTING');
      const response = await fetch(`${httpBase}/api/health`, {
        method: 'GET',
        headers: { 'Accept': 'application/json' },
      });
      if (response.ok) {
        const data: any = await response.json().catch(() => null);
        if (data && (data.status === 'ok' || data.service)) {
          this.lastHealthStatus = 'ONLINE';
          this.callbacks.onConnectionChange?.('ONLINE');
          return true;
        }
      }
      this.lastHealthStatus = 'OFFLINE';
      this.callbacks.onConnectionChange?.('OFFLINE');
      return false;
    } catch (err) {
      console.warn('Health check failed for Cloudflare Worker:', err);
      this.lastHealthStatus = 'OFFLINE';
      this.callbacks.onConnectionChange?.('OFFLINE');
      return false;
    }
  }

  private startHealthCheckLoop() {
    this.stopHealthCheckLoop();
    this.healthCheckTimer = setInterval(() => {
      if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
        this.checkHealth();
      }
    }, 15000);
  }

  private stopHealthCheckLoop() {
    if (this.healthCheckTimer) {
      clearInterval(this.healthCheckTimer);
      this.healthCheckTimer = null;
    }
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

  public connect(roomCode: string, onOpenAction?: () => void) {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }

    if (this.ws) {
      try {
        this.ws.close();
      } catch {}
      this.ws = null;
    }

    this.currentRoomCode = roomCode;
    const wsEndpoint = this.resolveWsUrl(this.serverUrl, this.currentRoomCode);

    try {
      this.callbacks.onConnectionChange?.('CONNECTING');
      this.ws = new WebSocket(wsEndpoint);

      this.ws.onopen = () => {
        this.callbacks.onConnectionChange?.('ONLINE');
        this.startPing();
        if (onOpenAction) {
          onOpenAction();
        }
      };

      this.ws.onclose = () => {
        this.stopPing();
        this.callbacks.onConnectionChange?.('OFFLINE');
        if (!this.isExplicitlyClosed) {
          // Auto retry connection after 3s if in room
          if (this.currentRoomCode) {
            this.reconnectTimer = setTimeout(() => {
              this.connect(this.currentRoomCode);
            }, 3000);
          }
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
        this.callbacks.onError?.(msg.message || 'エラーが発生しました');
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
    if (this.lastHealthStatus) {
      this.callbacks.onConnectionChange?.(this.lastHealthStatus);
    }
  }

  private send(data: any) {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      this.callbacks.onError?.('サーバーに接続されていません。');
      return;
    }
    this.ws.send(JSON.stringify(data));
  }

  public createRoom() {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let code = '';
    for (let i = 0; i < 6; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    this.currentRoomCode = code;

    this.connect(code, () => {
      this.send({ type: 'create_room', version: '2.3' });
    });
  }

  public joinRoom(code: string) {
    const cleanCode = code.trim().toUpperCase();
    this.currentRoomCode = cleanCode;

    this.connect(cleanCode, () => {
      this.send({ type: 'join_room', code: cleanCode, version: '2.3' });
    });
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
    this.stopHealthCheckLoop();
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    if (this.ws) {
      try {
        this.ws.close();
      } catch {}
      this.ws = null;
    }
  }
}
