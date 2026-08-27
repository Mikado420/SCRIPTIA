const fs = require('fs');
let code = fs.readFileSync('src/engine/gameEngine.ts', 'utf8');

code = code.replace(
  "opponent.archive.push(this.resetCardState(opponent.domain));",
  "opponent.archive.push(this.resetCardState(opponent.domain!));"
);

// also let's make sure resetCardState handles nulls safely just in case
code = code.replace(
  "  private resetCardState(card: CardInstance): CardInstance {\n    card.isRested = false;",
  "  private resetCardState(card: CardInstance): CardInstance {\n    if (!card) return card;\n    card.isRested = false;"
);

fs.writeFileSync('src/engine/gameEngine.ts', code);
