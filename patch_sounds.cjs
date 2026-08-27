const fs = require('fs');
let code = fs.readFileSync('src/components/GameBoard.tsx', 'utf8');

const importAudio = "import { audioService } from '../utils/AudioService';\n";
if (!code.includes("AudioService")) {
  code = code.replace("import { GameEngine } from '../engine/gameEngine';", importAudio + "import { GameEngine } from '../engine/gameEngine';");
}

const audioTriggers = `
      // Play Audio based on action
      const actType = action.type;
      if (actType === 'PLAY_UNIT') audioService.playSummon();
      if (actType === 'EVOLVE') audioService.playEvolve();
      if (actType === 'ATTACK') audioService.playAttack();
      if (actType === 'GUARD') audioService.playGuard();
      if (actType === 'PLAY_SPELL') audioService.playSpell();
      if (actType === 'SET_RUNE' || actType === 'TRIGGER_RUNE' || actType === 'PLAY_DOMAIN') audioService.playSpell();
      
      const nextState = engine.applyAction(gameState, action);
      
      // Check if damage or destroy happened by diffing logs?
      // For now, these basic sounds are good enough.
`;

code = code.replace(
  "const nextState = engine.applyAction(gameState, action);",
  audioTriggers + "\n"
);

// Add mute button to Navbar or HUD
const muteButton = `
          {/* Mute Button */}
          <button onClick={() => audioService.toggleMute()} className="ml-2 px-2 py-0.5 text-[10px] border border-stone-600 rounded bg-stone-800 text-stone-300">
            SOUNDS
          </button>
`;

code = code.replace(
  "{/* Player HP / Barrier */}",
  muteButton + "\n          {/* Player HP / Barrier */}"
);

fs.writeFileSync('src/components/GameBoard.tsx', code);
console.log("Patched audio into GameBoard");
