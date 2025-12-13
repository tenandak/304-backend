const RANKS = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];
const SUITS = ['hearts', 'diamonds', 'clubs', 'spades'];

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

export function dealCards(deck, numPlayers, cardsPerPlayer) {
  const workingDeck = deck.slice();
  const totalNeeded = numPlayers * cardsPerPlayer;

  if (totalNeeded > workingDeck.length) {
    throw new Error('Not enough cards to deal');
  }

  const hands = Array.from({ length: numPlayers }, () => []);
  for (let i = 0; i < totalNeeded; i += 1) {
    const playerIndex = i % numPlayers;
    hands[playerIndex].push(workingDeck[i]);
  }

  const remainingDeck = workingDeck.slice(totalNeeded);
  return { hands, remainingDeck };
}
