export function selectTrump(round, match, playerId, { suit, cardId } = {}) {
  if (round.phase !== 'trump-selection') {
    throw new Error('Not in trump selection phase');
  }
  if (!round.bidding || round.bidding.bidderId !== playerId) {
    throw new Error('Only the bidder can select trump');
  }

  const allowedSuits = ['spades', 'hearts', 'diamonds', 'clubs'];
  if (!allowedSuits.includes(suit)) {
    throw new Error('Invalid trump suit');
  }

  const bidderIndex = match.players.findIndex((p) => p.id === playerId);
  if (bidderIndex === -1) {
    throw new Error('Player not found in match');
  }
  const bidder = match.players[bidderIndex];
  const card = bidder.hand.find((c) => c.id === cardId);
  if (!card) {
    throw new Error('Card not found in hand');
  }
  if (card.suit !== suit) {
    throw new Error('Hidden trump card must be of the selected suit');
  }

  const updatedBidder = { ...bidder, hand: bidder.hand.filter((c) => c.id !== cardId) };
  const updatedPlayers = match.players.map((p) => (p.id === playerId ? updatedBidder : p));

  const updatedRound = {
    ...round,
    trump: {
      ...(round.trump || {}),
      suit,
      card,
      revealed: false,
    },
    phase: 'second-pass-deal',
  };

  const updatedMatch = { ...match, players: updatedPlayers };

  return { round: updatedRound, match: updatedMatch };
}

export function openTrump(round) {
  return {
    ...round,
    trump: { ...(round.trump || {}), revealed: true },
  };
}
