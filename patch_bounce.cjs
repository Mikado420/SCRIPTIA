const fs = require('fs');
let code = fs.readFileSync('src/engine/gameEngine.ts', 'utf8');

const resetCode = `
  private resetCardState(card: CardInstance): void {
    card.isRested = false;
    card.hasSummoningSickness = false;
    card.summonedTurn = 0;
    card.buffs = [];
    card.evolvedFrom = undefined;
    card.cannotBeGuardedThisTurn = false;
    card.canAttackActiveThisTurn = false;
  }
`;

if (!code.includes("resetCardState")) {
  code = code.replace(
    "  public getLogs(): GameLogEntry[] {",
    resetCode + "\n  public getLogs(): GameLogEntry[] {"
  );
}

// Now replace all direct zone movements that need resetting.
// Let's first search for "hand.push(" or "archive.push(" which pop/splice from battlefield.
// We can just add "this.resetCardState(returned);" for every occurrence where a card goes to hand/archive.

fs.writeFileSync('src/engine/gameEngine.ts', code);
console.log("Added resetCardState");
