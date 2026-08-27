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
        return { label: 'アルカナ', bg: 'bg-amber-950/80 text-amber-300 border-amber-500/80' };
      case 'ACTION':
        return { label: 'メイン行動', bg: 'bg-sky-950/80 text-sky-300 border-sky-500/80' };
      case 'GUARD_STEP':
        return { label: 'ガードステップ', bg: 'bg-rose-950/90 text-rose-200 border-rose-500 animate-pulse' };
      case 'RUNE_STEP':
        return { label: 'ルーン誘発', bg: 'bg-purple-950/90 text-purple-200 border-purple-500 animate-bounce' };
      case 'EFFECT_RESOLUTION':
        return { label: '効果解決', bg: 'bg-indigo-950/90 text-indigo-200 border-indigo-500' };
      default:
        return { label: 'ターン進行', bg: 'bg-stone-900 text-stone-300 border-stone-700' };
    }
  };

  const phaseConfig = getPhaseBadge();

  return (
    <div className="w-full shrink-0 flex items-center justify-between px-3 sm:px-4 py-0.5 bg-stone-950/85 border-y border-stone-800/80 backdrop-blur-xs relative z-20 select-none">
      {/* Left: Turn Number & Phase Badge */}
      <div className="flex items-center gap-2">
        <span className="text-[11px] font-black text-amber-400 font-mono tracking-wider">
          TURN {gameState.turnNumber}
        </span>
        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${phaseConfig.bg}`}>
          {phaseConfig.label}
        </span>
      </div>

      {/* Center: Context Prompt Banner */}
      <div className="flex items-center gap-2 text-xs">
        {phase === 'GUARD_STEP' && isHumanTurn ? (
          <div className="flex items-center gap-1.5 bg-rose-950/90 border border-rose-500/90 px-2.5 py-0.5 rounded-full text-rose-200 font-bold animate-pulse text-[11px]">
            <Shield className="w-3.5 h-3.5 text-rose-400" />
            <span>ガードするユニットを選択</span>
          </div>
        ) : phase === 'RUNE_STEP' && isHumanTurn ? (
          <div className="flex items-center gap-1.5 bg-purple-950/90 border border-purple-500/90 px-2.5 py-0.5 rounded-full text-purple-200 font-bold animate-bounce text-[11px]">
            <Zap className="w-3.5 h-3.5 text-purple-400" />
            <span>ルーンを発動しますか？</span>
          </div>
        ) : selectedAttackerInstanceId ? (
          <div className="flex items-center gap-1.5 bg-rose-950/90 border border-rose-500/90 px-2.5 py-0.5 rounded-full text-rose-200 font-bold text-[11px]">
            <Swords className="w-3.5 h-3.5 text-rose-400" />
            <span>攻撃対象を選択</span>
          </div>
        ) : phase === 'ARCANA' && isHumanTurn ? (
          <span className="text-amber-400/90 text-[10px] font-bold hidden sm:inline">
            アルカナにセットするカードを選択
          </span>
        ) : null}
      </div>

      {/* Right: Urgent Context Action Buttons */}
      <div className="flex items-center gap-1.5">
        {selectedAttackerInstanceId && (
          <button
            onClick={onClearAttacker}
            className="px-2.5 py-1 rounded-full bg-stone-800 hover:bg-stone-700 text-stone-200 text-xs font-bold border border-stone-600 flex items-center gap-1 active:scale-95 transition-all shadow-sm"
          >
            <X className="w-3 h-3" />
            <span>解除</span>
          </button>
        )}

        {phase === 'GUARD_STEP' && isHumanTurn && passAction && (
          <button
            onClick={() => onExecuteAction(passAction.action)}
            className="px-3 py-1 rounded-full bg-rose-600 hover:bg-rose-500 text-white text-xs font-black border border-rose-400 shadow-lg shadow-rose-900/50 active:scale-95 transition-all animate-pulse"
          >
            スルー
          </button>
        )}

        {phase === 'RUNE_STEP' && isHumanTurn && (
          <div className="flex items-center gap-1.5">
            {legalActions.filter(a => a.category === 'TRIGGER').map((act, i) => (
              <button
                key={i}
                onClick={() => onExecuteAction(act.action)}
                className="px-3 py-1 rounded-full bg-purple-600 hover:bg-purple-500 text-white text-xs font-black border border-purple-400 shadow-md active:scale-95 transition-all"
              >
                発動
              </button>
            ))}
            {passAction && (
              <button
                onClick={() => onExecuteAction(passAction.action)}
                className="px-2.5 py-1 rounded-full bg-stone-800 hover:bg-stone-700 text-stone-300 text-xs font-bold border border-stone-600 active:scale-95 transition-all"
              >
                温存
              </button>
            )}
          </div>
        )}

        {phase === 'ARCANA' && isHumanTurn && passAction && (
          <button
            onClick={() => onExecuteAction(passAction.action)}
            className="px-2.5 py-1 rounded-full bg-stone-800 hover:bg-stone-700 text-amber-300 text-xs font-bold border border-stone-600 active:scale-95 transition-all"
          >
            スキップ
          </button>
        )}
      </div>

      {/* Floating Combat Animation Banner */}
      {combatAnimation && (
        <div className="absolute inset-x-0 -top-8 flex items-center justify-center pointer-events-none z-50 animate-fade-in">
          <div className="px-4 py-1.5 rounded-full bg-stone-950/95 border-2 border-amber-400 text-amber-200 text-xs font-black shadow-2xl flex items-center gap-2">
            {combatAnimation.type === 'ATTACK' && <Swords className="w-4 h-4 text-red-500 animate-spin" />}
            {combatAnimation.type === 'GUARD' && <Shield className="w-4 h-4 text-sky-400 animate-pulse" />}
            {combatAnimation.type === 'SPELL' && <Sparkles className="w-4 h-4 text-purple-400 animate-bounce" />}
            {combatAnimation.type === 'EVOLVE' && <Flame className="w-4 h-4 text-amber-400 animate-pulse" />}
            <span>{combatAnimation.sourceText}</span>
            {combatAnimation.targetText && (
              <>
                <ArrowRight className="w-3.5 h-3.5 text-stone-400" />
                <span className="text-white">{combatAnimation.targetText}</span>
              </>
            )}
            {combatAnimation.damageAmount && (
              <span className="text-rose-400 font-mono font-black ml-1">
                [-{combatAnimation.damageAmount}]
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
