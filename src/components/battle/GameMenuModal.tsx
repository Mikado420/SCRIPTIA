import React from 'react';
import { Menu, X, Settings, Activity, RotateCcw, Volume2, VolumeX, Wrench, BarChart3, Bug, Bot, User, Sparkles } from 'lucide-react';
import { AppTab } from '../Navbar';
import { audioService } from '../../utils/AudioService';

interface GameMenuModalProps {
  isOpen: boolean;
  onClose: () => void;
  onResetMatch: () => void;
  onOpenLogs: () => void;
  onOpenSettings: () => void;
  onNavigateTab?: (tab: AppTab) => void;
  isMuted: boolean;
  onToggleMute: () => void;
}

export const GameMenuModal: React.FC<GameMenuModalProps> = ({
  isOpen,
  onClose,
  onResetMatch,
  onOpenLogs,
  onOpenSettings,
  onNavigateTab,
  isMuted,
  onToggleMute,
}) => {
  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-fade-in"
      onClick={onClose}
    >
      <div
        className="bg-stone-900 border border-stone-700 rounded-2xl w-full max-w-sm p-4 shadow-2xl relative text-stone-100 space-y-3.5"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-stone-800 pb-2.5">
          <div className="flex items-center gap-2">
            <Menu className="w-4 h-4 text-amber-400" />
            <h3 className="text-sm font-black text-white">対戦メニュー</h3>
          </div>
          <button onClick={onClose} className="p-1 text-stone-400 hover:text-white">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Action List */}
        <div className="space-y-2 text-xs">
          {/* Sound Toggle */}
          <button
            onClick={onToggleMute}
            className="w-full flex items-center justify-between px-3 py-2 rounded-xl bg-stone-950 hover:bg-stone-800 border border-stone-800 text-stone-200 transition-colors"
          >
            <div className="flex items-center gap-2">
              {isMuted ? <VolumeX className="w-4 h-4 text-rose-400" /> : <Volume2 className="w-4 h-4 text-emerald-400" />}
              <span>効果音 (SE)</span>
            </div>
            <span className={`text-[10px] font-bold ${isMuted ? 'text-rose-400' : 'text-emerald-400'}`}>
              {isMuted ? 'OFF (消音)' : 'ON (有効)'}
            </span>
          </button>

          {/* Logs */}
          <button
            onClick={() => {
              onClose();
              onOpenLogs();
            }}
            className="w-full flex items-center justify-between px-3 py-2 rounded-xl bg-stone-950 hover:bg-stone-800 border border-stone-800 text-stone-200 transition-colors"
          >
            <div className="flex items-center gap-2">
              <Activity className="w-4 h-4 text-sky-400" />
              <span>対戦ログ & AI思考ログ</span>
            </div>
            <span className="text-[10px] text-stone-500">閲覧</span>
          </button>

          {/* Settings */}
          <button
            onClick={() => {
              onClose();
              onOpenSettings();
            }}
            className="w-full flex items-center justify-between px-3 py-2 rounded-xl bg-stone-950 hover:bg-stone-800 border border-stone-800 text-stone-200 transition-colors"
          >
            <div className="flex items-center gap-2">
              <Settings className="w-4 h-4 text-amber-400" />
              <span>対戦設定 & デッキ変更</span>
            </div>
            <span className="text-[10px] text-stone-500">設定</span>
          </button>

          {/* Reset Match */}
          <button
            onClick={() => {
              onClose();
              onResetMatch();
            }}
            className="w-full flex items-center justify-between px-3 py-2 rounded-xl bg-stone-950 hover:bg-stone-800 border border-stone-800 text-amber-300 transition-colors"
          >
            <div className="flex items-center gap-2">
              <RotateCcw className="w-4 h-4" />
              <span>対戦をリセットして初めから</span>
            </div>
          </button>
        </div>

        {/* Tab Navigation (Exit Battle) */}
        {onNavigateTab && (
          <div className="pt-2 border-t border-stone-800">
            <div className="text-[10px] font-bold text-stone-500 mb-1.5 uppercase tracking-wider">
              他のモードへ移動:
            </div>
            <div className="grid grid-cols-3 gap-1.5">
              <button
                onClick={() => {
                  onClose();
                  onNavigateTab('DECK_BUILDER');
                }}
                className="px-2 py-1.5 rounded-lg bg-stone-950 hover:bg-stone-800 border border-stone-800 text-stone-300 text-[10px] font-bold flex items-center gap-1"
              >
                <Wrench className="w-3 h-3 text-amber-400" />
                <span>デッキ構築</span>
              </button>
              <button
                onClick={() => {
                  onClose();
                  onNavigateTab('VERIFY');
                }}
                className="px-2 py-1.5 rounded-lg bg-stone-950 hover:bg-stone-800 border border-stone-800 text-stone-300 text-[10px] font-bold flex items-center gap-1"
              >
                <Activity className="w-3 h-3 text-emerald-400" />
                <span>AI検証</span>
              </button>
              <button
                onClick={() => {
                  onClose();
                  onNavigateTab('ANALYTICS');
                }}
                className="px-2 py-1.5 rounded-lg bg-stone-950 hover:bg-stone-800 border border-stone-800 text-stone-300 text-[10px] font-bold flex items-center gap-1"
              >
                <BarChart3 className="w-3 h-3 text-sky-400" />
                <span>勝率分析</span>
              </button>
            </div>
          </div>
        )}

        <button
          onClick={onClose}
          className="w-full py-2 rounded-xl bg-stone-800 hover:bg-stone-700 text-white font-bold text-xs"
        >
          対戦に戻る
        </button>
      </div>
    </div>
  );
};
