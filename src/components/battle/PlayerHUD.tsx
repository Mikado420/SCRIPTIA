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
    <div className={`w-full flex items-center justify-between px-2.5 sm:px-4 py-1 text-xs select-none ${
      isOpponent
        ? 'border-b border-stone-800/80 bg-stone-950/90'
        : 'border-t border-stone-800/80 bg-stone-950/95'
    }`}>
      {/* Left: Player Identity & Barrier */}
      <div className="flex items-center gap-2 sm:gap-3 shrink-0">
        {/* Name & Avatar Badge */}
        <div className={`flex items-center gap-1.5 px-2 py-0.5 rounded-full border shadow-sm ${
          isOpponent
            ? 'bg-sky-950/40 border-sky-600/60 text-sky-200'
            : 'bg-amber-950/40 border-amber-500/60 text-amber-200'
        }`}>
          <div className={`w-4 h-4 rounded-full flex items-center justify-center border text-[9px] ${
            isOpponent ? 'bg-sky-900 border-sky-400 text-sky-200' : 'bg-amber-900 border-amber-400 text-amber-200'
          }`}>
            {isAI ? <Bot className="w-2.5 h-2.5" /> : <User className="w-2.5 h-2.5" />}
          </div>
          <span className="font-black text-[11px] truncate max-w-[80px] sm:max-w-[130px]">
            {player.name}
          </span>
        </div>

        {/* Barrier (結界) Container */}
        <div
          data-dropzone={isOpponent ? 'OPPONENT_LEADER' : undefined}
          onClick={isOpponent && isTargetableForAttack ? onSelectLeaderAttack : undefined}
          className={`flex items-center gap-1.5 px-2.5 py-0.5 rounded-full border transition-all ${
            isOpponent && isTargetableForAttack
              ? 'bg-rose-950/90 border-rose-500 ring-2 ring-rose-400 cursor-pointer animate-target-glow scale-105'
              : isHoveredDropZone
              ? 'bg-rose-900 border-rose-400 ring-4 ring-rose-400 scale-110'
              : 'bg-stone-900/90 border-stone-700/80'
          }`}
          title={isOpponent ? '相手リーダー結界' : 'あなたの結界'}
        >
          <Shield className={`w-3.5 h-3.5 ${
            player.barrier > 2 ? 'text-emerald-400 fill-emerald-400' : player.barrier > 0 ? 'text-amber-400 fill-amber-400' : 'text-stone-600'
          }`} />
          <span className="text-[10px] text-stone-400 font-bold hidden sm:inline">結界</span>
          <div className="flex items-center gap-0.5">
            <span className="font-mono font-black text-sm text-white">{player.barrier}</span>
            <span className="font-mono text-[9px] text-stone-500">/5</span>
          </div>
          {/* Barrier Shields visualization */}
          <div className="flex items-center gap-0.5 ml-1">
            {[1, 2, 3, 4, 5].map((idx) => (
              <div
                key={idx}
                className={`w-1.5 h-3 rounded-xs transition-all ${
                  idx <= player.barrier
                    ? 'bg-gradient-to-t from-rose-500 to-amber-300 shadow-xs'
                    : 'bg-stone-800 border border-stone-700/50 opacity-40'
                }`}
              />
            ))}
          </div>

          {isOpponent && isTargetableForAttack && (
            <span className="text-[8px] font-black bg-rose-600 text-white px-1.5 py-0.2 rounded-full animate-pulse ml-1">
              攻撃可能
            </span>
          )}
        </div>

        {/* Deck & Archive Badges */}
        <div className="flex items-center gap-1 font-mono text-[10px]">
          <span
            className="px-1.5 py-0.5 rounded bg-stone-900 border border-stone-800 text-stone-400 shadow-inner"
            title="山札の残り枚数"
          >
            山札:{player.deck.length}
          </span>

          <button
            onClick={onOpenArchive}
            className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-stone-900 hover:bg-stone-800 border border-stone-800 hover:border-amber-400/80 text-stone-300 transition-colors"
            title="アーカイブを確認"
          >
            <BookOpen className="w-2.5 h-2.5 text-stone-400" />
            <span>アーカイブ:{player.archive.length}</span>
          </button>
        </div>
      </div>

      {/* Center: Domain & Rune Status Slots */}
      <div className="flex items-center gap-2 sm:gap-4">
        {/* Domain Slot */}
        <div className="flex items-center gap-1">
          {player.domain ? (
            <div
              onClick={() => onInspectCard && onInspectCard(player.domain!.baseCard)}
              className="flex items-center gap-1 px-2 py-0.5 bg-indigo-950/90 border border-indigo-500 rounded-md cursor-pointer hover:border-indigo-300 shadow-sm transition-all animate-pulse-ring"
              title={`ドメイン: ${player.domain.baseCard.name} (タップで詳細)`}
            >
              <Layers className="w-3 h-3 text-indigo-400" />
              <span className="text-[10px] font-bold text-indigo-200 truncate max-w-[80px] sm:max-w-[110px]">
                {player.domain.baseCard.name}
              </span>
            </div>
          ) : (
            <div className="hidden sm:flex items-center gap-1 px-2 py-0.5 border border-dashed border-stone-800 rounded-md text-[9px] text-stone-600 font-mono">
              <span>ドメインなし</span>
            </div>
          )}
        </div>

        {/* Rune Slots (Max 2) */}
        <div className="flex items-center gap-1">
          <span className="text-[9px] text-stone-500 font-mono hidden sm:inline">ルーン:</span>
          {[0, 1].map((idx) => {
            const rune = player.runes[idx];
            if (!rune) {
              return (
                <div
                  key={idx}
                  className="w-5 h-6 border border-dashed border-stone-800 rounded bg-stone-950/40 flex items-center justify-center text-[7px] text-stone-700 font-mono"
                  title="空ルーン枠"
                >
                  {idx + 1}
                </div>
              );
            }

            if (isOpponent) {
              return (
                <div
                  key={idx}
                  className="w-5 h-6 rounded bg-gradient-to-br from-purple-950 to-stone-900 border border-purple-500/80 flex items-center justify-center text-[8px] text-purple-300 shadow-sm animate-pulse"
                  title="相手の伏せルーン (内容非公開)"
                >
                  <Zap className="w-2.5 h-2.5 text-purple-400" />
                </div>
              );
            }

            return (
              <div
                key={idx}
                onClick={() => onInspectCard && onInspectCard(rune.baseCard)}
                className="px-1.5 py-0.5 rounded bg-purple-950/90 border border-purple-400 hover:border-purple-300 cursor-pointer flex items-center gap-1 text-[9px] text-purple-200 font-bold shadow-sm transition-all"
                title={`セット中ルーン: ${rune.baseCard.name} (タップで確認)`}
              >
                <Zap className="w-2.5 h-2.5 text-purple-400" />
                <span className="truncate max-w-[65px] sm:max-w-[90px]">{rune.baseCard.name}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Right: Arcana Indicator & Drop Target */}
      <div className="flex items-center gap-2 shrink-0">
        <button
          data-dropzone={!isOpponent ? 'ARCANA_ZONE' : undefined}
          onClick={onOpenArcana}
          className={`flex items-center gap-1 px-2.5 py-0.5 rounded-full border text-xs font-bold transition-all ${
            canPlaceArcana && !isOpponent
              ? 'bg-amber-950 border-amber-400 ring-2 ring-amber-400 text-amber-200 animate-pulse-ring'
              : isHoveredDropZone && !isOpponent
              ? 'bg-amber-900 border-amber-300 ring-4 ring-amber-300 text-white scale-105'
              : 'bg-stone-900 hover:bg-stone-800 border-stone-700/80 text-amber-300'
          }`}
          title={isOpponent ? '相手のアルカナ一覧' : 'アルカナ一覧 / セット'}
        >
          <Flame className="w-3 h-3 text-amber-400 fill-amber-400" />
          <span className="text-[10px] text-stone-400 hidden sm:inline">アルカナ</span>
          <span className="font-mono font-black text-amber-300">{activeArcanaCount}</span>
          <span className="font-mono text-[9px] text-stone-500">/{player.arcana.length}</span>
        </button>
      </div>
    </div>
  );
};
