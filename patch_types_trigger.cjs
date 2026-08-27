const fs = require('fs');
let code = fs.readFileSync('src/types/game.ts', 'utf8');

code = code.replace(
  "  sourceInstanceId: string;",
  "  sourceInstanceId?: string;"
);

fs.writeFileSync('src/types/game.ts', code);
console.log("Patched TriggerContext");
