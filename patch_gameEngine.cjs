const fs = require('fs');
let code = fs.readFileSync('src/engine/gameEngine.ts', 'utf8');

const effectResolutionCode = `
    // 2.5 EFFECT RESOLUTION STEP
    if (state.phase === 'EFFECT_RESOLUTION' && state.pendingEffect) {
      const resolvingPlayer = this.getPlayer(state, state.pendingEffect.triggeringPlayerId);
      
      if (state.pendingEffect.effectType === 'C_03_ARCANA') {
        for (const card of resolvingPlayer.hand) {
          actions.push({
            action: {
              type: 'RESOLVE_EFFECT',
              playerId: resolvingPlayer.playerId,
              payload: {
                effectType: 'C_03_ARCANA',
                doResolve: true,
                targetId: card.instanceId,
              },
              description: \`【効果】\${card.baseCard.name} をアルカナに置く\`,
            },
            description: \`アルカナに \${card.baseCard.name} を置く\`,
            category: 'RESOLVE',
            cardId: card.cardId,
            cardName: card.baseCard.name,
          });
        }
        actions.push({
          action: {
            type: 'RESOLVE_EFFECT',
            playerId: resolvingPlayer.playerId,
            payload: {
              effectType: 'C_03_ARCANA',
              doResolve: false,
            },
            description: \`【効果】アルカナに置かない\`,
          },
          description: \`効果をキャンセルする\`,
          category: 'RESOLVE',
        });
      }
      return actions;
    }
`;

code = code.replace(
  "    // 3. ARCANA PHASE (Place 1 card from hand into Arcana)",
  effectResolutionCode + "\n    // 3. ARCANA PHASE (Place 1 card from hand into Arcana)"
);

const resolveEffectActionCode = `
      // 9.5 RESOLVE EFFECT
      case 'RESOLVE_EFFECT': {
        const { effectType, doResolve, targetId } = action.payload as { effectType: string; doResolve: boolean; targetId?: string };
        const effect = nextState.pendingEffect;
        if (effect && effectType === effect.effectType) {
          const player = this.getPlayer(nextState, effect.triggeringPlayerId);
          if (doResolve && effectType === 'C_03_ARCANA' && targetId) {
            const handIdx = player.hand.findIndex(c => c.instanceId === targetId);
            if (handIdx !== -1) {
              const toArcana = player.hand.splice(handIdx, 1)[0];
              player.arcana.push({ instance: toArcana, isRested: true });
              logMessage = \`\${player.name} は手札から「\${toArcana.baseCard.name}」をアルカナに置いた\`;
            }
          } else {
            logMessage = \`\${player.name} は効果をスキップした\`;
          }
          nextState.pendingEffect = undefined;
          nextState.phase = 'ACTION';
          logType = 'EFFECT';
        }
        break;
      }
`;

code = code.replace(
  "      // 10. END TURN",
  resolveEffectActionCode + "\n      // 10. END TURN"
);

fs.writeFileSync('src/engine/gameEngine.ts', code);
console.log("Patched gameEngine.ts");
