import React from 'react';
import { CardData } from '../types/game';

import { X } from 'lucide-react';

interface CardInfoPanelProps {
  card: CardData | null;
  onClose: () => void;
}

export const CardInfoPanel: React.FC<CardInfoPanelProps> = ({ card, onClose }) => {
  if (!card) return null;

  return (
    <div className="absolute top-4 left-4 w-64 bg-stone-900/95 border border-stone-600 rounded-lg shadow-xl text-stone-200 z-50 overflow-hidden text-sm flex flex-col pointer-events-auto">
      {/* Header */}
      <div className="px-3 py-2 bg-stone-800 border-b border-stone-700 font-bold flex justify-between items-center text-sm">
        <span className="truncate">{card.name}</span>
        <span className="text-amber-400 shrink-0 ml-2">COST {card.cost}</span>
        <button onClick={onClose} className="ml-2 text-stone-400 hover:text-stone-200"><X className="w-4 h-4" /></button>
      </div>
      
      {/* Type & Faction */}
      <div className="px-3 py-1.5 flex justify-between text-xs text-stone-400 border-b border-stone-800">
        <span>{card.cardType === 'UNIT' ? 'ユニット' : card.cardType === 'SPELL' ? 'スペル' : card.cardType === 'RUNE' ? 'ルーン' : card.cardType === 'DOMAIN' ? 'ドメイン' : card.cardType === 'EVOLVE_UNIT' ? '進化ユニット' : 'その他'}</span>
        <span>{card.faction === 'RED' ? '朱' : card.faction === 'BLUE' ? '蒼' : card.faction === 'GREEN' ? '翠' : card.faction === 'HOLY' ? '聖' : card.faction === 'DARK' ? '冥' : '無'} / {card.raceName || card.classification || 'なし'}</span>
      </div>

      {/* Stats (Units only) */}
      {(card.cardType === 'UNIT' || card.cardType === 'EVOLVE_UNIT') && (
        <div className="px-3 py-2 grid grid-cols-3 gap-1 border-b border-stone-800 text-center font-bold">
          <div className="flex flex-col"><span className="text-[10px] text-stone-500 font-normal">ATK</span><span className="text-red-400">{card.atk}</span></div>
          <div className="flex flex-col"><span className="text-[10px] text-stone-500 font-normal">DEF</span><span className="text-blue-400">{card.def}</span></div>
          <div className="flex flex-col"><span className="text-[10px] text-stone-500 font-normal">BRK</span><span className="text-emerald-400">{card.brk}</span></div>
        </div>
      )}

      {/* Effects */}
      {card.effectsText && (
        <div className="px-3 py-2 text-xs text-stone-300 leading-relaxed whitespace-pre-wrap max-h-48 overflow-y-auto">
          {card.effectsText}
        </div>
      )}
    </div>
  );
};
