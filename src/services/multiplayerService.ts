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
  private serverStatus: 'CONNECTING' | 'ONLINE' | 'OFFLINE' = 'CONNECTING';
  private socketStatus: 'DISCONNECTED' | 'CONNECTING' | 'CONNECTED' = 'DISCONNECTED';

  constructor(serverUrl?: string) {
    const envUrl = typeof import.meta !== 'undefined' && import.meta.env ? import.meta.env.VITE_ONLINE_SERVER_URL : undefined;
    const resolvedUrl = (serverUrl || envUrl || DEFAULT_WORKER_URL).trim();
    this.serverUrl = resolvedUrl || DEFAULT_WORKER_URL;
    console.log('[Multiplayer] Server URL:', this.serverUrl);
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

  private updateServerStatus(status: 'CONNECTING' | 'ONLINE' | 'OFFLINE') {
    this.serverStatus = status;
    this.callbacks.onConnectionChange?.(this.serverStatus);
  }

  public async checkHealth(): Promise<boolean> {
    const httpBase = this.getHttpBaseUrl();
    const healthUrl = `${httpBase}/api/health`;
    console.log('[Multiplayer] Health check started:', healthUrl);

    try {
      this.updateServerStatus('CONNECTING');
      const response = await fetch(healthUrl, {
        method: 'GET',
        headers: { 'Accept': 'application/json' },
      });

      console.log('[Multiplayer] Health check response:', {
        url: healthUrl,
        status: response.status,
        ok: response.ok,
      });

      if (response.ok) {
        const data: any = await response.json().catch(() => null);
        if (data && (data.status === 'ok' || data.service)) {
          console.log('[Multiplayer] Cloudflare Worker ONLINE');
          this.updateServerStatus('ONLINE');
          return true;
        }
      }

      console.warn('[Multiplayer] Cloudflare Worker OFFLINE (invalid status or payload)');
      this.updateServerStatus('OFFLINE');
      return false;
    } catch (err) {
      console.warn('[Multiplayer] Cloudflare Worker OFFLINE:', err);
      this.updateServerStatus('OFFLINE');
      return false;
    }
  }

  private startHealthCheckLoop() {
    this.stopHealthCheckLoop();
    this.healthCheckTimer = setInterval(() => {
      // Only perform background health check if not actively connected to a room socket
      if (this.socketStatus !== 'CONNECTED') {
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
    let wsUrl = url.trim();
    if (wsUrl.startsWith('http://')) {
      wsUrl = wsUrl.replace('http://', 'ws://');
    } else if (wsUrl.startsWith('https://')) {
      wsUrl = wsUrl.replace('https://', 'wss://');
    } else if (wsUrl.startsWith('/')) {
      const loc = window.location;
      const proto = loc.protocol === 'https:' ? 'wss:' : 'ws:';
      wsUrl = `${proto}//${loc.host}${wsUrl}`;
    } else if (!wsUrl.startsWith('ws://') && !wsUrl.startsWith('wss://')) {
      wsUrl = `wss://${wsUrl}`;
    }

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
      const base = wsUrl.replace(/\/$/, '');
      return roomCode ? `${base}/ws?code=${roomCode}` : `${base}/ws`;
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
    console.log('[Multiplayer] WebSocket connecting:', wsEndpoint);

    try {
      this.socketStatus = 'CONNECTING';
      this.ws = new WebSocket(wsEndpoint);

      this.ws.onopen = () => {
        console.log('[Multiplayer] WebSocket OPEN');
        this.socketStatus = 'CONNECTED';
        this.updateServerStatus('ONLINE');
        this.startPing();
        if (onOpenAction) {
          onOpenAction();
        }
      };

      this.ws.onclose = () => {
        console.log('[Multiplayer] WebSocket CLOSED');
        this.socketStatus = 'DISCONNECTED';
        this.stopPing();

        if (!this.isExplicitlyClosed) {
          // Trigger health check to verify overall server reachability
          this.checkHealth();

          // Auto retry connection after 3s if inside active room
          if (this.currentRoomCode) {
            this.reconnectTimer = setTimeout(() => {
              this.connect(this.currentRoomCode);
            }, 3000);
          }
        }
      };

      this.ws.onerror = (e) => {
        console.warn('[Multiplayer] WebSocket ERROR:', e);
        this.socketStatus = 'DISCONNECTED';
        this.callbacks.onError?.('通信エラーが発生しました。');
      };

      this.ws.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data);
          this.handleServerMessage(msg);
        } catch (err) {
          console.error('[Multiplayer] Failed to parse WebSocket message:', err);
        }
      };
    } catch (err) {
      console.error('[Multiplayer] WebSocket creation error:', err);
      this.socketStatus = 'DISCONNECTED';
      this.callbacks.onError?.('WebSocket接続に失敗しました。');
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
    // Start health check and background loop once callbacks are registered
    this.checkHealth();
    this.startHealthCheckLoop();
  }

  private send(data: any) {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      this.callbacks.onError?.('サーバーに接続されていません。');
      return;
    }
    this.ws.send(JSON.stringify(data));
  }

  public async createRoom() {
    console.log('[Multiplayer] Creating room...');
    const httpBase = this.getHttpBaseUrl();
    let code = '';

    try {
      const res = await fetch(`${httpBase}/api/room/create`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      if (res.ok) {
        const data: any = await res.json().catch(() => null);
        if (data && data.code) {
          code = data.code;
        }
      }
    } catch (e) {
      console.warn('[Multiplayer] Room create helper request failed, using client generator fallback:', e);
    }

    if (!code) {
      const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
      for (let i = 0; i < 6; i++) {
        code += chars.charAt(Math.floor(Math.random() * chars.length));
      }
    }

    this.currentRoomCode = code;
    this.connect(code, () => {
      this.send({ type: 'create_room', version: '2.3' });
    });
  }

  public joinRoom(code: string) {
    const cleanCode = code.trim().toUpperCase();
    console.log('[Multiplayer] Joining room:', cleanCode);
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

