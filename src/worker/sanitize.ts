import { GameState, PlayerId, CardInstance } from '../types/game';

function createHiddenCardInstance(c: CardInstance, cardType: 'UNIT' | 'RUNE' = 'UNIT', name = 'Hidden Card'): CardInstance {
  return {
    instanceId: c.instanceId,
    cardId: 'HIDDEN',
    ownerId: c.ownerId,
    currentCost: 0,
    currentAtk: 0,
    currentDef: 0,
    currentBrk: 0,
    isRested: c.isRested || false,
    summonedTurn: c.summonedTurn || 0,
    hasSummoningSickness: false,
    buffs: [],
    baseCard: {
      cardId: 'HIDDEN',
      name,
      cardType,
      faction: 'NEUTRAL',
      factionName: '無',
      cost: 0,
      atk: 0,
      def: 0,
      brk: 0,
      effectsText: '',
      effectKeywords: [],
    },
  };
}

/**
 * Sanitizes GameState for a specific player to prevent information leakage.
 * - Masks opponent's hand and deck contents while preserving count/instanceId.
 * - Masks opponent's face-down rune details.
 */
export function sanitizeGameState(state: GameState, playerId: PlayerId): GameState {
  const safeState: GameState = JSON.parse(JSON.stringify(state));
  const opponentRole = playerId === 'PLAYER_A' ? 'playerB' : 'playerA';
  const opponent = safeState[opponentRole];

  if (opponent) {
    // Hide deck cards
    opponent.deck = opponent.deck.map((c: CardInstance) => createHiddenCardInstance(c, 'UNIT', 'Hidden Card'));

    // Hide hand cards
    opponent.hand = opponent.hand.map((c: CardInstance) => createHiddenCardInstance(c, 'UNIT', 'Hidden Card'));

    // Hide opponent face-down runes
    if (opponent.runes && opponent.runes.length > 0) {
      opponent.runes = opponent.runes.map((r: CardInstance) => createHiddenCardInstance(r, 'RUNE', '伏せルーン'));
    }
  }

  return safeState;
}
