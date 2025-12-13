export function sanitizeMatchForClient(match) {
  const cloned = JSON.parse(JSON.stringify(match));

  if (!cloned.currentRound) {
    return cloned;
  }

  const round = cloned.currentRound;

  // Provide explicit bidding options to the client.
  if (round.phase === 'first-pass-bidding') {
    const bidding = round.bidding || {};
    const baseAllowed = [70, 80, 90, 100, 250];
    const hasBid = bidding.hasBid === true;

    const teamIdByPlayerId = {};
    for (const t of cloned.teams || []) {
      for (const pid of t.playerIds || []) {
        teamIdByPlayerId[pid] = t.id;
      }
    }

    const order = bidding.order || [];
    const turnIndex = bidding.turnIndex || 0;
    const currentTurnPlayerId =
      hasBid ? null : (bidding.currentTurnPlayerId || (order.length ? order[turnIndex % order.length] : null));

    const startingPlayer = cloned.players.find((p) => p.seatIndex === round.startingPlayerIndex);
    const highestBid = bidding.highestBid;
    const highestBidderId = bidding.bidderId || null;
    const highestBidder = cloned.players.find((p) => p.id === highestBidderId);
    const highestBidderTeamId = highestBidderId ? teamIdByPlayerId[highestBidderId] : null;

    // Allowed bids per player
    const allowedBidValuesByPlayerId = {};
    cloned.players.forEach((p) => {
      let allowed = [...baseAllowed];

      // Before any bid, only the active turn player (or forced partner after partner call) gets options.
      if (!hasBid) {
        const isTurnPlayer = currentTurnPlayerId && p.id === currentTurnPlayerId;
        const isForcedPartner = bidding.partnerCalled && p.id === bidding.partnerForcedId;
        if (!isTurnPlayer && !isForcedPartner) {
          allowedBidValuesByPlayerId[p.id] = [];
          return;
        }
      }

      if (highestBidderId && p.id === highestBidderId) {
        allowed = [];
      } else if (highestBid != null) {
        const sameTeamAsHighest =
          highestBidderTeamId && teamIdByPlayerId[p.id] === highestBidderTeamId;
        const requiredIncrement = sameTeamAsHighest ? 20 : 10;
        allowed = baseAllowed.filter((v) => v >= highestBid + requiredIncrement);
      }
      if (bidding.partnerForcedId === p.id && bidding.hasBid === false) {
        allowed = baseAllowed.filter((v) => v >= 70);
      }
      if (bidding.partnerCallerId === p.id && bidding.partnerCalled) {
        allowed = [];
      }
      allowedBidValuesByPlayerId[p.id] = allowed;
    });

    // Dev sanity: if first bid is 70, ensure non-highest players still have options.
    if (process.env.NODE_ENV !== 'production' && hasBid && highestBidderId && highestBid === 70) {
      cloned.players.forEach((p) => {
        if (p.id === highestBidderId) return;
        const allowed = allowedBidValuesByPlayerId[p.id] || [];
        if (allowed.length === 0) {
          console.warn(
            'biddingOptions: empty allowed bids for player',
            p.id,
            'highestBidder',
            highestBidderId,
            'playerTeam',
            teamIdByPlayerId[p.id],
            'highestTeam',
            highestBidderTeamId,
          );
        }
      });
    }

    const canCallPartner =
      hasBid === false &&
      bidding.partnerCalled !== true &&
      currentTurnPlayerId &&
      startingPlayer &&
      currentTurnPlayerId === startingPlayer.id;

    const canPass =
      hasBid ||
      (bidding.partnerCalled && bidding.partnerForcedId !== currentTurnPlayerId);

    const allowedActions = [];
    // Bid action allowed if not the highest bidder; partner restrictions handled via allowed bids map.
    if (hasBid ? (highestBidderId ? cloned.players.some((p) => p.id !== highestBidderId) : true) : true) {
      allowedActions.push('bid');
    }
    if (canCallPartner) allowedActions.push('partner');
    if (canPass) allowedActions.push('pass');

    round.biddingOptions = {
      phase: bidding.phase || 'first-pass',
      currentTurnPlayerId: hasBid ? null : currentTurnPlayerId,
      allowedActions,
      allowedBidValuesByPlayerId,
      canCallPartner,
      highestBid,
      highestBidderId,
      partnerForcedId: bidding.partnerForcedId || null,
      passedPlayerIdsSinceLastBid: bidding.passedPlayerIdsSinceLastBid || [],
      isOpenBidding: bidding.isOpenBidding === true,
      passesSinceLastBid: bidding.passesSinceLastBid || 0,
    };
  }

  if (round.phase === 'second-pass-bidding') {
    const bidding = round.bidding || {};
    const highestBidderId = bidding.bidderId || null;
    const passed = bidding.secondPassPassedPlayerIds || [];

    const allowedActionsByPlayerId = {};
    cloned.players.forEach((p) => {
      if (p.id === highestBidderId) {
        allowedActionsByPlayerId[p.id] = [];
      } else if (passed.includes(p.id)) {
        allowedActionsByPlayerId[p.id] = [];
      } else {
        allowedActionsByPlayerId[p.id] = ['bid250', 'pass'];
      }
    });

    round.biddingOptions = {
      mode: 'second-pass-bidding',
      highestBid: bidding.highestBid ?? null,
      highestBidderId,
      passedPlayerIds: passed,
      allowedActionsByPlayerId,
    };

    delete round.optionalBiddingOptions;
  }

  if (round.trump) {
    if (round.trump.card) {
      const cardId = round.trump.card.id || null;
      round.trump.card = { hidden: true };
      if (cardId) {
        round.trump.hiddenCardId = cardId;
      }
    }
  }

  if (Array.isArray(round.tricks)) {
    round.tricks = round.tricks.map((trick) => {
      if (!trick || !Array.isArray(trick.cards)) return trick;
      const cards = trick.cards.map((entry) => {
        if (entry && entry.faceDown) {
          return { ...entry, card: { hidden: true } };
        }
        return entry;
      });
      return { ...trick, cards };
    });
  }

  return cloned;
}
