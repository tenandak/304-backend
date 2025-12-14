import { TRICK_POINT_VALUES, STRENGTH_ORDER } from './deck304.js';
import { getTeamForPlayer } from './gameState.js';

const TRICK_SIZE = 8;

function ensureTrick(round) {
  const tricks = round.tricks ? [...round.tricks] : [];
  if (!tricks[round.trickIndex]) {
    tricks[round.trickIndex] = {
      index: round.trickIndex,
      cards: [],
      ledSuit: null,
      winnerPlayerId: null,
    };
  }
  return { ...round, tricks };
}

export function startTrick(round) {
  return ensureTrick(round);
}

export function getPlayableCards(round, match, playerId) {
  const roundWithTrick = ensureTrick(round);
  const trick = roundWithTrick.tricks[roundWithTrick.trickIndex];

  const player = (match.players || []).find((p) => p.id === playerId);
  if (!player) {
    throw new Error('Player not found');
  }

  const hand = player.hand || [];
  const hiddenTrump =
    round.trump?.card?.id && round.trump?.card?.suit
      ? round.trump.card
      : round.trump?.hiddenCardId && round.trump?.suit
        ? { id: round.trump.hiddenCardId, suit: round.trump.suit }
        : null;
  const isBidder = round.bidding?.bidderId && round.bidding.bidderId === playerId;
  const available = isBidder && hiddenTrump ? [...hand, hiddenTrump] : hand;
  // Guard against duplicate ids in available.
  const seenIds = new Set();
  available.forEach((c) => {
    if (seenIds.has(c.id)) {
      throw new Error('Card appears more than once in available set');
    }
    seenIds.add(c.id);
  });
  const ledSuit = trick.ledSuit || null;
  const hasLedSuit = ledSuit ? available.some((c) => c.suit === ledSuit) : false;

  const trumpRevealed = !!round.trump?.revealed;
  let playableCardIds = [];
  let faceDownPlayableCardIds = [];

  if (!ledSuit) {
    playableCardIds = available.map((c) => c.id);
    faceDownPlayableCardIds = []; // leader must play face-up to set led suit
  } else if (hasLedSuit) {
    playableCardIds = available.filter((c) => c.suit === ledSuit).map((c) => c.id);
    faceDownPlayableCardIds = [];
  } else {
    // No led suit: if trump hidden, must play face-down; otherwise any card face-up.
    playableCardIds = trumpRevealed ? available.map((c) => c.id) : [];
    faceDownPlayableCardIds = trumpRevealed ? [] : available.map((c) => c.id);
  }

  return { playableCardIds, faceDownPlayableCardIds };
}

export function playCard(round, match, playerId, { cardId, faceDown = false, isGuess = false } = {}) {
  const roundWithTrick = ensureTrick(round);
  const trick = roundWithTrick.tricks[roundWithTrick.trickIndex];

  // Guard: trick cannot exceed player count.
  if (trick.cards && trick.cards.length >= match.players.length) {
    throw new Error('Trick is already full');
  }

  const playerIndex = match.players.findIndex((p) => p.id === playerId);
  if (playerIndex === -1) {
    throw new Error('Player not found');
  }

  const expectedSeat =
    (round.startingPlayerIndex + (trick.cards ? trick.cards.length : 0)) % match.players.length;
  const playerSeat = match.players[playerIndex].seatIndex;
  if (playerSeat !== expectedSeat) {
    throw new Error("Not this player's turn");
  }

  if (!trick.ledSuit && (faceDown || isGuess)) {
    throw new Error('Cannot lead a trick face-down');
  }
  if ((faceDown || isGuess) && round.trump.revealed) {
    throw new Error('Cannot play face-down or guess after trump is revealed');
  }

  const player = match.players[playerIndex];
  const hiddenTrumpCard =
    round.trump?.card && round.trump.card.id ? round.trump.card : null;
  const isBidder = round.bidding?.bidderId && round.bidding.bidderId === playerId;
  const availableCards = isBidder && hiddenTrumpCard ? [...player.hand, hiddenTrumpCard] : player.hand;
  // Ensure no duplicate ids.
  const seenIds = new Set();
  availableCards.forEach((c) => {
    if (seenIds.has(c.id)) {
      throw new Error('Card appears more than once in available set');
    }
    seenIds.add(c.id);
  });
  const card = availableCards.find((c) => c.id === cardId);
  if (!card) {
    throw new Error('Card not in hand');
  }

  const hasLedSuit = trick.ledSuit ? availableCards.some((c) => c.suit === trick.ledSuit) : false;

  if (trick.ledSuit && hasLedSuit && card.suit !== trick.ledSuit) {
    throw new Error('Player must follow suit');
  }

  if (trick.ledSuit && hasLedSuit && faceDown) {
    throw new Error('Cannot play face-down when able to follow suit');
  }
  if (trick.ledSuit && !hasLedSuit && !round.trump?.revealed && !faceDown) {
    throw new Error('Must play face-down when void in led suit and trump hidden');
  }

  const updatedLedSuit = trick.ledSuit || (faceDown ? null : card.suit);
  const updatedCards = [
    ...trick.cards,
    { playerId, card, faceDown: !!faceDown, isGuess: !!isGuess },
  ];

  const updatedTrick = { ...trick, ledSuit: updatedLedSuit, cards: updatedCards };
  const updatedTricks = [...roundWithTrick.tricks];
  updatedTricks[roundWithTrick.trickIndex] = updatedTrick;

  const isHiddenTrump = hiddenTrumpCard && hiddenTrumpCard.id === cardId;
  const updatedPlayer = { ...player, hand: player.hand.filter((c) => c.id !== cardId) };
  if (player.hand.length !== updatedPlayer.hand.length + 1 && !isHiddenTrump) {
    throw new Error('Hand size inconsistency after play');
  }
  const updatedPlayers = match.players.map((p) => (p.id === playerId ? updatedPlayer : p));

  const updatedTrump = isHiddenTrump
    ? { ...(round.trump || {}), card: null, hiddenCardId: null, revealed: true }
    : round.trump;

  return {
    round: { ...roundWithTrick, tricks: updatedTricks, trump: updatedTrump },
    match: { ...match, players: updatedPlayers },
  };
}

export function resolveTrick(round, match) {
  const roundWithTrick = ensureTrick(round);
  const trick = roundWithTrick.tricks[roundWithTrick.trickIndex];
  const trumpSuit = round.trump?.suit || null;

  let trumpRevealed = round.trump?.revealed || false;
  let updatedPlayersForTrump = match.players;
  let trumpCardReturned = false;

  const processedCards = trick.cards.map((entry) => {
    if (entry.faceDown && entry.isGuess && !trumpRevealed) {
      if (trumpSuit && entry.card.suit === trumpSuit) {
        trumpRevealed = true;
        // Return hidden trump card to bidder's hand when revealed by guess.
        if (round.trump?.card && round.bidding?.bidderId) {
          updatedPlayersForTrump = match.players.map((p) => {
            if (p.id !== round.bidding.bidderId) return p;
            return { ...p, hand: [...(p.hand || []), round.trump.card] };
          });
          trumpCardReturned = true;
        }
        return { ...entry, faceDown: false, isGuess: false };
      }
      return entry;
    }
    return entry;
  });

  const updatedTrump = trumpCardReturned
    ? { ...(round.trump || {}), revealed: true, card: null, hiddenCardId: null }
    : { ...round.trump, revealed: round.trump?.revealed || trumpRevealed };

  const determineGroup = (entry) => {
    if (!entry.faceDown && trumpSuit && entry.card.suit === trumpSuit) return 1;
    if (!entry.faceDown && trick.ledSuit && entry.card.suit === trick.ledSuit) return 2;
    if (!entry.faceDown) return 3;
    return 4;
  };

  const strengthValue = (rank) => {
    const idx = STRENGTH_ORDER.indexOf(rank);
    return idx === -1 ? Number.MAX_SAFE_INTEGER : idx;
  };

  let winningEntry = null;
  processedCards.forEach((entry) => {
    if (!winningEntry) {
      winningEntry = entry;
      return;
    }
    const currentGroup = determineGroup(entry);
    const bestGroup = determineGroup(winningEntry);

    if (currentGroup < bestGroup) {
      winningEntry = entry;
      return;
    }
    if (currentGroup > bestGroup) {
      return;
    }

    const currentStrength = entry.faceDown ? Number.MAX_SAFE_INTEGER : strengthValue(entry.card.rank);
    const bestStrength = winningEntry.faceDown
      ? Number.MAX_SAFE_INTEGER
      : strengthValue(winningEntry.card.rank);
    if (currentStrength < bestStrength) {
      winningEntry = entry;
    }
  });

  const trickPoints = processedCards.reduce(
    (sum, entry) => sum + (TRICK_POINT_VALUES[entry.card.rank] || 0),
    0,
  );

  const winningPlayerId = winningEntry ? winningEntry.playerId : null;
  const winningPlayer = match.players.find((p) => p.id === winningPlayerId) || null;
  const winningTeam = winningPlayerId ? getTeamForPlayer(match, winningPlayerId) : null;

  const updatedPlayersBase = updatedPlayersForTrump || match.players;
  const updatedPlayers = updatedPlayersBase.map((player) => {
    if (player.id !== winningPlayerId) return player;
    return {
      ...player,
      trickPoints: player.trickPoints + trickPoints,
      tricksWonCount: (player.tricksWonCount || 0) + 1,
    };
  });

  const updatedTeams = match.teams
    ? match.teams.map((team) => {
        if (winningTeam && team.id === winningTeam.id) {
          return { ...team, trickPoints: (team.trickPoints || 0) + trickPoints };
        }
        return team;
      })
    : match.teams;

  const winningSeatIndex = winningPlayer ? winningPlayer.seatIndex : round.startingPlayerIndex;

  const resolvedTrick = {
    ...trick,
    cards: processedCards,
    winnerPlayerId: winningPlayerId,
  };
  const updatedTricks = [...roundWithTrick.tricks];
  updatedTricks[roundWithTrick.trickIndex] = resolvedTrick;

  const nextTrickIndex = roundWithTrick.trickIndex + 1;
  const isRoundOver = nextTrickIndex >= TRICK_SIZE;

  const updatedRound = {
    ...roundWithTrick,
    tricks: updatedTricks,
    trickIndex: nextTrickIndex,
    startingPlayerIndex: winningSeatIndex,
    trump: updatedTrump,
    phase: isRoundOver ? 'scoring' : roundWithTrick.phase,
  };

  const updatedMatch = {
    ...match,
    players: updatedPlayers,
    teams: updatedTeams,
  };

  return { round: updatedRound, match: updatedMatch };
}
