import React from 'react';
import { GamePhase, GameState, LegalAction, Action } from '../../types/game';
import { Swords, Shield, Zap, Flame, Sparkles, X, ArrowRight } from 'lucide-react';

interface CombatOverlayProps {
  gameState: GameState;
  legalActions: LegalAction[];
  isHumanTurn: boolean;
  selectedAttackerInstanceId: string | null;
  combatAnimation: {
    type: 'ATTACK' | 'GUARD' | 'DAMAGE' | 'DESTROY' | 'SPELL' | 'EVOLVE';
    sourceText?: string;
    targetText?: string;
    damageAmount?: number;
  } | null;
  onClearAttacker: () => void;
  onExecuteAction: (action: Action) => void;
}

export const CombatOverlay: React.FC<CombatOverlayProps> = ({
  gameState,
  legalActions,
  isHumanTurn,
  selectedAttackerInstanceId,
  combatAnimation,
  onClearAttacker,
  onExecuteAction,
}) => {
  const passAction = legalActions.find((a) => a.category === 'PASS');
  const phase = gameState.phase;

  const getPhaseBadge = () => {
    switch (phase) {
      case 'ARCANA':
        return { label: 'ARCANA', bg: 'bg-amber-950/90 text-amber-300 border-amber-500/80' };
      case 'ACTION':
        return { label: 'MAIN', bg: 'bg-sky-950/90 text-sky-300 border-sky-500/80' };
      case 'GUARD_STEP':
        return { label: 'GUARD', bg: 'bg-rose-950/90 text-rose-200 border-rose-500 animate-pulse' };
      case 'RUNE_STEP':
        return { label: 'RUNE', bg: 'bg-purple-950/90 text-purple-200 border-purple-500 animate-bounce' };
      case 'EFFECT_RESOLUTION':
        return { label: 'EFFECT', bg: 'bg-indigo-950/90 text-indigo-200 border-indigo-500' };
      default:
        return { label: phase, bg: 'bg-stone-900 text-stone-300 border-stone-700' };
    }
  };

  const phaseConfig = getPhaseBadge();
  const hasUrgentAction = (phase === 'GUARD_STEP' && isHumanTurn) ||
    (phase === 'RUNE_STEP' && isHumanTurn) ||
    (phase === 'ARCANA' && isHumanTurn) ||
    selectedAttackerInstanceId !== null;

  return (
    <div className="w-full shrink-0 h-4 relative flex items-center justify-center z-20 pointer-events-none">
      {/* Subtle Central Field Divider Line */}
      <div className="absolute inset-x-8 top-1/2 -translate-y-1/2 h-px bg-gradient-to-r from-transparent via-stone-800 to-transparent" />

      {/* Ultra-compact Turn & Phase Badge in Center (only takes visual space, no bloated height) */}
      <div className="relative flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-stone-950/90 border border-stone-800 text-[9px] font-mono shadow-sm">
        <span className="font-black text-amber-400">T{gameState.turnNumber}</span>
        <span className="text-stone-600">/</span>
        <span className={`font-bold px-1 rounded text-[8px] ${phaseConfig.bg}`}>
          {phaseConfig.label}
        </span>
      </div>

      {/* Floating Prompt & Action Controls (Only appears when user interaction is required) */}
      {hasUrgentAction && (
        <div className="absolute top-1/2 -translate-y-1/2 left-1/2 -translate-x-1/2 flex items-center gap-1.5 bg-stone-950/98 border border-amber-400/90 px-3 py-1 rounded-full shadow-2xl z-40 pointer-events-auto backdrop-blur-md animate-fade-in whitespace-nowrap">
          {/* Status Label */}
          {phase === 'GUARD_STEP' && isHumanTurn ? (
            <div className="flex items-center gap-1 text-rose-300 font-bold text-[10px]">
              <Shield className="w-3 h-3 text-rose-400 animate-pulse" />
              <span>ガード選択</span>
            </div>
          ) : phase === 'RUNE_STEP' && isHumanTurn ? (
            <div className="flex items-center gap-1 text-purple-300 font-bold text-[10px]">
              <Zap className="w-3 h-3 text-purple-400 animate-bounce" />
              <span>ルーン発動？</span>
            </div>
          ) : selectedAttackerInstanceId ? (
            <div className="flex items-center gap-1 text-rose-300 font-bold text-[10px]">
              <Swords className="w-3 h-3 text-rose-400" />
              <span>攻撃対象を選択</span>
            </div>
          ) : phase === 'ARCANA' && isHumanTurn ? (
            <span className="text-amber-400 text-[10px] font-bold">
              手札をアルカナにセット
            </span>
          ) : null}

          {/* Action Buttons */}
          {selectedAttackerInstanceId && (
            <button
              onClick={onClearAttacker}
              className="px-2 py-0.5 rounded-full bg-stone-800 hover:bg-stone-700 text-stone-200 text-[10px] font-bold border border-stone-600 flex items-center gap-0.5 active:scale-95 transition-all shadow-sm"
            >
              <X className="w-2.5 h-2.5" />
              <span>解除</span>
            </button>
          )}

          {phase === 'GUARD_STEP' && isHumanTurn && passAction && (
            <button
              onClick={() => onExecuteAction(passAction.action)}
              className="px-3 py-0.5 rounded-full bg-rose-600 hover:bg-rose-500 text-white text-[10px] font-black border border-rose-400 shadow-md active:scale-95 transition-all animate-pulse"
            >
              スルー
            </button>
          )}

          {phase === 'RUNE_STEP' && isHumanTurn && (
            <div className="flex items-center gap-1">
              {legalActions
                .filter((a) => a.category === 'TRIGGER')
                .map((act, i) => (
                  <button
                    key={i}
                    onClick={() => onExecuteAction(act.action)}
                    className="px-2.5 py-0.5 rounded-full bg-purple-600 hover:bg-purple-500 text-white text-[10px] font-black border border-purple-400 shadow-sm active:scale-95 transition-all"
                  >
                    発動
                  </button>
                ))}
              {passAction && (
                <button
                  onClick={() => onExecuteAction(passAction.action)}
                  className="px-2 py-0.5 rounded-full bg-stone-800 hover:bg-stone-700 text-stone-300 text-[10px] font-bold border border-stone-600 active:scale-95 transition-all"
                >
                  温存
                </button>
              )}
            </div>
          )}

          {phase === 'ARCANA' && isHumanTurn && passAction && (
            <button
              onClick={() => onExecuteAction(passAction.action)}
              className="px-2.5 py-0.5 rounded-full bg-stone-800 hover:bg-stone-700 text-amber-300 text-[10px] font-bold border border-stone-600 active:scale-95 transition-all"
            >
              スキップ
            </button>
          )}
        </div>
      )}

      {/* Floating Combat Animation Banner */}
      {combatAnimation && (
        <div className="absolute inset-x-0 -top-6 flex items-center justify-center pointer-events-none z-50 animate-fade-in">
          <div className="px-3 py-1 rounded-full bg-stone-950/95 border-2 border-amber-400 text-amber-200 text-[10px] font-black shadow-2xl flex items-center gap-1.5">
            {combatAnimation.type === 'ATTACK' && <Swords className="w-3.5 h-3.5 text-red-500 animate-spin" />}
            {combatAnimation.type === 'GUARD' && <Shield className="w-3.5 h-3.5 text-sky-400 animate-pulse" />}
            {combatAnimation.type === 'SPELL' && <Sparkles className="w-3.5 h-3.5 text-purple-400 animate-bounce" />}
            {combatAnimation.type === 'EVOLVE' && <Flame className="w-3.5 h-3.5 text-amber-400 animate-pulse" />}
            <span>{combatAnimation.sourceText}</span>
            {combatAnimation.targetText && (
              <>
                <ArrowRight className="w-3 h-3 text-stone-400" />
                <span className="text-white">{combatAnimation.targetText}</span>
              </>
            )}
            {combatAnimation.damageAmount && (
              <span className="text-rose-400 font-mono font-black ml-0.5">
                [-{combatAnimation.damageAmount}]
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
