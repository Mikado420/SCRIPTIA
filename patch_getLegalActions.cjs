const fs = require('fs');
let code = fs.readFileSync('src/engine/gameEngine.ts', 'utf8');

const regex = /if \(state\.phase === 'RUNE_STEP' && state\.pendingTrigger\) \{[\s\S]*?(?=\s*\/\/\s*3\.\s*Arcana Placement \(Action Phase\))/;

const newBlock = `if (state.phase === 'RUNE_STEP' && state.pendingTrigger) {
      const runePlayer = this.getPlayer(state, state.pendingTrigger.triggeringPlayerId);
      for (const rune of runePlayer.runes) {
        if (state.pendingTrigger.triggerType === 'ON_ENTER' && rune.cardId === 'A-14') {
          if ((state.pendingTrigger.targetDef || 0) <= 60) {
            actions.push({ action: { type: 'TRIGGER_RUNE', playerId: runePlayer.playerId, payload: { runeInstanceId: rune.instanceId, activate: true } }, description: \`\${rune.baseCard.name}を発動する\`, category: 'RUNE' });
          }
        } else if (state.pendingTrigger.triggerType === 'ON_ATTACK') {
          const isPlayerTarget = state.pendingCombat && state.pendingCombat.targetType === 'PLAYER';
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
      }
      actions.push({
        action: { type: 'TRIGGER_RUNE', playerId: runePlayer.playerId, payload: { activate: false } },
        description: 'ルーンを発動しない',
        category: 'PASS',
      });
    }

`;

code = code.replace(regex, newBlock);
fs.writeFileSync('src/engine/gameEngine.ts', code);
console.log("Patched RUNE_STEP in getLegalActions");
