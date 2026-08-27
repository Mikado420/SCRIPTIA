import React from 'react';
import { CardData, CardInstance, FactionCode } from '../types/game';
import { Shield, Zap, Sparkles, Swords, Heart, BookOpen, Layers, Flame, Info } from 'lucide-react';

interface CardItemProps {
  card: CardData | CardInstance;
  isInteractive?: boolean;
  isSelected?: boolean;
  isPlayable?: boolean;
  isTargetable?: boolean;
  isGuardable?: boolean;
  size?: 'xs' | 'sm' | 'md' | 'lg';
  onClick?: () => void;
  onInspect?: (card: CardData) => void;
  onPointerDown?: (e: React.PointerEvent) => void;
  showRested?: boolean;
  compactEffect?: boolean;
}

export const FACTION_THEMES: Record<
  FactionCode,
  {
    bg: string;
    border: string;
    text: string;
    badge: string;
    glow: string;
    name: string;
    accent: string;
    icon: any;
  }
> = {
  RED: {
    bg: 'bg-gradient-to-b from-red-950 via-stone-900 to-stone-950',
    border: 'border-red-600/90',
    text: 'text-red-300',
    badge: 'bg-red-900/90 text-red-100 border-red-500',
    glow: 'shadow-red-600/40',
    name: '朱',
    accent: '#ef4444',
    icon: Flame,
  },
  BLUE: {
    bg: 'bg-gradient-to-b from-blue-950 via-stone-900 to-stone-950',
    border: 'border-blue-500/90',
    text: 'text-blue-300',
    badge: 'bg-blue-900/90 text-blue-100 border-blue-400',
    glow: 'shadow-blue-500/40',
    name: '蒼',
    accent: '#3b82f6',
    icon: Sparkles,
  },
  GREEN: {
    bg: 'bg-gradient-to-b from-emerald-950 via-stone-900 to-stone-950',
    border: 'border-emerald-500/90',
    text: 'text-emerald-300',
    badge: 'bg-emerald-900/90 text-emerald-100 border-emerald-400',
    glow: 'shadow-emerald-500/40',
    name: '翠',
    accent: '#10b981',
    icon: Zap,
  },
  HOLY: {
    bg: 'bg-gradient-to-b from-amber-950 via-stone-900 to-stone-950',
    border: 'border-amber-400/95',
    text: 'text-amber-200',
    badge: 'bg-amber-800/90 text-amber-100 border-amber-300',
    glow: 'shadow-amber-400/40',
    name: '聖',
    accent: '#f59e0b',
    icon: Shield,
  },
  DARK: {
    bg: 'bg-gradient-to-b from-purple-950 via-stone-900 to-stone-950',
    border: 'border-purple-600/90',
    text: 'text-purple-300',
    badge: 'bg-purple-950 text-purple-200 border-purple-500',
    glow: 'shadow-purple-600/40',
    name: '冥',
    accent: '#a855f7',
    icon: Layers,
  },
  NEUTRAL: {
    bg: 'bg-gradient-to-b from-stone-850 via-stone-900 to-stone-950',
    border: 'border-stone-500/90',
    text: 'text-stone-300',
    badge: 'bg-stone-700 text-stone-100 border-stone-400',
    glow: 'shadow-stone-500/30',
    name: '無',
    accent: '#78716c',
    icon: BookOpen,
  },
};

export const CardItem: React.FC<CardItemProps> = ({
  card,
  isInteractive = false,
  isSelected = false,
  isPlayable = false,
  isTargetable = false,
  isGuardable = false,
  size = 'md',
  onClick,
  onInspect,
  onPointerDown,
  showRested = true,
  compactEffect = false,
}) => {
  const baseCard: CardData = 'baseCard' in card ? card.baseCard : card;
  const isInstance = 'instanceId' in card;
  const cardInst = isInstance ? (card as CardInstance) : null;
  const isRested = showRested && cardInst?.isRested;
  const factionTheme = FACTION_THEMES[baseCard.faction] || FACTION_THEMES.NEUTRAL;

  const currentAtk = cardInst ? cardInst.currentAtk : baseCard.atk;
  const currentDef = cardInst ? cardInst.currentDef : baseCard.def;
  const currentBrk = cardInst ? (cardInst.currentBrk ?? baseCard.brk) : baseCard.brk;

  const isUnit = baseCard.cardType === 'UNIT' || baseCard.cardType === 'EVOLVE_UNIT';

  // Responsive card dimensions with guaranteed 5:7 TCG aspect ratio
  const sizeConfig = {
    xs: {
      container: 'w-[48px] xs:w-[54px] sm:w-[60px] md:w-[68px] aspect-[5/7] p-0.5 sm:p-1 text-[8px] rounded-md sm:rounded-lg',
      cost: 'w-3 h-3 xs:w-3.5 xs:h-3.5 sm:w-4 sm:h-4 text-[7px] xs:text-[8px] sm:text-[9px] font-black',
      name: 'text-[7px] xs:text-[8px] sm:text-[9px] leading-tight font-black',
      stats: 'text-[7px] xs:text-[8px] sm:text-[9px] md:text-[10px] font-black',
      statsIcon: 'w-2 h-2 sm:w-2.5 sm:h-2.5',
      badge: 'text-[5px] xs:text-[6px] sm:text-[7px] px-0.5 py-0',
    },
    sm: {
      container: 'w-[52px] xs:w-[60px] sm:w-[68px] md:w-[76px] lg:w-[84px] aspect-[5/7] p-0.5 xs:p-1 text-[8px] sm:text-[9px] rounded-md sm:rounded-lg',
      cost: 'w-3.5 h-3.5 sm:w-4 sm:h-4 text-[8px] sm:text-[9px] font-black',
      name: 'text-[7px] xs:text-[8px] sm:text-[9px] leading-tight font-black',
      stats: 'text-[8px] xs:text-[9px] sm:text-[10px] md:text-[11px] font-black',
      statsIcon: 'w-2 h-2 sm:w-2.5 sm:h-2.5',
      badge: 'text-[5px] xs:text-[6px] sm:text-[7px] px-0.5 py-0',
    },
    md: {
      container: 'w-[84px] sm:w-[94px] lg:w-[104px] aspect-[5/7] p-1.5 text-[10px] rounded-xl',
      cost: 'w-5 h-5 text-xs font-black',
      name: 'text-[10px] sm:text-xs leading-tight font-black',
      stats: 'text-xs font-black',
      statsIcon: 'w-3 h-3',
      badge: 'text-[8px] px-1 py-0.5',
    },
    lg: {
      container: 'w-[120px] sm:w-[130px] lg:w-[144px] aspect-[5/7] p-2 text-xs rounded-2xl',
      cost: 'w-6 h-6 text-sm font-black',
      name: 'text-xs sm:text-sm leading-snug font-black',
      stats: 'text-sm font-black',
      statsIcon: 'w-3.5 h-3.5',
      badge: 'text-[9px] px-1.5 py-0.5',
    },
  }[size];

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isInteractive && onClick) {
      onClick();
    }
  };

  const handleInspectClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onInspect) {
      onInspect(baseCard);
    }
  };

  return (
    <div
      id={`card-${baseCard.cardId}-${cardInst?.instanceId || 'base'}`}
      onClick={handleClick}
      onPointerDown={onPointerDown}
      style={{ touchAction: isInteractive ? 'none' : 'auto' }}
      className={`relative select-none border-2 flex flex-col justify-between transition-all duration-150 cursor-pointer shadow-md shrink-0 ${
        sizeConfig.container
      } ${factionTheme.bg} ${factionTheme.border} ${
        isRested
          ? 'rotate-[-12deg] opacity-75 grayscale-[25%] shadow-inner origin-center scale-95'
          : ''
      } ${
        isSelected
          ? 'ring-2 ring-amber-400 scale-105 -translate-y-2 z-20 shadow-2xl shadow-amber-500/50 animate-card-glow border-amber-300'
          : ''
      } ${
        isPlayable
          ? 'ring-2 ring-emerald-400 shadow-lg shadow-emerald-500/40 hover:scale-105 z-10 border-emerald-400'
          : ''
      } ${
        isTargetable
          ? 'ring-2 ring-red-500 shadow-lg shadow-red-500/50 hover:scale-105 z-10 animate-target-glow border-red-500'
          : ''
      } ${
        isGuardable
          ? 'ring-2 ring-sky-400 shadow-lg shadow-sky-500/40 hover:scale-105 z-10 border-sky-400 animate-pulse'
          : ''
      } hover:border-white/80 active:scale-95`}
    >
      {/* Top Header: Cost + Faction + Type */}
      <div>
        <div className="flex items-center justify-between gap-1 mb-0.5">
          {/* Cost Badge */}
          <div
            className={`flex items-center justify-center font-black rounded-full border shadow-inner font-mono ${sizeConfig.cost} ${factionTheme.badge}`}
          >
            {baseCard.cost}
          </div>

          {/* Faction & Type Badges */}
          <div className="flex items-center gap-0.5">
            <span
              className={`font-black rounded ${sizeConfig.badge} ${factionTheme.badge}`}
            >
              {baseCard.factionName}
            </span>
            <span className={`bg-stone-800/90 text-stone-300 font-bold rounded border border-stone-600 ${sizeConfig.badge}`}>
              {baseCard.cardType === 'UNIT'
                ? 'ユニット'
                : baseCard.cardType === 'EVOLVE_UNIT'
                ? '進化'
                : baseCard.cardType === 'SPELL'
                ? 'スペル'
                : baseCard.cardType === 'RUNE'
                ? 'ルーン'
                : 'ドメイン'}
            </span>
          </div>
        </div>

        {/* Card Name */}
        <div
          className={`font-black text-stone-100 truncate tracking-tight ${sizeConfig.name}`}
          title={baseCard.name}
        >
          {baseCard.name}
        </div>
      </div>

      {/* Middle: Effect Summary Box */}
      <div className="my-0.5 bg-stone-950/85 rounded p-1 border border-stone-800 flex-1 flex flex-col justify-center overflow-hidden">
        <p
          className={`text-stone-300 leading-tight ${
            size === 'xs'
              ? 'text-[8px] line-clamp-2'
              : size === 'sm'
              ? 'text-[9px] line-clamp-3'
              : size === 'md'
              ? 'text-[10px] line-clamp-3'
              : 'text-xs line-clamp-4'
          }`}
        >
          {baseCard.effectsText || '効果なし'}
        </p>
      </div>

      {/* Bottom Footer: Stats (ATK / DEF / BRK) for Units */}
      {isUnit ? (
        <div
          className={`flex items-center justify-between font-mono font-black pt-0.5 border-t border-stone-800/90 ${sizeConfig.stats}`}
        >
          <div className="flex items-center gap-0.5 text-red-400" title="攻撃力 (ATK)">
            <Swords className={sizeConfig.statsIcon} />
            <span>{currentAtk}</span>
          </div>

          <div className="flex items-center gap-0.5 text-sky-400" title="防御力 (DEF)">
            <Shield className={sizeConfig.statsIcon} />
            <span>{currentDef}</span>
          </div>

          <div className="flex items-center gap-0.5 text-amber-400" title="結界ブレイク力 (BRK)">
            <Heart className={sizeConfig.statsIcon} />
            <span>{currentBrk}</span>
          </div>
        </div>
      ) : (
        <div className="text-[8px] text-stone-400 text-center font-mono truncate pt-0.5 border-t border-stone-800">
          {baseCard.cardType === 'SPELL' ? '即時発動' : baseCard.cardType === 'RUNE' ? '誘発ルーン' : 'ドメイン'}
        </div>
      )}

      {/* Rest Overlay Stamp */}
      {isRested && (
        <div className="absolute inset-0 bg-stone-950/60 rounded-lg flex items-center justify-center pointer-events-none">
          <span className="px-1.5 py-0.5 bg-stone-900/90 border border-stone-600 rounded text-[9px] font-black text-stone-400 tracking-wider">
            REST
          </span>
        </div>
      )}

      {/* Trait Badges */}
      {baseCard.cantAttack && (
        <div className="absolute top-4.5 right-0.5 bg-rose-700/90 text-rose-100 text-[8px] font-black px-1 rounded shadow">
          攻禁
        </div>
      )}
      {baseCard.hasGuard && (
        <div className="absolute bottom-4.5 right-0.5 bg-sky-600 text-sky-100 text-[8px] font-black px-1 rounded shadow">
          防
        </div>
      )}
      {cardInst && cardInst.hasSummoningSickness && !baseCard.hasHaste && (
        <div className="absolute top-4.5 left-0.5 bg-stone-800/90 text-stone-300 text-[8px] font-black px-1 rounded border border-stone-600 shadow">
          ⏳
        </div>
      )}
    </div>
  );
};
