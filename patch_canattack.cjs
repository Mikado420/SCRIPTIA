const fs = require('fs');
let code = fs.readFileSync('src/engine/gameEngine.ts', 'utf8');

code = code.replace(
  "    let canAttack = !unit.baseCard.cantAttack;\n\n    // Apply Temporary/Permanent Buffs on instance",
  "    let canAttack = !unit.baseCard.cantAttack;\n    if (unit.hasSummoningSickness && !unit.baseCard.hasHaste) {\n      canAttack = false;\n    }\n\n    // Apply Temporary/Permanent Buffs on instance"
);

fs.writeFileSync('src/engine/gameEngine.ts', code);
console.log("Patched canAttack");
