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
  110: 210,
  120: 220,
  130: 230,
  140: 240,
  150: 250,
  160: 260,
  170: 270,
  180: 280,
  190: 290,
  200: 300,
  210: 310,
  220: 320,
  230: 330,
  240: 340,
  250: 250,
  260: 260,
  270: 270,
  280: 280,
  290: 290,
  300: 300,
  304: 304,
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

  const teamPoints = computeTeamTrickPoints(match);
  const bidderPoints = teamPoints[biddingTeam.id] || 0;
  const target = getBidTarget(round.bidding.finalBidValue || round.bidding.highestBid);

  const bidderSucceeded = bidderPoints >= target;

  const bidValue = round.bidding.finalBidValue || round.bidding.highestBid || 0;
  let collectorDeltaWin = 0;
  let distributorDeltaLose = 0;
  let opponentCollectorOnLose = 0;
  if (bidValue >= 70 && bidValue <= 90) {
    collectorDeltaWin = 1;
    distributorDeltaLose = -2;
    opponentCollectorOnLose = 2;
  } else if (bidValue >= 100 && bidValue <= 240) {
    collectorDeltaWin = 2;
    distributorDeltaLose = -3;
    opponentCollectorOnLose = 3;
  } else if (bidValue >= 250 && bidValue <= 304) {
    collectorDeltaWin = 3;
    distributorDeltaLose = -4;
    opponentCollectorOnLose = 4;
  }

  const updatedTeams = match.teams.map((team) => {
    if (team.id === biddingTeam.id) {
      const distributorDelta = bidderSucceeded ? 0 : distributorDeltaLose;
      const collectorDelta = bidderSucceeded ? collectorDeltaWin : 0;
      return {
        ...team,
        distributor: team.distributor + distributorDelta,
        collector: team.collector + collectorDelta,
      };
    }
    // opponent team
    const distributorDelta = 0;
    const collectorDelta = bidderSucceeded ? 0 : opponentCollectorOnLose;
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
