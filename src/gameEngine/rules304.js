import { createTeam, createMatch, createEmptyRound } from './gameState.js';
import { createDeck, shuffleDeck } from './deck304.js';
import { placeFirstPassBid, placeSecondPassBid } from './bidding304.js';
import { selectTrump, openTrump } from './trump304.js';
import { startTrick, playCard as playTrickCard, resolveTrick } from './tricks304.js';
import { applyRoundScoring } from './scoring304.js';

const TEAM_A_ID = 'teamA';
const TEAM_B_ID = 'teamB';
const ROUND_ID_PREFIX = 'round-';
const MATCH_ID_PREFIX = 'match-';
const FIRST_PASS_CARDS = 4;

export function startMatch(players) {
  const teamAPlayers = players.filter((p) => p.seatIndex === 0 || p.seatIndex === 2);
  const teamBPlayers = players.filter((p) => p.seatIndex === 1 || p.seatIndex === 3);

  const augmentedPlayers = players.map((player) => ({
    ...player,
    teamId: player.seatIndex === 0 || player.seatIndex === 2 ? TEAM_A_ID : TEAM_B_ID,
    hand: player.hand || [],
  }));

  const teamA = createTeam({
    id: TEAM_A_ID,
    playerIds: teamAPlayers.map((p) => p.id),
  });
  const teamB = createTeam({
    id: TEAM_B_ID,
    playerIds: teamBPlayers.map((p) => p.id),
  });

  const match = createMatch({
    id: `${MATCH_ID_PREFIX}${Date.now()}`,
    players: augmentedPlayers,
    teams: [teamA, teamB],
    dealerIndex: 0,
  });

  return { match };
}

export function startRound(match) {
  const deck = shuffleDeck(createDeck());
  const round = createEmptyRound({
    id: `${ROUND_ID_PREFIX}${Date.now()}`,
    dealerIndex: match.dealerIndex,
  });

  const updatedPlayers = match.players.map((player) => ({
    ...player,
    hand: [],
    trickPoints: 0,
    tricksWonCount: 0,
  }));
  const totalToDeal = updatedPlayers.length * FIRST_PASS_CARDS;
  for (let i = 0; i < totalToDeal; i += 1) {
    const playerIndex = i % updatedPlayers.length;
    const card = deck[i];
    updatedPlayers[playerIndex].hand.push(card);
  }

  const remainingDeck = deck.slice(totalToDeal);

  // Establish bidding turn order starting from startingPlayerIndex (dealer + 1) and going clockwise.
  const seatOrder = Array.from({ length: updatedPlayers.length }, (_, idx) => (round.startingPlayerIndex + idx) % updatedPlayers.length);
  const biddingOrder = seatOrder
    .map((seatIdx) => updatedPlayers.find((p) => p.seatIndex === seatIdx))
    .filter(Boolean)
    .map((p) => p.id);

  const initializedRound = startTrick({
    ...round,
    phase: 'first-pass-bidding',
    bidding: {
      ...(round.bidding || {}),
      phase: 'first-pass',
      order: biddingOrder,
      turnIndex: 0,
      currentTurnPlayerId: biddingOrder[0] || null,
      hasBid: false,
      passesSinceLastBid: 0,
    },
    deck: remainingDeck,
  });

  const updatedMatch = {
    ...match,
    players: updatedPlayers,
    currentRound: initializedRound,
  };

  return updatedMatch;
}

export function applyAction(match, playerId, action = {}) {
  if (!match.currentRound) {
    return { match };
  }

  const payload = action.payload || action;
  let updatedMatch = { ...match };
  let updatedRound = { ...match.currentRound };

  switch (action.type) {
    case 'PLACE_FIRST_BID':
      // Pass payload through (supports bid, partner, pass)
      updatedRound = placeFirstPassBid(updatedRound, updatedMatch, playerId, payload);
      break;
    case 'PLACE_SECOND_PASS_BID':
      {
        const result = placeSecondPassBid(updatedRound, updatedMatch, playerId, payload);
        updatedRound = result.round;
        updatedMatch = result.match;
      }
      break;
    case 'SELECT_TRUMP': {
      const result = selectTrump(updatedRound, updatedMatch, playerId, payload);
      updatedRound = result.round;
      updatedMatch = result.match;
      break;
    }
    case 'PLAY_CARD': {
      const result = playTrickCard(updatedRound, updatedMatch, playerId, payload);
      updatedRound = result.round;
      updatedMatch = { ...updatedMatch, ...result.match };
      break;
    }
    case 'PLAY_GUESS_FACE_DOWN': {
      const result = playTrickCard(updatedRound, updatedMatch, playerId, {
        ...payload,
        faceDown: true,
        isGuess: true,
      });
      updatedRound = result.round;
      updatedMatch = { ...updatedMatch, ...result.match };
      break;
    }
    case 'OPEN_TRUMP':
      if (updatedRound.phase !== 'tricks-hidden-trump') {
        throw new Error('Trump cannot be opened in this phase');
      }
      if (updatedRound.trump?.revealed) {
        throw new Error('Trump is already revealed');
      }
      if (!updatedRound.bidding || updatedRound.bidding.bidderId !== playerId) {
        throw new Error('Only the bidder can open trump');
      }
      // Only the current turn player may open.
      {
        const tricks = updatedRound.tricks || [];
        const currentTrick = tricks[updatedRound.trickIndex] || { cards: [], ledSuit: null };
        const cardsPlayed = currentTrick.cards?.length || 0;
        const expectedSeat = (updatedRound.startingPlayerIndex + cardsPlayed) % updatedMatch.players.length;
        const currentPlayer = updatedMatch.players.find((p) => p.seatIndex === expectedSeat);
        if (!currentPlayer || currentPlayer.id !== playerId) {
          throw new Error('Not your turn to open trump');
        }
      }
      updatedRound = openTrump(updatedRound);
      break;
    default:
      return { match };
  }

  // If trump has been revealed, move into the open-trump trick phase.
  if (updatedRound.trump?.revealed && updatedRound.phase === 'tricks-hidden-trump') {
    updatedRound = { ...updatedRound, phase: 'tricks-open-trump' };
  }

  // Second-pass deal: give 4 more cards to each player, then advance phase.
  if (updatedRound.phase === 'second-pass-deal') {
    const seatOrder = [
      (updatedRound.dealerIndex + 1) % updatedMatch.players.length,
      (updatedRound.dealerIndex + 2) % updatedMatch.players.length,
      (updatedRound.dealerIndex + 3) % updatedMatch.players.length,
      updatedRound.dealerIndex,
    ];
    const playersBySeat = seatOrder
      .map((seat) => updatedMatch.players.find((p) => p.seatIndex === seat))
      .filter(Boolean);
    const cardsPerPlayer = 4;
    const totalToDeal = playersBySeat.length * cardsPerPlayer;
    const deck = updatedRound.deck || [];
    const cardsToDeal = deck.slice(0, totalToDeal);
    const remainingDeck = deck.slice(totalToDeal);

    const updatedPlayersById = new Map();
    playersBySeat.forEach((player, idx) => {
      const start = idx * cardsPerPlayer;
      const additions = cardsToDeal.slice(start, start + cardsPerPlayer);
      updatedPlayersById.set(player.id, { ...player, hand: [...(player.hand || []), ...additions] });
    });

    const remappedPlayers = updatedMatch.players.map((p) => updatedPlayersById.get(p.id) || p);
    updatedMatch = { ...updatedMatch, players: remappedPlayers };

    // Determine next phase: optional 250 bidding if needed, otherwise move to tricks with hidden trump.
    const nextRound =
      updatedRound.bidding && updatedRound.bidding.highestBid != null && updatedRound.bidding.highestBid < 304
        ? {
            ...updatedRound,
            deck: remainingDeck,
            phase: 'second-pass-bidding',
            bidding: {
              ...(updatedRound.bidding || {}),
              secondPassPassedPlayerIds: [],
            },
          }
        : {
            ...updatedRound,
            deck: remainingDeck,
            phase: 'tricks-hidden-trump',
          };

    updatedRound = nextRound;
  }

  // Resolve trick when all players have played in the current trick.
  const currentTrick = updatedRound.tricks?.[updatedRound.trickIndex];
  if (currentTrick && currentTrick.cards.length === updatedMatch.players.length) {
    const result = resolveTrick(updatedRound, updatedMatch);
    updatedRound = result.round;
    updatedMatch = result.match;
  }

  // If trump has been revealed (by play or resolve), move into open-trump trick phase.
  if (updatedRound.trump?.revealed && updatedRound.phase === 'tricks-hidden-trump') {
    updatedRound = { ...updatedRound, phase: 'tricks-open-trump' };
  }

  // Advance scoring and dealer when round is over.
  if (updatedRound.phase === 'scoring') {
    updatedMatch = applyRoundScoring(updatedMatch, updatedRound);
    if (!updatedMatch.winnerTeamId) {
      updatedMatch.dealerIndex = (updatedMatch.dealerIndex + 1) % updatedMatch.players.length;
      const nextMatch = startRound(updatedMatch);
      updatedMatch = nextMatch;
      updatedRound = nextMatch.currentRound;
    }
  }

  updatedMatch = { ...updatedMatch, currentRound: updatedRound };
  return { match: updatedMatch };
}
