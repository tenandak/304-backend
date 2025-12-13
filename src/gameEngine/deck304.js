export const RANKS = ['7', '8', 'Q', 'K', '10', 'A', '9', 'J'];
export const SUITS = ['spades', 'hearts', 'diamonds', 'clubs'];

export const TRICK_POINT_VALUES = {
  J: 30,
  9: 20,
  A: 11,
  10: 10,
  K: 3,
  Q: 2,
  8: 0,
  7: 0,
};

export const STRENGTH_ORDER = ['J', '9', 'A', '10', 'K', 'Q', '8', '7'];

export function createDeck() {
  return SUITS.flatMap((suit) =>
    RANKS.map((rank) => ({
      id: `${suit}-${rank}`,
      rank,
      suit,
    })),
  );
}

export function shuffleDeck(deck) {
  const shuffled = deck.slice();
  for (let i = shuffled.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}
