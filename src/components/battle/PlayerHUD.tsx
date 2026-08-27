import React from 'react';
import { PlayerState, PlayerId } from '../../types/game';
import { Shield, BookOpen, Flame, Bot, User, Sparkles, Layers, Eye, Zap } from 'lucide-react';

interface PlayerHUDProps {
  player: PlayerState;
  isOpponent: boolean;
  isAI: boolean;
  activeArcanaCount: number;
  isTargetableForAttack?: boolean;
  isHoveredDropZone?: boolean;
  canPlaceArcana?: boolean;
  onOpenArchive: () => void;
  onOpenArcana: () => void;
  onSelectLeaderAttack?: () => void;
  onInspectCard?: (card: any) => void;
}

export const PlayerHUD: React.FC<PlayerHUDProps> = ({
  player,
  isOpponent,
  isAI,
  activeArcanaCount,
  isTargetableForAttack = false,
  isHoveredDropZone = false,
  canPlaceArcana = false,
  onOpenArchive,
  onOpenArcana,
  onSelectLeaderAttack,
  onInspectCard,
}) => {
  return (
    <div
      className={`w-full flex items-center justify-between px-2 sm:px-3 py-1 text-xs select-none gap-1 sm:gap-2 ${
        isOpponent
          ? 'border-b border-stone-800/80 bg-stone-950/90'
          : 'border-t border-stone-800/80 bg-stone-950/95'
      }`}
    >
      {/* Left: Player Identity & Barrier & Deck */}
      <div className="flex items-center gap-1.5 sm:gap-2.5 shrink-0">
        {/* Name Badge */}
        <div
          className={`flex items-center gap-1 px-1.5 py-0.5 rounded-full border shadow-xs ${
            isOpponent
              ? 'bg-sky-950/50 border-sky-600/60 text-sky-200'
              : 'bg-amber-950/50 border-amber-500/60 text-amber-200'
          }`}
        >
          <div
            className={`w-3.5 h-3.5 rounded-full flex items-center justify-center border text-[8px] shrink-0 ${
              isOpponent ? 'bg-sky-900 border-sky-400 text-sky-200' : 'bg-amber-900 border-amber-400 text-amber-200'
            }`}
          >
            {isAI ? <Bot className="w-2.5 h-2.5" /> : <User className="w-2.5 h-2.5" />}
          </div>
          <span className="font-bold text-[10px] sm:text-[11px] truncate max-w-[65px] sm:max-w-[110px]">
            {player.name}
          </span>
        </div>

        {/* Barrier (結界) */}
        <div
          data-dropzone={isOpponent ? 'OPPONENT_LEADER' : undefined}
          onClick={isOpponent && isTargetableForAttack ? onSelectLeaderAttack : undefined}
          className={`flex items-center gap-1 px-2 py-0.5 rounded-full border transition-all ${
            isOpponent && isTargetableForAttack
              ? 'bg-rose-950/90 border-rose-500 ring-2 ring-rose-400 cursor-pointer animate-target-glow scale-105 shadow-md shadow-rose-600/50'
              : isHoveredDropZone
              ? 'bg-rose-900 border-rose-400 ring-2 ring-rose-400 scale-105'
              : 'bg-stone-900/90 border-stone-700/80'
          }`}
          title={isOpponent ? '相手結界 (クリック/タップで直接攻撃)' : 'あなたの結界'}
        >
          <Shield
            className={`w-3 h-3 ${
              player.barrier > 2
                ? 'text-emerald-400 fill-emerald-400'
                : player.barrier > 0
                ? 'text-amber-400 fill-amber-400'
                : 'text-stone-600'
            }`}
          />
          <span className="text-[9px] text-stone-400 font-bold hidden xs:inline">結界</span>
          <div className="flex items-center gap-0.5">
            <span className="font-mono font-black text-xs sm:text-sm text-white">{player.barrier}</span>
            <span className="font-mono text-[8px] text-stone-500">/5</span>
          </div>
          {/* Barrier indicators */}
          <div className="flex items-center gap-0.5 ml-0.5">
            {[1, 2, 3, 4, 5].map((idx) => (
              <div
                key={idx}
                className={`w-1 sm:w-1.5 h-2.5 rounded-xs transition-all ${
                  idx <= player.barrier
                    ? 'bg-gradient-to-t from-rose-500 to-amber-300 shadow-xs'
                    : 'bg-stone-800 border border-stone-700/40 opacity-30'
                }`}
              />
            ))}
          </div>

          {isOpponent && isTargetableForAttack && (
            <span className="text-[8px] font-black bg-rose-600 text-white px-1.5 py-0.2 rounded-full animate-pulse ml-0.5">
              攻撃可能
            </span>
          )}
        </div>

        {/* Deck Count */}
        <span
          className="px-1.5 py-0.5 rounded bg-stone-900 border border-stone-800 text-stone-400 font-mono text-[9px] sm:text-[10px]"
          title="山札の残り枚数"
        >
          山札:{player.deck.length}
        </span>

        {/* Archive Button */}
        <button
          onClick={onOpenArchive}
          className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-stone-900 hover:bg-stone-800 border border-stone-800 hover:border-amber-400/80 text-stone-300 font-mono text-[9px] sm:text-[10px] transition-colors"
          title="アーカイブを確認"
        >
          <BookOpen className="w-2.5 h-2.5 text-stone-400" />
          <span>アーカイブ:{player.archive.length}</span>
        </button>
      </div>

      {/* Center: Domain & Runes (Only shown when relevant) */}
      <div className="flex items-center gap-1.5 sm:gap-3 overflow-hidden">
        {/* Domain (Only rendered if present) */}
        {player.domain && (
          <div
            onClick={() => onInspectCard && onInspectCard(player.domain!.baseCard)}
            className="flex items-center gap-1 px-2 py-0.5 bg-indigo-950/90 border border-indigo-500 rounded-md cursor-pointer hover:border-indigo-300 shadow-xs transition-all animate-pulse-ring"
            title={`ドメイン: ${player.domain.baseCard.name} (タップで詳細)`}
          >
            <Layers className="w-2.5 h-2.5 text-indigo-400 shrink-0" />
            <span className="text-[9px] sm:text-[10px] font-bold text-indigo-200 truncate max-w-[65px] sm:max-w-[100px]">
              {player.domain.baseCard.name}
            </span>
          </div>
        )}

        {/* Runes (Max 2) */}
        <div className="flex items-center gap-1">
          {[0, 1].map((idx) => {
            const rune = player.runes[idx];
            if (!rune) {
              return (
                <div
                  key={idx}
                  className="w-4 h-5 border border-dashed border-stone-800 rounded bg-stone-950/30 flex items-center justify-center text-[7px] text-stone-700 font-mono"
                  title="空ルーン枠"
                >
                  +
                </div>
              );
            }

            if (isOpponent) {
              return (
                <div
                  key={idx}
                  className="w-4.5 h-5.5 rounded bg-gradient-to-br from-purple-950 to-stone-900 border border-purple-500/80 flex items-center justify-center text-purple-300 shadow-xs animate-pulse"
                  title="相手の伏せルーン"
                >
                  <Zap className="w-2.5 h-2.5 text-purple-400" />
                </div>
              );
            }

            return (
              <div
                key={idx}
                onClick={() => onInspectCard && onInspectCard(rune.baseCard)}
                className="px-1.5 py-0.5 rounded bg-purple-950/90 border border-purple-400 hover:border-purple-300 cursor-pointer flex items-center gap-1 text-[9px] text-purple-200 font-bold shadow-xs transition-all"
                title={`セット中ルーン: ${rune.baseCard.name} (タップで詳細)`}
              >
                <Zap className="w-2.5 h-2.5 text-purple-400 shrink-0" />
                <span className="truncate max-w-[55px] sm:max-w-[85px]">{rune.baseCard.name}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Right: Arcana Indicator & Drop Target */}
      <div className="flex items-center gap-1.5 shrink-0">
        <button
          data-dropzone={!isOpponent ? 'ARCANA_ZONE' : undefined}
          onClick={onOpenArcana}
          className={`flex items-center gap-1 px-2 py-0.5 rounded-full border text-[10px] sm:text-xs font-bold transition-all ${
            canPlaceArcana && !isOpponent
              ? 'bg-amber-950 border-amber-400 ring-2 ring-amber-400 text-amber-200 animate-pulse-ring'
              : isHoveredDropZone && !isOpponent
              ? 'bg-amber-900 border-amber-300 ring-2 ring-amber-300 text-white scale-105'
              : 'bg-stone-900 hover:bg-stone-800 border-stone-700/80 text-amber-300'
          }`}
          title={isOpponent ? '相手のアルカナ一覧' : 'アルカナ一覧 / セット'}
        >
          <Flame className="w-2.5 h-2.5 sm:w-3 sm:h-3 text-amber-400 fill-amber-400 shrink-0" />
          <span className="text-[9px] sm:text-[10px] text-stone-400 hidden xs:inline">アルカナ</span>
          <span className="font-mono font-black text-amber-300">{activeArcanaCount}</span>
          <span className="font-mono text-[8px] text-stone-500">/{player.arcana.length}</span>
        </button>
      </div>
    </div>
  );
};
