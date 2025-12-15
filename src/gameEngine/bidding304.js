import { getTeamForPlayer } from './gameState.js';

const FIRST_PASS_ALLOWED = [
  70, 80, 90, 100, 110, 120, 130, 140, 150, 160, 170, 180, 190, 200, 210, 220, 230, 240, 250, 260,
  270, 280, 290, 300, 304,
];
const SECOND_PASS_ALLOWED = [250, 260, 270, 280, 290, 300, 304];

export function placeFirstPassBid(round, match, playerId, payload = {}) {
  if (round.phase !== 'first-pass-bidding') {
    throw new Error('Not in first-pass bidding phase');
  }

  const player = match.players.find((p) => p.id === playerId);
  if (!player) {
    throw new Error('Player not found in match');
  }

  const bidding = round.bidding || {};
  const bids = [...(bidding.bids || [])];
  const order = bidding.order || [];
  const { type, value } = payload;

  const hasBid = bidding.hasBid === true;
  const enforceTurn = hasBid === false;
  if (enforceTurn && bidding.currentTurnPlayerId && bidding.currentTurnPlayerId !== playerId) {
    throw new Error('Not your turn to bid');
  }

  if (!['bid', 'partner', 'pass'].includes(type)) {
    throw new Error('Invalid bid type');
  }

  const playerTeam = getTeamForPlayer(match, playerId);
  const highestBid = bidding.highestBid;
  const highestBidderId = bidding.bidderId;
  const highestBidder = match.players.find((p) => p.id === highestBidderId) || null;
  const highestBidderTeam = highestBidder ? getTeamForPlayer(match, highestBidderId) : null;
  const isStartingPlayer = player.seatIndex === round.startingPlayerIndex;

  // No passing before any bid/partner call; starter must bid or call partner.
  if (type === 'pass' && bidding.hasBid === false && bidding.partnerCalled !== true) {
    throw new Error('Cannot pass before any bid');
  }

  // Partner caller cannot bid again in first pass.
  if (bidding.partnerCallerId === playerId && bidding.partnerCalled && type === 'bid') {
    throw new Error('Partner caller cannot bid in first pass');
  }

  // Partner forced player must bid >= 70 before any other action.
  if (bidding.partnerForcedId === playerId && hasBid === false) {
    if (type !== 'bid' || value < 70) {
      throw new Error('Partner-forced player must bid at least 70');
    }
  }

  // Partner call rules.
  if (type === 'partner') {
    if (bidding.hasBid || bidding.partnerCalled || !isStartingPlayer) {
      throw new Error('Only the starting player can call partner before any bid');
    }
    const team = playerTeam;
    if (!team) {
      throw new Error('Player has no team');
    }
    const partnerId = team.playerIds.find((id) => id !== playerId) || null;
    if (!partnerId) {
      throw new Error('No partner available to force');
    }
    const updatedBidding = {
      ...bidding,
      partnerCalled: true,
      partnerCallerId: playerId,
      partnerForcedId: partnerId,
      bids: [...bids, { playerId, type: 'partner' }],
      // Calling partner counts as this player's pass for this round of bidding.
      passedPlayerIdsSinceLastBid: [...(bidding.passedPlayerIdsSinceLastBid || []), playerId],
      passesSinceLastBid: (bidding.passesSinceLastBid || 0) + 1,
    };

    // Force the partner to act next if they are in the order.
    const forcedIndex = order.findIndex((id) => id === partnerId);
    const nextTurnIndex =
      forcedIndex !== -1 ? forcedIndex : (bidding.turnIndex + 1) % (order.length || 1);
    return {
      ...round,
      bidding: {
        ...updatedBidding,
        turnIndex: nextTurnIndex,
        // After first bid, bidding is open; stop enforcing turn.
        currentTurnPlayerId: null,
      },
    };
  }

  if (type === 'bid') {
    if (!FIRST_PASS_ALLOWED.includes(value)) {
      throw new Error('Bid value not allowed');
    }
    if (highestBidderId && highestBidderId === playerId) {
      throw new Error('Player cannot overbid their own bid');
    }

    let requiredIncrement = 0;
    if (highestBid != null && highestBidderId) {
      const sameTeam = highestBidderTeam && playerTeam && highestBidderTeam.id === playerTeam.id;
      requiredIncrement = sameTeam ? 20 : 10;
    }

    if (highestBid != null && value < highestBid + requiredIncrement) {
      throw new Error('Bid must be higher');
    }

    const updatedBidding = {
      ...bidding,
      bids: [...bids, { playerId, type: 'bid', value }],
      highestBid: value,
      bidderId: playerId,
      hasBid: true,
      isOpenBidding: true,
      passesSinceLastBid: 0,
      // Preserve any prior passes (e.g., partner caller treated as pass)
      passedPlayerIdsSinceLastBid: [...(bidding.passedPlayerIdsSinceLastBid || [])],
    };

    // If 250 is placed, end immediately.
    if (value === 250) {
      return {
        ...round,
        phase: 'trump-selection',
        bidding: {
          ...updatedBidding,
          phase: 'done',
          currentTurnPlayerId: null,
        },
      };
    }

    const nextTurnIndex = (bidding.turnIndex + 1) % (order.length || 1);
    return {
      ...round,
      bidding: {
        ...updatedBidding,
        turnIndex: nextTurnIndex,
        // After first bid, bidding is open; stop enforcing turn.
        currentTurnPlayerId: null,
      },
    };
  }

  // Pass handling
  if (hasBid) {
    if (playerId === highestBidderId) {
      throw new Error('Highest bidder cannot pass');
    }
    const passed = new Set(bidding.passedPlayerIdsSinceLastBid || []);
    passed.add(playerId);
    const passedList = Array.from(passed);
    const updatedBidding = {
      ...bidding,
      bids: [...bids, { playerId, type: 'pass' }],
      passedPlayerIdsSinceLastBid: passedList,
      passesSinceLastBid: passedList.length,
      isOpenBidding: true,
    };

    const shouldEnd = updatedBidding.highestBid != null && passedList.length >= 3;
    if (shouldEnd) {
      return {
        ...round,
        phase: 'trump-selection',
        bidding: {
          ...updatedBidding,
          phase: 'done',
          currentTurnPlayerId: null,
        },
      };
    }

    const nextTurnIndex = (bidding.turnIndex + 1) % (order.length || 1);
    return {
      ...round,
      bidding: {
        ...updatedBidding,
        turnIndex: nextTurnIndex,
        currentTurnPlayerId: null,
      },
    };
  }

  // Before any bid: passing only allowed after partner call and not for forced partner.
  const updatedBidding = {
    ...bidding,
    bids: [...bids, { playerId, type: 'pass' }],
    passedPlayerIdsSinceLastBid: bidding.passedPlayerIdsSinceLastBid || [],
    passesSinceLastBid: bidding.passesSinceLastBid || 0,
  };

  const nextTurnIndex = (bidding.turnIndex + 1) % (order.length || 1);
  return {
    ...round,
    bidding: {
      ...updatedBidding,
      turnIndex: nextTurnIndex,
      currentTurnPlayerId: order[nextTurnIndex] || null,
    },
  };
}

export function finishFirstPassBidding(round) {
  return {
    ...round,
    phase: 'trump-selection',
    bidding: { ...(round.bidding || {}), phase: 'done' },
  };
}

export function placeSecondPassBid(round, match, playerId, payload = {}) {
  if (round.phase !== 'second-pass-bidding') {
    throw new Error('Not in optional bidding phase');
  }

  const bidding = round.bidding || {};
  const highestBidderId = bidding.bidderId || null;
  const currentHighest = bidding.highestBid || 0;
  const maxOverride = SECOND_PASS_ALLOWED[SECOND_PASS_ALLOWED.length - 1];
  const playerTeam = getTeamForPlayer(match, playerId);
  const highestBidder = highestBidderId ? match.players.find((p) => p.id === highestBidderId) : null;
  const highestTeam = highestBidder ? getTeamForPlayer(match, highestBidderId) : null;

  if (playerId === highestBidderId) {
    throw new Error('Highest bidder cannot override or pass in second-pass bidding');
  }

  const { type, value } = payload;
  if (type === 'bid') {
    if (!SECOND_PASS_ALLOWED.includes(value)) throw new Error('Invalid override bid value');
    let requiredIncrement = currentHighest > 0 ? 10 : 0;
    if (currentHighest > 0 && highestTeam && playerTeam && highestTeam.id === playerTeam.id) {
      requiredIncrement = 20;
    }
    if (currentHighest > 0 && value < currentHighest + requiredIncrement) {
      throw new Error('Override bid must be higher than current bid');
    }
  } else if (type === 'pass') {
    // ok
  } else {
    throw new Error('Invalid override bid type');
  }

  // Handle bid 250
  if (type === 'bid') {
    // Return hidden trump to previous bidder's hand if present.
    let updatedPlayers = match.players;
    const trumpCard = round.trump?.card || null;
    if (highestBidderId && trumpCard) {
      updatedPlayers = match.players.map((p) => {
        if (p.id !== highestBidderId) return p;
        return { ...p, hand: [...(p.hand || []), trumpCard] };
      });
    }

    const biddingUpdate = {
      ...(round.bidding || {}),
      highestBid: value,
      bidderId: playerId,
      finalBidValue: value,
      secondPassPassedPlayerIds: [],
    };

    const finalized = value >= maxOverride;
    const updatedRound = {
      ...round,
      trump: { suit: null, card: null, revealed: false },
      phase: finalized ? 'trump-selection' : 'second-pass-bidding',
      bidding: finalized ? { ...biddingUpdate, phase: 'done' } : biddingUpdate,
    };

    const updatedMatch = { ...match, players: updatedPlayers };
    return { round: updatedRound, match: updatedMatch };
  }

  // Handle pass
  const passed = new Set(bidding.secondPassPassedPlayerIds || []);
  passed.add(playerId);
  const passedList = Array.from(passed);

  const updatedBidding = {
    ...(round.bidding || {}),
    secondPassPassedPlayerIds: passedList,
  };

  // All three non-highest players have passed
  const nonHighestCount = Math.max((match.players?.length || 0) - 1, 0);
  const everyoneElsePassed = nonHighestCount > 0 && passedList.length >= nonHighestCount;
  const updatedRound = {
    ...round,
    phase: everyoneElsePassed ? 'tricks-hidden-trump' : 'second-pass-bidding',
    bidding: updatedBidding,
  };

  return { round: updatedRound, match };
}
