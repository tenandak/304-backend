export function selectTrump(round, { suit, card } = {}) {
  return {
    ...round,
    trump: {
      ...(round.trump || {}),
      suit: suit || null,
      card: card || null,
      revealed: round.trump?.revealed || false,
    },
    phase: round.phase === 'trump-selection' ? 'trump-selection' : round.phase,
  };
}

export function openTrump(round) {
  return {
    ...round,
    trump: { ...(round.trump || {}), revealed: true },
  };
}
