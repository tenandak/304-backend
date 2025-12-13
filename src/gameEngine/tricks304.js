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

export function playCard(round, match, playerId, { cardId, faceDown = false, isGuess = false } = {}) {
  const roundWithTrick = ensureTrick(round);
  const trick = roundWithTrick.tricks[roundWithTrick.trickIndex];

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

  if ((faceDown || isGuess) && round.trump.revealed) {
    throw new Error('Cannot play face-down or guess after trump is revealed');
  }

  const player = match.players[playerIndex];
  const card = player.hand.find((c) => c.id === cardId);
  if (!card) {
    throw new Error('Card not in hand');
  }

  const hasLedSuit = trick.ledSuit
    ? player.hand.some((c) => c.suit === trick.ledSuit)
    : false;

  if (trick.ledSuit && hasLedSuit && card.suit !== trick.ledSuit) {
    throw new Error('Player must follow suit');
  }

  if (trick.ledSuit && hasLedSuit && faceDown) {
    throw new Error('Cannot play face-down when able to follow suit');
  }

  const updatedLedSuit = trick.ledSuit || (faceDown ? null : card.suit);
  const updatedCards = [
    ...trick.cards,
    { playerId, card, faceDown: !!faceDown, isGuess: !!isGuess },
  ];

  const updatedTrick = { ...trick, ledSuit: updatedLedSuit, cards: updatedCards };
  const updatedTricks = [...roundWithTrick.tricks];
  updatedTricks[roundWithTrick.trickIndex] = updatedTrick;

  const updatedPlayer = { ...player, hand: player.hand.filter((c) => c.id !== cardId) };
  const updatedPlayers = match.players.map((p) => (p.id === playerId ? updatedPlayer : p));

  return {
    round: { ...roundWithTrick, tricks: updatedTricks },
    match: { ...match, players: updatedPlayers },
  };
}

export function resolveTrick(round, match) {
  const roundWithTrick = ensureTrick(round);
  const trick = roundWithTrick.tricks[roundWithTrick.trickIndex];
  const trumpSuit = round.trump?.suit || null;

  let trumpRevealed = round.trump?.revealed || false;

  const processedCards = trick.cards.map((entry) => {
    if (entry.faceDown && entry.isGuess && !trumpRevealed) {
      if (trumpSuit && entry.card.suit === trumpSuit) {
        trumpRevealed = true;
        return { ...entry, faceDown: false, isGuess: false };
      }
      return entry;
    }
    return entry;
  });

  const updatedTrump = { ...round.trump, revealed: round.trump?.revealed || trumpRevealed };

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

  const updatedPlayers = match.players.map((player) => {
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
