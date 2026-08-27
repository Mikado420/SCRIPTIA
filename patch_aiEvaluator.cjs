const fs = require('fs');
let code = fs.readFileSync('src/engine/aiEvaluator.ts', 'utf8');

const resolveEffectCode = `
      case 'RESOLVE_EFFECT': {
        const payload = act.payload as { doResolve: boolean; effectType: string; targetId?: string };
        if (payload.doResolve) {
          futureValue = 8.0;
          resourceAdvantage = 7.0; // Generally good to resolve C-03 (put card to arcana) if cost allows it.
        } else {
          futureValue = 5.0;
          resourceAdvantage = 5.0;
        }
        break;
      }
`;

code = code.replace(
  "      case 'END_TURN': {",
  resolveEffectCode + "\n      case 'END_TURN': {"
);

fs.writeFileSync('src/engine/aiEvaluator.ts', code);
console.log("Patched aiEvaluator.ts");
