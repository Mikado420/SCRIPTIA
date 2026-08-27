const fs = require('fs');
let code = fs.readFileSync('src/engine/gameEngine.ts', 'utf8');

// Update TriggerContext to not require sourceInstanceId
code = code.replace(
  "export interface TriggerContext {\n  triggerType: 'ON_ENTER'",
  "export interface TriggerContext {\n  triggerType: 'ON_ENTER'"
); // Already in types/game.ts

fs.writeFileSync('src/engine/gameEngine.ts', code);
