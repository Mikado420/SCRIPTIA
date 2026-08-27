import React from 'react';
import { CardData } from '../types/game';
import { X, Swords, Shield, Heart, Sparkles } from 'lucide-react';
import { FACTION_THEMES } from './CardItem';

interface CardInfoPanelProps {
  card: CardData | null;
  onClose: () => void;
}

export const CardInfoPanel: React.FC<CardInfoPanelProps> = ({ card, onClose }) => {
  if (!card) return null;

  const factionTheme = FACTION_THEMES[card.faction] || FACTION_THEMES.NEUTRAL;
  const isUnit = card.cardType === 'UNIT' || card.cardType === 'EVOLVE_UNIT';

  const getTypeText = () => {
    switch (card.cardType) {
      case 'UNIT': return 'ユニット';
      case 'EVOLVE_UNIT': return '進化ユニット';
      case 'SPELL': return 'スペル (即時)';
      case 'RUNE': return 'ルーン (迎撃・誘発)';
      case 'DOMAIN': return 'ドメイン (永続設置)';
      default: return 'カード';
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs pointer-events-auto select-none"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-[320px] sm:max-w-[360px] bg-stone-900/98 border-2 border-stone-600 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90dvh] text-stone-100 animate-fade-in"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className={`px-3 py-2 flex items-center justify-between border-b ${factionTheme.bg} border-stone-700`}>
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-full bg-stone-950/90 border border-amber-400/80 flex items-center justify-center font-black text-xs text-amber-300 font-mono">
              {card.cost}
            </div>
            <div className="flex flex-col min-w-0">
              <span className="text-xs sm:text-sm font-black text-white tracking-tight truncate max-w-[180px] sm:max-w-[220px]">
                {card.name}
              </span>
              <span className="text-[9px] text-stone-300 font-mono">
                {card.cardId} • {card.factionName}
              </span>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1 rounded-full bg-stone-800/90 hover:bg-stone-700 text-stone-300 hover:text-white border border-stone-600 transition-colors"
            title="閉じる"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-3 space-y-2 overflow-y-auto max-h-[calc(90dvh-80px)]">
          {/* Classification */}
          <div className="flex items-center justify-between bg-stone-950/80 px-2 py-1 rounded-lg border border-stone-800 text-[10px] sm:text-[11px]">
            <span className="text-stone-400 font-medium">分類: <strong className="text-stone-200">{getTypeText()}</strong></span>
            <span className="text-stone-400 font-medium">系統/種族: <strong className="text-amber-300">{card.raceName || card.classification || 'なし'}</strong></span>
          </div>

          {/* Stats for Units */}
          {isUnit && (
            <div className="grid grid-cols-3 gap-1.5 py-0.5">
              <div className="bg-gradient-to-b from-red-950/50 to-stone-950 border border-red-900/60 rounded-xl p-1.5 text-center">
                <div className="flex items-center justify-center gap-0.5 text-[9px] text-red-400 font-bold mb-0.5">
                  <Swords className="w-2.5 h-2.5" />
                  <span>ATK</span>
                </div>
                <div className="text-base font-black font-mono text-red-200">{card.atk}</div>
              </div>

              <div className="bg-gradient-to-b from-sky-950/50 to-stone-950 border border-sky-900/60 rounded-xl p-1.5 text-center">
                <div className="flex items-center justify-center gap-0.5 text-[9px] text-sky-400 font-bold mb-0.5">
                  <Shield className="w-2.5 h-2.5" />
                  <span>DEF</span>
                </div>
                <div className="text-base font-black font-mono text-sky-200">{card.def}</div>
              </div>

              <div className="bg-gradient-to-b from-amber-950/50 to-stone-950 border border-amber-900/60 rounded-xl p-1.5 text-center">
                <div className="flex items-center justify-center gap-0.5 text-[9px] text-amber-400 font-bold mb-0.5">
                  <Heart className="w-2.5 h-2.5" />
                  <span>BRK</span>
                </div>
                <div className="text-base font-black font-mono text-amber-200">{card.brk}</div>
              </div>
            </div>
          )}

          {/* Traits */}
          <div className="flex flex-wrap gap-1">
            {card.hasGuard && (
              <span className="px-1.5 py-0.5 bg-sky-900/80 border border-sky-600 rounded text-[9px] text-sky-200 font-bold">
                🛡️ ガード
              </span>
            )}
            {card.hasHaste && (
              <span className="px-1.5 py-0.5 bg-amber-900/80 border border-amber-500 rounded text-[9px] text-amber-200 font-bold">
                ⚡ 速攻
              </span>
            )}
            {card.cantAttack && (
              <span className="px-1.5 py-0.5 bg-rose-900/80 border border-rose-600 rounded text-[9px] text-rose-200 font-bold">
                🚫 攻撃不可
              </span>
            )}
          </div>

          {/* Effects */}
          {card.effectsText && (
            <div className="bg-stone-950 border border-stone-800 rounded-xl p-2.5 text-xs leading-relaxed space-y-1">
              <div className="text-[9px] font-black text-amber-400 uppercase tracking-wider flex items-center gap-1">
                <Sparkles className="w-2.5 h-2.5" />
                <span>カード効果</span>
              </div>
              <p className="text-stone-200 text-[11px] whitespace-pre-wrap leading-relaxed max-h-36 overflow-y-auto">
                {card.effectsText}
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-2 bg-stone-950/90 border-t border-stone-800 flex justify-end">
          <button
            onClick={onClose}
            className="px-3 py-1 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-200 text-xs font-bold transition-colors"
          >
            閉じる (×)
          </button>
        </div>
      </div>
    </div>
  );
};
