import React from 'react';
import { CardData, CardInstance, FactionCode } from '../../types/game';
import { FACTION_THEMES } from '../CardItem';
import { X, Swords, Shield, Heart, Sparkles, BookOpen, Layers, Flame, Zap } from 'lucide-react';

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
      className="fixed inset-0 z-50 flex items-center justify-start p-3 sm:p-6 bg-black/60 backdrop-blur-xs pointer-events-auto"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-[340px] sm:max-w-[380px] bg-stone-900/98 border-2 border-stone-600 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90dvh] text-stone-100 animate-fade-in"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header Ribbon */}
        <div className={`px-3 py-2 flex items-center justify-between border-b ${factionTheme.bg} border-stone-700`}>
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-full bg-stone-950/80 border border-amber-400/80 flex items-center justify-center font-black text-xs text-amber-300 font-mono">
              {baseCard.cost}
            </div>
            <div className="flex flex-col">
              <span className="text-xs font-black text-white tracking-tight truncate max-w-[200px]">
                {baseCard.name}
              </span>
              <span className="text-[10px] text-stone-300 font-mono">
                {baseCard.cardId} • {baseCard.factionName}
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

        {/* Content Body */}
        <div className="p-3.5 space-y-3 overflow-y-auto">
          {/* Card Sub-header info */}
          <div className="flex items-center justify-between bg-stone-950/80 px-2.5 py-1.5 rounded-lg border border-stone-800 text-[11px]">
            <span className="text-stone-400 font-medium">分類: <strong className="text-stone-200">{getTypeText()}</strong></span>
            <span className="text-stone-400 font-medium">種族/系統: <strong className="text-amber-300">{baseCard.raceName || baseCard.classification || 'なし'}</strong></span>
          </div>

          {/* Unit Combat Stats */}
          {isUnit && (
            <div className="grid grid-cols-3 gap-2 py-1">
              <div className="bg-gradient-to-b from-red-950/50 to-stone-950 border border-red-900/60 rounded-xl p-2 text-center">
                <div className="flex items-center justify-center gap-1 text-[10px] text-red-400 font-bold mb-0.5">
                  <Swords className="w-3 h-3" />
                  <span>ATK (攻撃力)</span>
                </div>
                <div className="text-lg font-black font-mono text-red-200">{atk}</div>
              </div>

              <div className="bg-gradient-to-b from-sky-950/50 to-stone-950 border border-sky-900/60 rounded-xl p-2 text-center">
                <div className="flex items-center justify-center gap-1 text-[10px] text-sky-400 font-bold mb-0.5">
                  <Shield className="w-3 h-3" />
                  <span>DEF (防御力)</span>
                </div>
                <div className="text-lg font-black font-mono text-sky-200">{def}</div>
              </div>

              <div className="bg-gradient-to-b from-amber-950/50 to-stone-950 border border-amber-900/60 rounded-xl p-2 text-center">
                <div className="flex items-center justify-center gap-1 text-[10px] text-amber-400 font-bold mb-0.5">
                  <Heart className="w-3 h-3" />
                  <span>BRK (結界破壊)</span>
                </div>
                <div className="text-lg font-black font-mono text-amber-200">{brk}</div>
              </div>
            </div>
          )}

          {/* Status Traits */}
          <div className="flex flex-wrap gap-1.5">
            {baseCard.hasGuard && (
              <span className="px-2 py-0.5 bg-sky-900/80 border border-sky-600 rounded text-[10px] text-sky-200 font-bold">
                🛡️ ガード (迎撃可能)
              </span>
            )}
            {baseCard.hasHaste && (
              <span className="px-2 py-0.5 bg-amber-900/80 border border-amber-500 rounded text-[10px] text-amber-200 font-bold">
                ⚡ 速攻 (召喚時即攻撃可能)
              </span>
            )}
            {baseCard.cantAttack && (
              <span className="px-2 py-0.5 bg-rose-900/80 border border-rose-600 rounded text-[10px] text-rose-200 font-bold">
                🚫 攻撃不可
              </span>
            )}
            {cardInst?.isRested && (
              <span className="px-2 py-0.5 bg-stone-800 border border-stone-600 rounded text-[10px] text-stone-400 font-mono">
                💤 レスト状態
              </span>
            )}
            {cardInst && cardInst.hasSummoningSickness && !baseCard.hasHaste && (
              <span className="px-2 py-0.5 bg-stone-800 border border-stone-600 rounded text-[10px] text-stone-400 font-mono">
                ⏳ 召喚酔い
              </span>
            )}
          </div>

          {/* Effects Text Box */}
          <div className="bg-stone-950 border border-stone-800 rounded-xl p-3 text-xs leading-relaxed space-y-1">
            <div className="text-[10px] font-black text-amber-400 uppercase tracking-wider flex items-center gap-1">
              <Sparkles className="w-3 h-3" />
              <span>カード効果・テキスト</span>
            </div>
            <p className="text-stone-200 whitespace-pre-wrap">
              {baseCard.effectsText || '通常効果なし'}
            </p>
          </div>
        </div>

        {/* Footer Close Button */}
        <div className="p-2.5 bg-stone-950/90 border-t border-stone-800 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-200 text-xs font-bold transition-colors"
          >
            閉じる
          </button>
        </div>
      </div>
    </div>
  );
};
