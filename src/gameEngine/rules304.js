import { createTeam, createMatch, createEmptyRound } from './gameState.js';
import { createDeck, shuffleDeck } from './deck304.js';
import { placeFirstPassBid, placeOverrideBid } from './bidding304.js';
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
    case 'PLACE_OVERRIDE_BID':
      updatedRound = placeOverrideBid(updatedRound, playerId, payload);
      break;
    case 'SELECT_TRUMP':
      updatedRound = selectTrump(updatedRound, payload);
      break;
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
      updatedRound = openTrump(updatedRound);
      break;
    default:
      return { match };
  }

  // Resolve trick when all players have played in the current trick.
  const currentTrick = updatedRound.tricks?.[updatedRound.trickIndex];
  if (currentTrick && currentTrick.cards.length === updatedMatch.players.length) {
    const result = resolveTrick(updatedRound, updatedMatch);
    updatedRound = result.round;
    updatedMatch = result.match;
  }

  // Advance scoring and dealer when round is over.
  if (updatedRound.phase === 'scoring') {
    updatedMatch = applyRoundScoring(updatedMatch, updatedRound);
    if (!updatedMatch.winnerTeamId) {
      updatedMatch.dealerIndex = (updatedMatch.dealerIndex + 1) % updatedMatch.players.length;
    }
  }

  updatedMatch = { ...updatedMatch, currentRound: updatedRound };
  return { match: updatedMatch };
}
