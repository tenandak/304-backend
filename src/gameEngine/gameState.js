export function createPlayer({ id, name, seatIndex, teamId }) {
  return {
    id,
    name,
    seatIndex,
    teamId,
    hand: [],
    trickPoints: 0,
    tricksWonCount: 0,
  };
}

export function createTeam({ id, playerIds }) {
  return {
    id,
    playerIds,
    collector: 0,
    distributor: 10,
  };
}

export function createMatch({ id, players, teams, dealerIndex }) {
  return {
    id,
    players,
    teams,
    dealerIndex,
    currentRound: null,
    winnerTeamId: null,
  };
}

export function createEmptyRound({ id, dealerIndex }) {
  return {
    id,
    dealerIndex,
    startingPlayerIndex: (dealerIndex + 1) % 4,
    phase: 'first-pass-deal',
    bidding: {
    phase: 'first-pass',
      // track bidding history state
      passedPlayerIdsSinceLastBid: [],
      isOpenBidding: false,
      order: [],
      turnIndex: 0,
      currentTurnPlayerId: null,
      hasBid: false,
      passesSinceLastBid: 0,
      partnerCallerId: null,
      partnerCalled: false,
      bids: [],
      highestBid: null,
      bidderId: null,
      partnerForcedId: null,
      finalBidValue: null,
    },
    trump: {
      suit: null,
      card: null,
      revealed: false,
    },
    trickIndex: 0,
    tricks: [],
  };
}

export function getTeamForPlayer(match, playerId) {
  return match.teams.find((team) => team.playerIds.includes(playerId)) || null;
}

export function getOpponentTeam(match, teamId) {
  return match.teams.find((team) => team.id !== teamId) || null;
}
