export function computeTeamTrickPoints(match) {
  const totals = {};
  match.players.forEach((player) => {
    const teamId = player.teamId;
    totals[teamId] = (totals[teamId] || 0) + (player.trickPoints || 0);
  });
  return totals;
}

const BID_TARGETS = {
  70: 170,
  80: 180,
  90: 190,
  100: 200,
  250: 250,
};

export function getBidTarget(finalBidValue) {
  if (finalBidValue in BID_TARGETS) {
    return BID_TARGETS[finalBidValue];
  }
  // Partner Close placeholder
  return 304;
}

export function applyRoundScoring(match, round) {
  const biddingTeam = match.teams.find((team) => team.playerIds.includes(round.bidding.bidderId));
  if (!biddingTeam) {
    return match;
  }
  const opponentTeam = match.teams.find((team) => team.id !== biddingTeam.id);

  const teamPoints = computeTeamTrickPoints(match);
  const bidderPoints = teamPoints[biddingTeam.id] || 0;
  const target = getBidTarget(round.bidding.finalBidValue || round.bidding.highestBid);

  const bidderSucceeded = bidderPoints >= target;

  const updatedTeams = match.teams.map((team) => {
    if (team.id === biddingTeam.id) {
      const distributorDelta = bidderSucceeded ? 0 : -2;
      const collectorDelta = bidderSucceeded ? 1 : 0;
      return {
        ...team,
        distributor: team.distributor + distributorDelta,
        collector: team.collector + collectorDelta,
      };
    }
    // opponent team
    const distributorDelta = bidderSucceeded ? -1 : 0;
    const collectorDelta = bidderSucceeded ? 0 : 2;
    return {
      ...team,
      distributor: team.distributor + distributorDelta,
      collector: team.collector + collectorDelta,
    };
  });

  let winnerTeamId = match.winnerTeamId;
  updatedTeams.forEach((team) => {
    if (team.distributor <= 0) {
      const otherTeam = updatedTeams.find((t) => t.id !== team.id);
      winnerTeamId = otherTeam ? otherTeam.id : null;
    }
  });

  return {
    ...match,
    teams: updatedTeams,
    winnerTeamId,
  };
}
