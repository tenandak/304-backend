import { createDeck, shuffleDeck } from './deck.js';

const CARDS_PER_PLAYER = 5;

export function setupGame(players) {
  const deck = shuffleDeck(createDeck());
  const { hands, remainingDeck } = dealToPlayers(deck, players.length, CARDS_PER_PLAYER);

  const updatedPlayers = players.map((player, index) => ({
    ...player,
    hand: hands[index],
  }));

  return {
    id: `game-${Date.now()}`,
    players: updatedPlayers,
    deck: remainingDeck,
    discardPile: [],
    phase: 'in-progress',
    turnPlayerId: updatedPlayers[0]?.id || null,
    createdAt: new Date().toISOString(),
    metadata: {},
  };
}

export function getValidActions(_gameState, _playerId) {
  return ['playCard', 'drawCard', 'pass'];
}

export function applyAction(gameState, playerId, action) {
  if (!action || !action.type) {
    return gameState;
  }

  switch (action.type) {
    case 'pass':
      return advanceTurn(gameState);
    default:
      return gameState;
  }
}

export function isGameOver(_gameState) {
  return false;
}

function dealToPlayers(deck, numPlayers, cardsPerPlayer) {
  const hands = Array.from({ length: numPlayers }, () => []);
  const totalNeeded = numPlayers * cardsPerPlayer;

  for (let i = 0; i < totalNeeded && i < deck.length; i += 1) {
    const playerIndex = i % numPlayers;
    hands[playerIndex].push(deck[i]);
  }

  const remainingDeck = deck.slice(totalNeeded);
  return { hands, remainingDeck };
}

function advanceTurn(gameState) {
  const currentIndex = gameState.players.findIndex((p) => p.id === gameState.turnPlayerId);
  const nextIndex = currentIndex >= 0 ? (currentIndex + 1) % gameState.players.length : 0;
  const nextPlayerId = gameState.players[nextIndex]?.id || null;
  return { ...gameState, turnPlayerId: nextPlayerId };
}
