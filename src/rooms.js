export const rooms = new Map();

const ID_CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
const ROOM_ID_LENGTH = 6;
const MAX_PLAYERS = 4;

function generateRoomId() {
  let id = '';
  for (let i = 0; i < ROOM_ID_LENGTH; i += 1) {
    const index = Math.floor(Math.random() * ID_CHARS.length);
    id += ID_CHARS.charAt(index);
  }
  return id;
}

export function createRoom(hostPlayer) {
  const id = generateRoomId();
  const room = {
    id,
    players: [{ ...hostPlayer, seatIndex: 0 }],
    match: null,
  };
  rooms.set(id, room);
  return room;
}

export function joinRoom(roomId, player) {
  const room = rooms.get(roomId);
  if (!room) return null;

  if (room.players.length >= MAX_PLAYERS) {
    throw new Error('Room is full');
  }

  const seatIndex = room.players.length;
  const updatedRoom = {
    ...room,
    players: [...room.players, { ...player, seatIndex }],
  };
  rooms.set(roomId, updatedRoom);
  return updatedRoom;
}

export function getRoom(roomId) {
  return rooms.get(roomId) || null;
}

export function removePlayerFromRoom(roomId, playerId) {
  const room = rooms.get(roomId);
  if (!room) return null;

  const remainingPlayers = room.players.filter((p) => p.id !== playerId);
  if (remainingPlayers.length === 0) {
    rooms.delete(roomId);
    return null;
  }

  const updatedRoom = { ...room, players: remainingPlayers };
  rooms.set(roomId, updatedRoom);
  return updatedRoom;
}
