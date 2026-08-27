const fs = require('fs');
let code = fs.readFileSync('src/components/GameBoard.tsx', 'utf8');

const audioLogic = `      const prevLogCount = gameState.logs.length;
      const nextState = engine.applyAction(gameState, action);
      const newLogs = nextState.logs.slice(prevLogCount);

      newLogs.forEach(log => {
        if (log.type === 'PLAY') {
           if (log.message.includes('召喚')) audioService.playSummon();
           else audioService.playSpell();
        }
        if (log.type === 'ATTACK') audioService.playAttack();
        if (log.type === 'COMBAT' && log.message.includes('ガード')) audioService.playGuard();
        if (log.type === 'DESTROY') audioService.playDestroy();
        if (log.type === 'DAMAGE' && log.message.includes('結界への攻撃確定')) audioService.playDamage();
        if (log.type === 'RUNE') audioService.playSpell();
      });`;

// Remove the old audio logic
code = code.replace(
  /\/\/ Play Audio based on action[\s\S]*?const nextState = engine\.applyAction\(gameState, action\);[\s\S]*?\/\/ For now, these basic sounds are good enough./,
  audioLogic
);

fs.writeFileSync('src/components/GameBoard.tsx', code);
console.log("Patched gameboard audio");
