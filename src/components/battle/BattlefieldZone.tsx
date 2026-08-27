import React from 'react';
import { CardInstance, CardData, LegalAction, GamePhase } from '../../types/game';
import { CardItem } from '../CardItem';

interface BattlefieldZoneProps {
  units: CardInstance[];
  isOpponent: boolean;
  selectedAttackerInstanceId: string | null;
  legalActions: LegalAction[];
  isHumanTurn: boolean;
  phase: GamePhase;
  hoveredDropZone: string | null;
  dragSource?: string;
  onSelectAttacker: (instanceId: string | null) => void;
  onInspectCard: (card: CardData) => void;
  onExecuteAction: (action: any) => void;
  onPointerDownUnit: (e: React.PointerEvent, unit: CardInstance) => void;
}

export const BattlefieldZone: React.FC<BattlefieldZoneProps> = ({
  units,
  isOpponent,
  selectedAttackerInstanceId,
  legalActions,
  isHumanTurn,
  phase,
  hoveredDropZone,
  dragSource,
  onSelectAttacker,
  onInspectCard,
  onExecuteAction,
  onPointerDownUnit,
}) => {
  const dropzoneId = isOpponent ? 'OPPONENT_BATTLEFIELD' : 'PLAYER_BATTLEFIELD';

  // Legal attacks for the currently selected attacker
  const legalAttacksForAttacker = legalActions.filter(
    (a) =>
      a.action.type === 'ATTACK' &&
      (a.action.payload as any)?.attackerInstanceId === selectedAttackerInstanceId
  );

  return (
    <div
      data-dropzone={dropzoneId}
      className={`flex-1 w-full flex items-center justify-center gap-1.5 sm:gap-2.5 px-2 py-0.5 overflow-visible relative z-10 transition-colors min-h-[95px] sm:min-h-[110px] ${
        !isOpponent && dragSource === 'HAND' && phase === 'ACTION'
          ? 'bg-emerald-950/20 ring-1 ring-emerald-500/40 rounded-xl'
          : ''
      }`}
    >
      {units.length === 0 ? (
        <div className="flex flex-col items-center justify-center opacity-30 select-none pointer-events-none py-1">
          <div className="text-[10px] font-mono tracking-widest font-bold text-stone-500">
            {isOpponent ? '相手フィールド (0/6)' : '自分フィールド (0/6)'}
          </div>
          {!isOpponent && dragSource === 'HAND' && (
            <div className="text-[9px] text-emerald-400 font-bold mt-0.5 animate-pulse">
              ドロップして召喚
            </div>
          )}
        </div>
      ) : (
        units.map((unit) => {
          // Check if this unit can attack (for player side)
          const canAttack = !isOpponent && isHumanTurn && phase === 'ACTION' && legalActions.some(
            (a) =>
              a.action.type === 'ATTACK' &&
              (a.action.payload as any)?.attackerInstanceId === unit.instanceId
          );

          // Check if this unit is targetable for an attack (for opponent side)
          const isTargetableForAttack = isOpponent && selectedAttackerInstanceId !== null && legalAttacksForAttacker.some(
            (a) =>
              (a.action.payload as any)?.targetType === 'UNIT' &&
              (a.action.payload as any)?.targetUnitInstanceId === unit.instanceId
          );

          // Check if this unit can guard (for player side during GUARD_STEP)
          const isGuardable = !isOpponent && isHumanTurn && phase === 'GUARD_STEP' && legalActions.some(
            (a) =>
              a.action.type === 'GUARD' &&
              (a.action.payload as any)?.guardInstanceId === unit.instanceId
          );

          const isSelected = selectedAttackerInstanceId === unit.instanceId;
          const unitDropzone = isOpponent ? `UNIT_B_${unit.instanceId}` : `UNIT_A_${unit.instanceId}`;

          return (
            <div
              key={unit.instanceId}
              data-dropzone={unitDropzone}
              onPointerDown={(e) => onPointerDownUnit(e, unit)}
              onClick={() => {
                if (isOpponent && isTargetableForAttack) {
                  const attackAction = legalAttacksForAttacker.find(
                    (a) =>
                      (a.action.payload as any)?.targetType === 'UNIT' &&
                      (a.action.payload as any)?.targetUnitInstanceId === unit.instanceId
                  );
                  if (attackAction) onExecuteAction(attackAction.action);
                } else if (!isOpponent) {
                  if (phase === 'GUARD_STEP' && isGuardable) {
                    const guardAction = legalActions.find(
                      (a) =>
                        a.action.type === 'GUARD' &&
                        (a.action.payload as any)?.guardInstanceId === unit.instanceId &&
                        (a.action.payload as any)?.doGuard === true
                    );
                    if (guardAction) onExecuteAction(guardAction.action);
                  } else if (canAttack) {
                    onSelectAttacker(isSelected ? null : unit.instanceId);
                  } else {
                    onInspectCard(unit.baseCard);
                  }
                } else {
                  onInspectCard(unit.baseCard);
                }
              }}
              className={`relative shrink-0 transition-transform duration-150 ${
                isSelected ? '-translate-y-2 scale-105' : ''
              }`}
            >
              <CardItem
                card={unit}
                size="sm"
                isInteractive={true}
                isSelected={isSelected}
                isPlayable={canAttack && !selectedAttackerInstanceId}
                isTargetable={isTargetableForAttack}
                isGuardable={isGuardable}
                onInspect={onInspectCard}
              />
            </div>
          );
        })
      )}
    </div>
  );
};
