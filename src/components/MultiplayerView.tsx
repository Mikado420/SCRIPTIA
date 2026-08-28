import React, { useState, useEffect } from 'react';
import { DEFAULT_WORKER_URL, MultiplayerClient } from '../services/multiplayerService';
import { Deck, GameState, PlayerId, Action } from '../types/game';
import { GameBoard } from './GameBoard';
import { Globe, Users, Play, AlertCircle } from 'lucide-react';
import { PRESET_DECKS } from '../data/presetDecks';
import { safeStorage } from '../utils/storage';

interface MultiplayerViewProps {
  customDecks: Deck[];
  hasApiKey: boolean;
  onNavigateTab: (tab: any) => void;
}

export const MultiplayerView: React.FC<MultiplayerViewProps> = ({ customDecks, hasApiKey, onNavigateTab }) => {
  const [client, setClient] = useState<MultiplayerClient | null>(null);
  const [roomCode, setRoomCode] = useState('');
  const [joinCode, setJoinCode] = useState('');
  const [status, setStatus] = useState<'IDLE' | 'IN_ROOM' | 'PLAYING'>('IDLE');
  const [isHost, setIsHost] = useState(false);
  const [hostReady, setHostReady] = useState(false);
  const [guestReady, setGuestReady] = useState(false);
  const [error, setError] = useState('');
  
  const allDecks = [...customDecks, ...PRESET_DECKS];
  const [selectedDeckId, setSelectedDeckId] = useState(allDecks[0]?.deckId || '');
  
  const [onlineGameState, setOnlineGameState] = useState<GameState | null>(null);
  const [myPlayerId, setMyPlayerId] = useState<PlayerId>('PLAYER_A');
  const [connectionStatus, setConnectionStatus] = useState<'CONNECTING' | 'ONLINE' | 'OFFLINE'>('CONNECTING');

  useEffect(() => {
    // Determine server URL dynamically: prefer env, default to production Cloudflare Worker
    const envUrl = import.meta.env.VITE_ONLINE_SERVER_URL;
    let serverUrl = DEFAULT_WORKER_URL;
    if (envUrl) {
      serverUrl = envUrl;
    }

    const newClient = new MultiplayerClient(serverUrl);
    setClient(newClient);

    return () => {
      newClient.disconnect();
    };
  }, []);

  useEffect(() => {
    if (!client) return;

    client.setCallbacks({
      onConnectionChange: (connStatus) => {
        setConnectionStatus(connStatus);
      },
      onRoomCreated: (code) => {
        setRoomCode(code);
        setStatus('IN_ROOM');
        setIsHost(true);
        setError('');
      },
      onRoomJoined: (code) => {
        setRoomCode(code);
        setStatus('IN_ROOM');
        setIsHost(false);
        setError('');
      },
      onPlayerReadyState: (hReady, gReady) => {
        setHostReady(hReady);
        setGuestReady(gReady);
      },
      onGameStarted: (playerId, state) => {
        setMyPlayerId(playerId);
        setOnlineGameState(state);
        setStatus('PLAYING');
      },
      onStateUpdate: (state, log) => {
        setOnlineGameState(state);
        // Note: logs could be passed to GameBoard if refactored
      },
      onError: (err) => {
        setError(err);
      },
      onOpponentDisconnected: () => {
        setError('対戦相手が切断しました。');
        setStatus('IDLE');
        setOnlineGameState(null);
      }
    });
  }, [client]);

  const handleCreateRoom = () => {
    if (connectionStatus !== 'ONLINE') {
      setError('サーバーに接続されていません。');
      return;
    }
    setError('ルーム作成中...');
    client?.createRoom();
  };

  const handleJoinRoom = () => {
    if (connectionStatus !== 'ONLINE') {
      setError('サーバーに接続されていません。');
      return;
    }
    if (joinCode.trim().length === 6) {
      setError('ルーム参加中...');
      client?.joinRoom(joinCode.trim().toUpperCase());
    } else {
      setError('6桁のルームコードを入力してください。');
    }
  };

  const handleReady = () => {
    const deck = allDecks.find(d => d.deckId === selectedDeckId);
    if (deck) {
      client?.setReady(roomCode, deck.cards);
    }
  };

  if (status === 'PLAYING' && onlineGameState) {
    // Render GameBoard in a wrapper to intercept actions
    // For MVP, if we don't refactor GameBoard, we can create a minimalist OnlineGameBoard
    // but ideally we refactor GameBoard to take `externalState` and `onExternalAction`.
    return (
      <GameBoard
        onInspectCard={() => {}}
        customDecks={customDecks}
        hasApiKey={hasApiKey}
        externalState={onlineGameState}
        myPlayerId={myPlayerId}
        onExternalAction={(action) => client?.sendAction(roomCode, action)}
        onNavigateTab={onNavigateTab}
      />
    );
  }

  return (
    <div className="w-full h-full p-4 overflow-y-auto flex flex-col items-center justify-center bg-stone-950 text-stone-200">
      <div className="w-full max-w-md bg-stone-900 border border-stone-800 rounded-xl p-6 shadow-2xl">
        <h2 className="text-xl font-black mb-6 flex items-center justify-center gap-2 text-amber-400">
          <Globe className="w-6 h-6" />
          オンライン対戦 (MVP)
        </h2>

        <div className="flex justify-center mb-6">
          <div className={`px-3 py-1 rounded-full text-xs font-bold flex items-center gap-2 ${
            connectionStatus === 'ONLINE' ? 'bg-emerald-950 text-emerald-400 border border-emerald-800' :
            connectionStatus === 'CONNECTING' ? 'bg-amber-950 text-amber-400 border border-amber-800' :
            'bg-rose-950 text-rose-400 border border-rose-800'
          }`}>
            <div className={`w-2 h-2 rounded-full ${
              connectionStatus === 'ONLINE' ? 'bg-emerald-400' :
              connectionStatus === 'CONNECTING' ? 'bg-amber-400 animate-pulse' :
              'bg-rose-400'
            }`}></div>
            {connectionStatus === 'ONLINE' ? 'ONLINE' :
             connectionStatus === 'CONNECTING' ? 'CONNECTING...' :
             'OFFLINE'}
          </div>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-950/50 border border-red-500 rounded text-red-200 text-sm flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {status === 'IDLE' && (
          <div className="space-y-6">
            <div>
              <h3 className="text-sm font-bold text-stone-400 mb-2">新しくルームを作る</h3>
              <button
                onClick={handleCreateRoom}
                className="w-full py-3 bg-amber-600 hover:bg-amber-500 text-stone-950 font-black rounded-lg shadow-md transition-colors"
              >
                ルームを作成
              </button>
            </div>

            <div className="relative flex items-center py-2">
              <div className="flex-grow border-t border-stone-800"></div>
              <span className="flex-shrink-0 mx-4 text-stone-500 text-xs">または</span>
              <div className="flex-grow border-t border-stone-800"></div>
            </div>

            <div>
              <h3 className="text-sm font-bold text-stone-400 mb-2">既存のルームに参加する</h3>
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="6桁のコード"
                  value={joinCode}
                  onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                  maxLength={6}
                  className="flex-1 bg-stone-950 border border-stone-700 rounded px-3 py-2 font-mono uppercase text-center focus:outline-none focus:border-amber-500"
                />
                <button
                  onClick={handleJoinRoom}
                  className="px-4 bg-stone-700 hover:bg-stone-600 text-white font-bold rounded-lg transition-colors"
                >
                  参加
                </button>
              </div>
            </div>
          </div>
        )}

        {status === 'IN_ROOM' && (
          <div className="space-y-6">
            <div className="text-center p-4 bg-stone-950 border border-stone-800 rounded-lg">
              <p className="text-sm text-stone-400 mb-1">ルームコード</p>
              <p className="text-3xl font-black font-mono tracking-widest text-amber-400">{roomCode}</p>
            </div>

            <div>
              <h3 className="text-sm font-bold text-stone-400 mb-2">使用デッキを選択</h3>
              <select
                value={selectedDeckId}
                onChange={(e) => setSelectedDeckId(e.target.value)}
                className="w-full bg-stone-950 border border-stone-700 rounded px-3 py-2 focus:outline-none focus:border-amber-500"
              >
                {allDecks.map(d => (
                  <option key={d.deckId} value={d.deckId}>{d.deckName}</option>
                ))}
              </select>
            </div>

            <div className="flex flex-col gap-3 pt-4 border-t border-stone-800">
              <div className="flex items-center justify-between px-2">
                <span className="text-sm">{isHost ? '自分 (Host)' : '自分 (Guest)'}</span>
                <span className={`text-xs font-bold px-2 py-1 rounded ${isHost ? (hostReady ? 'bg-emerald-900 text-emerald-300' : 'bg-stone-800 text-stone-400') : (guestReady ? 'bg-emerald-900 text-emerald-300' : 'bg-stone-800 text-stone-400')}`}>
                  {isHost ? (hostReady ? '準備完了' : '準備中') : (guestReady ? '準備完了' : '準備中')}
                </span>
              </div>
              <div className="flex items-center justify-between px-2">
                <span className="text-sm">{isHost ? '相手 (Guest)' : '相手 (Host)'}</span>
                <span className={`text-xs font-bold px-2 py-1 rounded ${isHost ? (guestReady ? 'bg-emerald-900 text-emerald-300' : 'bg-stone-800 text-stone-400') : (hostReady ? 'bg-emerald-900 text-emerald-300' : 'bg-stone-800 text-stone-400')}`}>
                  {isHost ? (guestReady ? '準備完了' : '待機中') : (hostReady ? '準備完了' : '待機中')}
                </span>
              </div>
            </div>

            <button
              onClick={handleReady}
              disabled={(isHost && hostReady) || (!isHost && guestReady)}
              className="w-full py-3 bg-amber-600 hover:bg-amber-500 disabled:bg-stone-700 disabled:text-stone-500 text-stone-950 font-black rounded-lg shadow-md transition-colors flex items-center justify-center gap-2"
            >
              <Play className="w-4 h-4" />
              準備完了
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
