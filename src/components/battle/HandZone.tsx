import React, { useRef } from 'react';
import { CardData, CardInstance, Action, LegalAction, GamePhase } from '../../types/game';
import { CardItem } from '../CardItem';
import { Flame, ArrowRight, X, Sparkles, Swords, Zap, Info } from 'lucide-react';

interface HandZoneProps {
  hand: CardInstance[];
  selectedHandInstanceId: string | null;
  legalActions: LegalAction[];
  phase: GamePhase;
  isHumanTurn: boolean;
  onSelectCard: (instanceId: string | null) => void;
  onInspectCard: (card: CardData) => void;
  onExecuteAction: (action: Action) => void;
  onPointerDownCard: (e: React.PointerEvent, card: CardInstance) => void;
}

export const HandZone: React.FC<HandZoneProps> = ({
  hand,
  selectedHandInstanceId,
  legalActions,
  phase,
  isHumanTurn,
  onSelectCard,
  onInspectCard,
  onExecuteAction,
  onPointerDownCard,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const cardCount = hand.length;

  // Calculate dynamic overlap based on card count (supporting up to 15+ cards without overflow)
  const getMarginLeft = (index: number) => {
    if (index === 0) return 0;
    if (cardCount <= 3) return 6; // slight gap
    if (cardCount <= 5) return -8;
    if (cardCount <= 7) return -18;
    if (cardCount <= 9) return -26;
    if (cardCount <= 12) return -34;
    return -42; // 13-15+ cards
  };

  const selectedCard = hand.find((c) => c.instanceId === selectedHandInstanceId);
  const selectedHandActions = legalActions.filter(
    (leg) =>
      selectedHandInstanceId &&
      ((leg.action.payload as any)?.cardInstanceId === selectedHandInstanceId ||
        (leg.action.payload as any)?.evolveTargetInstanceId === selectedHandInstanceId)
  );

  return (
    <div
      ref={containerRef}
      className="relative w-full shrink-0 flex flex-col items-center justify-end px-1 pb-0.5 pointer-events-auto min-h-[72px] sm:min-h-[80px] md:min-h-[88px] overflow-visible"
    >
      {/* Hand Cards Fan Container */}
      <div className="flex items-end justify-center max-w-full overflow-visible transition-all">
        {cardCount === 0 ? (
          <div className="text-[9px] text-stone-600 font-mono italic py-1">
            手札 0枚
          </div>
        ) : (
          hand.map((card, index) => {
            const isSelected = selectedHandInstanceId === card.instanceId;
            const isPlayable = isHumanTurn && legalActions.some(
              (a) =>
                (a.action.payload as any)?.cardInstanceId === card.instanceId ||
                (a.action.payload as any)?.evolveTargetInstanceId === card.instanceId
            );

            const marginLeft = getMarginLeft(index);

            return (
              <div
                key={card.instanceId}
                onPointerDown={(e) => onPointerDownCard(e, card)}
                onClick={() => {
                  if (isSelected) {
                    onSelectCard(null);
                  } else {
                    onSelectCard(card.instanceId);
                    onInspectCard(card.baseCard);
                  }
                }}
                style={{
                  marginLeft: `${marginLeft}px`,
                  zIndex: isSelected ? 45 : index + 10,
                }}
                className={`transition-all duration-150 transform cursor-pointer shrink-0 ${
                  isSelected
                    ? '-translate-y-3 sm:-translate-y-4 scale-105 shadow-xl z-45'
                    : 'hover:-translate-y-1.5 hover:scale-105 hover:z-30'
                }`}
              >
                <CardItem
                  card={card}
                  size="xs"
                  isInteractive={true}
                  isSelected={isSelected}
                  isPlayable={isPlayable}
                  onInspect={onInspectCard}
                />
              </div>
            );
          })
        )}
      </div>

      {/* Floating Action Ribbon when a Card is Selected */}
      {selectedCard && isHumanTurn && (
        <div className="absolute -top-8 sm:-top-9 left-1/2 -translate-x-1/2 flex items-center gap-1 bg-stone-950/98 border border-amber-400/90 rounded-full px-2 sm:px-2.5 py-0.5 shadow-2xl z-50 animate-fade-in backdrop-blur-md whitespace-nowrap">
          {/* Phase Specific Fast Actions */}
          {phase === 'ARCANA' ? (
            <button
              onClick={(e) => {
                e.stopPropagation();
                const arcAction = legalActions.find(
                  (a) =>
                    a.action.type === 'SET_ARCANA' &&
                    (a.action.payload as any)?.cardInstanceId === selectedCard.instanceId
                );
                if (arcAction) onExecuteAction(arcAction.action);
              }}
              className="px-2.5 py-1 rounded-full bg-amber-500 hover:bg-amber-400 text-stone-950 text-[11px] sm:text-xs font-black flex items-center gap-1 shadow-md active:scale-95 transition-all"
            >
              <Flame className="w-3 h-3 fill-current" />
              <span>アルカナにセット</span>
            </button>
          ) : phase === 'EFFECT_RESOLUTION' ? (
            <button
              onClick={(e) => {
                e.stopPropagation();
                const resolveAction = legalActions.find(
                  (a) =>
                    a.action.type === 'RESOLVE_EFFECT' &&
                    (a.action.payload as any)?.targetId === selectedCard.instanceId
                );
                if (resolveAction) onExecuteAction(resolveAction.action);
              }}
              className="px-2.5 py-1 rounded-full bg-indigo-500 hover:bg-indigo-400 text-stone-950 text-[11px] sm:text-xs font-black flex items-center gap-1 shadow-md active:scale-95 transition-all"
            >
              <Zap className="w-3 h-3 fill-current" />
              <span>効果の対象に指定</span>
            </button>
          ) : selectedHandActions.length > 0 ? (
            selectedHandActions.map((act, i) => (
              <button
                key={i}
                onClick={(e) => {
                  e.stopPropagation();
                  onExecuteAction(act.action);
                }}
                className="px-2.5 sm:px-3 py-1 rounded-full bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-stone-950 text-[11px] sm:text-xs font-black flex items-center gap-1 shadow-md active:scale-95 transition-all"
              >
                <span>{act.description}</span>
                <ArrowRight className="w-3 h-3" />
              </button>
            ))
          ) : (
            <span className="text-[10px] sm:text-[11px] text-stone-400 px-1 font-medium">
              現在プレイ不可
            </span>
          )}

          {/* Inspect Card Details */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              onInspectCard(selectedCard.baseCard);
            }}
            className="px-2 py-1 rounded-full bg-stone-800 hover:bg-stone-700 text-stone-200 text-[10px] sm:text-xs font-bold flex items-center gap-0.5 border border-stone-700 active:scale-95 transition-all"
            title="カード詳細"
          >
            <Info className="w-3 h-3 text-amber-400" />
            <span>詳細</span>
          </button>

          {/* Close Selection */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              onSelectCard(null);
            }}
            className="p-1 rounded-full text-stone-400 hover:text-white hover:bg-stone-800 active:scale-95 transition-all"
            title="選択解除"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}
    </div>
  );
};
