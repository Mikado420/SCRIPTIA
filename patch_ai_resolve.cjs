const fs = require('fs');
let code = fs.readFileSync('src/engine/aiEvaluator.ts', 'utf8');

const oldResolve = `      case 'RESOLVE_EFFECT': {
        const payload = act.payload as { doResolve: boolean; effectType: string; targetId?: string };
        if (payload.doResolve) {
          futureValue = 8.0;
          resourceAdvantage = 7.0; // Generally good to resolve C-03 (put card to arcana) if cost allows it.
        } else {
          futureValue = 2.0;
        }
        break;
      }`;

const newResolve = `      case 'RESOLVE_EFFECT': {
        const payload = act.payload as { doResolve: boolean; effectType: string; targetId?: string };
        if (payload.doResolve && payload.effectType === 'C_03_ARCANA' && payload.targetId) {
          // AI Logic: Prefer discarding high cost cards or off-color cards to arcana.
          const cardInHand = state.players[aiPlayerId].hand.find(c => c.instanceId === payload.targetId);
          if (cardInHand) {
             const cost = cardInHand.baseCard.cost;
             futureValue = 5.0 + (cost * 0.5); // Higher cost is slightly preferred to discard
             resourceAdvantage = 5.0; 
          } else {
             futureValue = 5.0;
          }
        } else {
          futureValue = 2.0;
        }
        break;
      }`;

code = code.replace(oldResolve, newResolve);
fs.writeFileSync('src/engine/aiEvaluator.ts', code);
console.log("Patched aiEvaluator for RESOLVE_EFFECT");
