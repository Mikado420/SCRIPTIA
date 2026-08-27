const fs = require('fs');
let code = fs.readFileSync('src/engine/gameEngine.ts', 'utf8');

// ON_ATTACK (Player)
code = code.replace(
  /const attackRune = opponent\.runes\.find\(\(r\) => r\.cardId === 'B-14' \|\| r\.cardId === 'D-14'\);\s*if \(attackRune\) \{\s*nextState\.phase = 'RUNE_STEP';\s*nextState\.pendingTrigger = \{\s*triggerType: 'ON_ATTACK',\s*sourceInstanceId: attackRune\.instanceId,/,
  `const hasB14 = opponent.runes.some((r) => r.cardId === 'B-14');
            const hasD14 = opponent.runes.some((r) => r.cardId === 'D-14');
            if (hasB14 || hasD14) {
              nextState.phase = 'RUNE_STEP';
              nextState.pendingTrigger = {
                triggerType: 'ON_ATTACK',`
);

// ON_ATTACK (Unit) - we need to insert the B-14 check here too!
code = code.replace(
  /\} else if \(targetType === 'UNIT' && targetUnitInstanceId\) \{/,
  `} else if (targetType === 'UNIT' && targetUnitInstanceId) {
            const hasB14 = opponent.runes.some((r) => r.cardId === 'B-14');
            if (hasB14) {
              nextState.phase = 'RUNE_STEP';
              nextState.pendingTrigger = {
                triggerType: 'ON_ATTACK',
                triggeringPlayerId: opponent.playerId,
                targetInstanceId: attacker.instanceId,
              };
              nextState.pendingCombat = {
                attackerInstanceId: attacker.instanceId,
                attackerPlayerId: active.playerId,
                targetType: 'UNIT',
                defenderInstanceId: targetUnitInstanceId,
              };
              break;
            }`
);

// ON_DESTROY (E-14)
code = code.replace(
  /const necroRune = owner\.runes\.find\(\(r\) => r\.cardId === 'E-14'\);\s*if \(necroRune && owner\.archive\.some/,
  `const hasE14 = owner.runes.some((r) => r.cardId === 'E-14');
    if (hasE14 && owner.archive.some`
);
code = code.replace(
  /triggerType: 'ON_DESTROY',\s*sourceInstanceId: necroRune\.instanceId,/,
  `triggerType: 'ON_DESTROY',`
);

// ON_ARCANA_SET (C-14)
code = code.replace(
  /const runeC14 = opponent\.runes\.find\(\(r\) => r\.cardId === 'C-14'\);\s*if \(runeC14\) \{\s*nextState\.phase = 'RUNE_STEP';\s*nextState\.pendingTrigger = \{\s*triggerType: 'ON_ARCANA_SET',\s*sourceInstanceId: runeC14\.instanceId,/,
  `const hasC14 = opponent.runes.some((r) => r.cardId === 'C-14');
          if (hasC14) {
            nextState.phase = 'RUNE_STEP';
            nextState.pendingTrigger = {
              triggerType: 'ON_ARCANA_SET',`
);

fs.writeFileSync('src/engine/gameEngine.ts', code);
console.log("Patched gameEngine triggers");
