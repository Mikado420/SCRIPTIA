import { GameState, Action, PlayerId, CardData } from '../types/game';

export interface Env {
  GAME_ROOM: DurableObjectNamespace;
  GEMINI_API_KEY?: string;
  ENVIRONMENT?: string;
}

export type ClientMessage =
  | { type: 'create_room'; version: string }
  | { type: 'join_room'; code: string; version: string }
  | { type: 'player_ready'; code: string; deckCards: string[] }
  | { type: 'player_unready'; code: string }
  | { type: 'action'; code: string; action: Action }
  | { type: 'ping' };

export type ServerMessage =
  | { type: 'room_created'; code: string; playerId: PlayerId }
  | { type: 'room_joined'; code: string; playerId: PlayerId }
  | { type: 'player_ready_state'; hostReady: boolean; guestReady: boolean }
  | { type: 'game_started'; playerId: PlayerId; state: GameState }
  | { type: 'state_update'; state: GameState; log?: any }
  | { type: 'error'; message: string }
  | { type: 'opponent_disconnected' }
  | { type: 'pong' };
