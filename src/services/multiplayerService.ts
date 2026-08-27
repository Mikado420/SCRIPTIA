import { io, Socket } from 'socket.io-client';
import { GameState, Action, PlayerId } from '../types/game';

export class MultiplayerClient {
  private socket: Socket;
  private onStateUpdate?: (state: GameState, log?: any) => void;
  private onGameStarted?: (playerId: PlayerId, state: GameState) => void;
  private onError?: (err: string) => void;
  private onRoomCreated?: (code: string) => void;
  private onRoomJoined?: (code: string) => void;
  private onPlayerReadyState?: (hostReady: boolean, guestReady: boolean) => void;
  private onOpponentDisconnected?: () => void;

  constructor(serverUrl: string) {
    this.socket = io(serverUrl);

    this.socket.on('room_created', (data) => {
      this.onRoomCreated?.(data.code);
    });

    this.socket.on('room_joined', (data) => {
      this.onRoomJoined?.(data.code);
    });

    this.socket.on('player_ready_state', (data) => {
      this.onPlayerReadyState?.(data.hostReady, data.guestReady);
    });

    this.socket.on('game_started', (data) => {
      this.onGameStarted?.(data.playerId, data.state);
    });

    this.socket.on('state_update', (data) => {
      this.onStateUpdate?.(data.state, data.log);
    });

    this.socket.on('error', (err) => {
      this.onError?.(err);
    });

    this.socket.on('opponent_disconnected', () => {
      this.onOpponentDisconnected?.();
    });
  }

  public setCallbacks(callbacks: {
    onStateUpdate?: (state: GameState, log?: any) => void;
    onGameStarted?: (playerId: PlayerId, state: GameState) => void;
    onError?: (err: string) => void;
    onRoomCreated?: (code: string) => void;
    onRoomJoined?: (code: string) => void;
    onPlayerReadyState?: (hostReady: boolean, guestReady: boolean) => void;
    onOpponentDisconnected?: () => void;
  }) {
    this.onStateUpdate = callbacks.onStateUpdate;
    this.onGameStarted = callbacks.onGameStarted;
    this.onError = callbacks.onError;
    this.onRoomCreated = callbacks.onRoomCreated;
    this.onRoomJoined = callbacks.onRoomJoined;
    this.onPlayerReadyState = callbacks.onPlayerReadyState;
    this.onOpponentDisconnected = callbacks.onOpponentDisconnected;
  }

  public createRoom() {
    this.socket.emit('create_room', { version: '2.3' });
  }

  public joinRoom(code: string) {
    this.socket.emit('join_room', { code, version: '2.3' });
  }

  public setReady(code: string, deckCards: any[]) {
    this.socket.emit('player_ready', { code, deckCards });
  }

  public sendAction(code: string, action: Action) {
    this.socket.emit('action', { code, action });
  }

  public disconnect() {
    this.socket.disconnect();
  }
}
