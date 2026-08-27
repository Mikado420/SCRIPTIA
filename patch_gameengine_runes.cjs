const fs = require('fs');
let code = fs.readFileSync('src/engine/gameEngine.ts', 'utf8');

// For ON_ENTER (A-14)
code = code.replace(
  "          const flareRune = opponent.runes.find((r) => r.cardId === 'A-14');\n          const isGuardUnit = !!card.baseCard.hasGuard;\n          if (flareRune && card.baseCard.def <= 60 && isGuardUnit) {\n            nextState.phase = 'RUNE_STEP';\n            nextState.pendingTrigger = {\n              triggerType: 'ON_ENTER',\n              sourceInstanceId: flareRune.instanceId,\n              triggeringPlayerId: opponent.playerId,\n              targetInstanceId: card.instanceId,\n              targetDef: card.baseCard.def,\n            };\n          } else {",
  `          const hasFlare = opponent.runes.some((r) => r.cardId === 'A-14');
          const isGuardUnit = !!card.baseCard.hasGuard;
          if (hasFlare && card.baseCard.def <= 60 && isGuardUnit) {
            nextState.phase = 'RUNE_STEP';
            nextState.pendingTrigger = {
              triggerType: 'ON_ENTER',
              triggeringPlayerId: opponent.playerId,
              targetInstanceId: card.instanceId,
              targetDef: card.baseCard.def,
            };
          } else {`
);

// For ON_ATTACK (B-14 and D-14)
// Need to handle this in `case 'ATTACK':`
// B-14 triggers on ANY attack. D-14 triggers on PLAYER attack.
const oldAttackRune = `            // Check opponent Runes: B-14 (ヴォルテ・リターン) or D-14 (三重聖壁: 自分が攻撃されたとき)
            const attackRune = opponent.runes.find((r) => r.cardId === 'B-14' || r.cardId === 'D-14');
            if (attackRune) {
              nextState.phase = 'RUNE_STEP';
              nextState.pendingTrigger = {
                triggerType: 'ON_ATTACK',
                sourceInstanceId: attackRune.instanceId,
                triggeringPlayerId: opponent.playerId,
                targetInstanceId: attacker.instanceId,
              };
            }`;

const newAttackRune = `            // Check opponent Runes: B-14 (ANY attack) or D-14 (PLAYER attack)
            const hasB14 = opponent.runes.some((r) => r.cardId === 'B-14');
            const hasD14 = targetType === 'PLAYER' && opponent.runes.some((r) => r.cardId === 'D-14');
            if (hasB14 || hasD14) {
              nextState.phase = 'RUNE_STEP';
              nextState.pendingTrigger = {
                triggerType: 'ON_ATTACK',
                triggeringPlayerId: opponent.playerId,
                targetInstanceId: attacker.instanceId,
              };
            }`;

code = code.replace(oldAttackRune, newAttackRune);

// For ON_DESTROY (E-14)
const oldDestroyRune = `    const necroRune = owner.runes.find((r) => r.cardId === 'E-14');
    if (necroRune && owner.archive.some((c) => (c.baseCard.cardType === 'UNIT' || c.baseCard.cardType === 'EVOLVE_UNIT') && c.baseCard.cost <= 2 && c.baseCard.faction === 'DARK')) {
      state.phase = 'RUNE_STEP';
      state.pendingTrigger = {
        triggerType: 'ON_DESTROY',
        sourceInstanceId: necroRune.instanceId,
        triggeringPlayerId: owner.playerId,
        targetInstanceId: unit.instanceId,
      };
    }`;

const newDestroyRune = `    const hasE14 = owner.runes.some((r) => r.cardId === 'E-14');
    if (hasE14 && owner.archive.some((c) => (c.baseCard.cardType === 'UNIT' || c.baseCard.cardType === 'EVOLVE_UNIT') && c.baseCard.cost <= 2 && c.baseCard.faction === 'DARK')) {
      state.phase = 'RUNE_STEP';
      state.pendingTrigger = {
        triggerType: 'ON_DESTROY',
        triggeringPlayerId: owner.playerId,
        targetInstanceId: unit.instanceId,
      };
    }`;
code = code.replace(oldDestroyRune, newDestroyRune);

// For ON_ARCANA_SET (C-14)
const oldArcanaRune = `          const runeC14 = opponent.runes.find((r) => r.cardId === 'C-14');
          if (runeC14) {
            nextState.phase = 'RUNE_STEP';
            nextState.pendingTrigger = {
              triggerType: 'ON_ARCANA_SET',
              sourceInstanceId: runeC14.instanceId,
              triggeringPlayerId: opponent.playerId,
            };
          }`;

const newArcanaRune = `          const hasC14 = opponent.runes.some((r) => r.cardId === 'C-14');
          if (hasC14) {
            nextState.phase = 'RUNE_STEP';
            nextState.pendingTrigger = {
              triggerType: 'ON_ARCANA_SET',
              triggeringPlayerId: opponent.playerId,
            };
          }`;
code = code.replace(oldArcanaRune, newArcanaRune);


// Update getLegalActions for RUNE_STEP
const oldRuneActions = `    if (state.phase === 'RUNE_STEP' && state.pendingTrigger) {
      const runePlayer = this.getPlayer(state, state.pendingTrigger.triggeringPlayerId);
      for (const rune of runePlayer.runes) {
        // Match rune trigger types
        // A-14: フレア・トリガー (相手がユニットを登場させたとき、そのユニットがDEF60以下のガードなら、登場時効果を処理する前に破壊する)
        if (state.pendingTrigger.triggerType === 'ON_ENTER' && rune.cardId === 'A-14') {
          if ((state.pendingTrigger.targetDef || 0) <= 60) {
            actions.push({
              action: {
                type: 'TRIGGER_RUNE',
                playerId: runePlayer.playerId,
                payload: { runeInstanceId: rune.instanceId, activate: true },
              },
              description: \`\${rune.baseCard.name}を発動する\`,
              category: 'RUNE',
            });
          }
        } else if (state.pendingTrigger.triggerType === 'ON_ATTACK') {
          if (rune.cardId === 'B-14' || rune.cardId === 'D-14') {
            actions.push({
              action: {
                type: 'TRIGGER_RUNE',
                playerId: runePlayer.playerId,
                payload: { runeInstanceId: rune.instanceId, activate: true },
              },
              description: \`\${rune.baseCard.name}を発動する\`,
              category: 'RUNE',
            });
          }
        } else if (state.pendingTrigger.triggerType === 'ON_DESTROY' && rune.cardId === 'E-14') {
          actions.push({
            action: {
              type: 'TRIGGER_RUNE',
              playerId: runePlayer.playerId,
              payload: { runeInstanceId: rune.instanceId, activate: true, targetUnitInstanceId: state.pendingTrigger.targetInstanceId },
            },
            description: \`\${rune.baseCard.name}を発動する\`,
            category: 'RUNE',
          });
        } else if (state.pendingTrigger.triggerType === 'ON_ARCANA_SET' && rune.cardId === 'C-14') {
          actions.push({
            action: {
              type: 'TRIGGER_RUNE',
              playerId: runePlayer.playerId,
              payload: { runeInstanceId: rune.instanceId, activate: true },
            },
            description: \`\${rune.baseCard.name}を発動する\`,
            category: 'RUNE',
          });
        }
      }`;

const newRuneActions = `    if (state.phase === 'RUNE_STEP' && state.pendingTrigger) {
      const runePlayer = this.getPlayer(state, state.pendingTrigger.triggeringPlayerId);
      for (const rune of runePlayer.runes) {
        if (state.pendingTrigger.triggerType === 'ON_ENTER' && rune.cardId === 'A-14') {
          if ((state.pendingTrigger.targetDef || 0) <= 60) {
            actions.push({ action: { type: 'TRIGGER_RUNE', playerId: runePlayer.playerId, payload: { runeInstanceId: rune.instanceId, activate: true } }, description: \`\${rune.baseCard.name}を発動する\`, category: 'RUNE' });
          }
        } else if (state.pendingTrigger.triggerType === 'ON_ATTACK') {
          // B-14 triggers on ANY attack. D-14 triggers ONLY if it was a direct attack on the player!
          // We need a way to know if D-14 is valid. Wait, we didn't save targetType in pendingTrigger.
          // Let's add targetType to pendingTrigger, or we can just assume if we are in ON_ATTACK, the trigger logic already validated it (we checked targetType === 'PLAYER' before setting phase!).
          // Actually, if B-14 is present it triggered. If D-14 is present and it triggered, it's valid.
          // Wait, if D-14 is in runes but the attack was on a UNIT, we shouldn't offer D-14!
          // Let's add \`targetId\` or \`targetType\` to pendingTrigger in types/game.ts. But for now, we can check if there's a pendingCombat and if its target is 'PLAYER'.
          const isPlayerTarget = state.pendingCombat && state.pendingCombat.defenderInstanceId === undefined;
          if (rune.cardId === 'B-14') {
            actions.push({ action: { type: 'TRIGGER_RUNE', playerId: runePlayer.playerId, payload: { runeInstanceId: rune.instanceId, activate: true } }, description: \`\${rune.baseCard.name}を発動する\`, category: 'RUNE' });
          } else if (rune.cardId === 'D-14' && isPlayerTarget) {
            actions.push({ action: { type: 'TRIGGER_RUNE', playerId: runePlayer.playerId, payload: { runeInstanceId: rune.instanceId, activate: true } }, description: \`\${rune.baseCard.name}を発動する\`, category: 'RUNE' });
          }
        } else if (state.pendingTrigger.triggerType === 'ON_DESTROY' && rune.cardId === 'E-14') {
          actions.push({ action: { type: 'TRIGGER_RUNE', playerId: runePlayer.playerId, payload: { runeInstanceId: rune.instanceId, activate: true, targetUnitInstanceId: state.pendingTrigger.targetInstanceId } }, description: \`\${rune.baseCard.name}を発動する\`, category: 'RUNE' });
        } else if (state.pendingTrigger.triggerType === 'ON_ARCANA_SET' && rune.cardId === 'C-14') {
          actions.push({ action: { type: 'TRIGGER_RUNE', playerId: runePlayer.playerId, payload: { runeInstanceId: rune.instanceId, activate: true } }, description: \`\${rune.baseCard.name}を発動する\`, category: 'RUNE' });
        }
      }`;
code = code.replace(oldRuneActions, newRuneActions);

fs.writeFileSync('src/engine/gameEngine.ts', code);
console.log("Patched gameEngine for runes");
