const fs = require('fs');
let code = fs.readFileSync('src/components/GameBoard.tsx', 'utf8');

code = code.replace(
  "const prevLogCount = gameState.logs.length;\n      const nextState = engine.applyAction(gameState, action);\n      const newLogs = nextState.logs.slice(prevLogCount);",
  "const prevLogCount = engine.getLogs().length;\n      const nextState = engine.applyAction(gameState, action);\n      const newLogs = engine.getLogs().slice(prevLogCount);"
);

fs.writeFileSync('src/components/GameBoard.tsx', code);
console.log("Patched gameboard audio fix");
