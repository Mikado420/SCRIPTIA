import React from 'react';
import { CardData, CardInstance } from '../../types/game';
import { FACTION_THEMES } from '../CardItem';
import { X, Swords, Shield, Heart, Sparkles, GitMerge } from 'lucide-react';

interface CardDetailPanelProps {
  card: CardData | CardInstance | null;
  onClose: () => void;
}

export const CardDetailPanel: React.FC<CardDetailPanelProps> = ({ card, onClose }) => {
  if (!card) return null;

  const baseCard: CardData = 'baseCard' in card ? card.baseCard : card;
  const cardInst = 'instanceId' in card ? (card as CardInstance) : null;
  const factionTheme = FACTION_THEMES[baseCard.faction] || FACTION_THEMES.NEUTRAL;
  const isUnit = baseCard.cardType === 'UNIT' || baseCard.cardType === 'EVOLVE_UNIT';

  const atk = cardInst ? cardInst.currentAtk : baseCard.atk;
  const def = cardInst ? cardInst.currentDef : baseCard.def;
  const brk = cardInst ? (cardInst.currentBrk ?? baseCard.brk) : baseCard.brk;

  const getTypeText = () => {
    switch (baseCard.cardType) {
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
      id="card-detail-overlay"
      className="fixed inset-0 z-[70] flex items-center justify-center sm:justify-start p-2 sm:p-4 bg-black/60 backdrop-blur-xs pointer-events-auto select-none"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-[320px] sm:max-w-[360px] bg-stone-900/98 border-2 border-stone-600 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[92dvh] text-stone-100 animate-fade-in"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header Ribbon */}
        <div className={`px-3 py-1.5 sm:py-2 flex items-center justify-between border-b ${factionTheme.bg} border-stone-700`}>
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 sm:w-6 sm:h-6 rounded-full bg-stone-950/90 border border-amber-400/80 flex items-center justify-center font-black text-xs text-amber-300 font-mono">
              {baseCard.cost}
            </div>
            <div className="flex flex-col min-w-0">
              <span className="text-xs sm:text-sm font-black text-white tracking-tight truncate max-w-[180px] sm:max-w-[220px]">
                {baseCard.name}
              </span>
              <span className="text-[9px] text-stone-300 font-mono">
                {baseCard.cardId} • {baseCard.factionName}
              </span>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1 rounded-full bg-stone-800/90 hover:bg-stone-700 text-stone-300 hover:text-white border border-stone-600 transition-colors"
            title="閉じる"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-2.5 sm:p-3 space-y-2 overflow-y-auto max-h-[calc(92dvh-80px)]">
          {/* Card Sub-header info */}
          <div className="flex items-center justify-between bg-stone-950/80 px-2 py-1 rounded-lg border border-stone-800 text-[10px] sm:text-[11px]">
            <span className="text-stone-400 font-medium">分類: <strong className="text-stone-200">{getTypeText()}</strong></span>
            <span className="text-stone-400 font-medium">種族/系統: <strong className="text-amber-300">{baseCard.raceName || baseCard.classification || 'なし'}</strong></span>
          </div>

          {/* Unit Combat Stats */}
          {isUnit && (
            <div className="grid grid-cols-3 gap-1.5 py-0.5">
              <div className="bg-gradient-to-b from-red-950/50 to-stone-950 border border-red-900/60 rounded-xl p-1.5 text-center">
                <div className="flex items-center justify-center gap-0.5 text-[9px] text-red-400 font-bold mb-0.5">
                  <Swords className="w-2.5 h-2.5" />
                  <span>ATK</span>
                </div>
                <div className="text-base sm:text-lg font-black font-mono text-red-200">{atk}</div>
              </div>

              <div className="bg-gradient-to-b from-sky-950/50 to-stone-950 border border-sky-900/60 rounded-xl p-1.5 text-center">
                <div className="flex items-center justify-center gap-0.5 text-[9px] text-sky-400 font-bold mb-0.5">
                  <Shield className="w-2.5 h-2.5" />
                  <span>DEF</span>
                </div>
                <div className="text-base sm:text-lg font-black font-mono text-sky-200">{def}</div>
              </div>

              <div className="bg-gradient-to-b from-amber-950/50 to-stone-950 border border-amber-900/60 rounded-xl p-1.5 text-center">
                <div className="flex items-center justify-center gap-0.5 text-[9px] text-amber-400 font-bold mb-0.5">
                  <Heart className="w-2.5 h-2.5" />
                  <span>BRK</span>
                </div>
                <div className="text-base sm:text-lg font-black font-mono text-amber-200">{brk}</div>
              </div>
            </div>
          )}

          {/* Evolution Requirement if applicable */}
          {baseCard.evolutionRequirement && (
            <div className="bg-amber-950/40 border border-amber-800/80 rounded-lg p-1.5 text-[10px] text-amber-200 flex items-center gap-1.5">
              <GitMerge className="w-3 h-3 text-amber-400 shrink-0" />
              <span>進化条件: {baseCard.evolutionRequirement.description}</span>
            </div>
          )}

          {/* Status Traits */}
          <div className="flex flex-wrap gap-1">
            {baseCard.hasGuard && (
              <span className="px-1.5 py-0.5 bg-sky-900/80 border border-sky-600 rounded text-[9px] text-sky-200 font-bold">
                🛡️ ガード
              </span>
            )}
            {baseCard.hasHaste && (
              <span className="px-1.5 py-0.5 bg-amber-900/80 border border-amber-500 rounded text-[9px] text-amber-200 font-bold">
                ⚡ 速攻
              </span>
            )}
            {baseCard.cantAttack && (
              <span className="px-1.5 py-0.5 bg-rose-900/80 border border-rose-600 rounded text-[9px] text-rose-200 font-bold">
                🚫 攻撃不可
              </span>
            )}
            {cardInst?.isRested && (
              <span className="px-1.5 py-0.5 bg-stone-800 border border-stone-600 rounded text-[9px] text-stone-400 font-mono">
                💤 レスト中
              </span>
            )}
            {cardInst && cardInst.hasSummoningSickness && !baseCard.hasHaste && (
              <span className="px-1.5 py-0.5 bg-stone-800 border border-stone-600 rounded text-[9px] text-stone-400 font-mono">
                ⏳ 召喚酔い
              </span>
            )}
          </div>

          {/* Effects Text Box */}
          <div className="bg-stone-950 border border-stone-800 rounded-xl p-2 sm:p-2.5 text-xs leading-relaxed space-y-0.5">
            <div className="text-[9px] font-black text-amber-400 uppercase tracking-wider flex items-center gap-1">
              <Sparkles className="w-2.5 h-2.5" />
              <span>カード効果・テキスト</span>
            </div>
            <p className="text-stone-200 text-[11px] whitespace-pre-wrap leading-relaxed max-h-32 overflow-y-auto">
              {baseCard.effectsText || '通常効果なし'}
            </p>
          </div>
        </div>

        {/* Footer Close Button */}
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
