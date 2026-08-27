const fs = require('fs');
let code = fs.readFileSync('src/engine/gameEngine.ts', 'utf8');

code = code.replace(
  "  private resetCardState(card: CardInstance): void {",
  "  private resetCardState(card: CardInstance): CardInstance {"
);

code = code.replace(
  "    card.canAttackActiveThisTurn = false;\n  }",
  "    card.canAttackActiveThisTurn = false;\n    return card;\n  }"
);

code = code.replace(/hand\.push\(([^)]+)\)/g, "hand.push(this.resetCardState($1))");
code = code.replace(/archive\.push\(([^)]+)\)/g, "archive.push(this.resetCardState($1))");
// Note: arcana is an array of { instance: CardInstance, isRested: boolean }
code = code.replace(/arcana\.push\({ instance: ([^,]+)/g, "arcana.push({ instance: this.resetCardState($1)");

fs.writeFileSync('src/engine/gameEngine.ts', code);
console.log("Patched moveCardToZone to reset state");
