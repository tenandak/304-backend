import express from 'express';
import cors from 'cors';
import { createServer } from 'http';
import { Server } from 'socket.io';
import { createRoom, joinRoom, getRoom, removePlayerFromRoom } from './src/rooms.js';
import { startMatch, startRound, applyAction } from './src/gameEngine/rules304.js';
import { sanitizeMatchForClient } from './src/gameEngine/sanitize304.js';

const PORT = process.env.PORT || 4000;

const app = express();
app.use(cors({ origin: '*' }));

const httpServer = createServer(app);
const io = new Server(httpServer, { cors: { origin: '*' } });

io.on('connection', (socket) => {
  console.log(`Client connected ${socket.id}`);
  socket.roomId = null;
  socket.playerId = null;

  socket.on('createRoom', ({ playerName } = {}) => {
    const player = { id: socket.id, name: playerName || 'Host', socketId: socket.id };
    const room = createRoom(player);
    socket.roomId = room.id;
    socket.playerId = player.id;
    socket.join(room.id);
    socket.emit('roomJoined', { roomId: room.id, players: room.players });
    socket.emit('playerCreated', { playerId: player.id });
  });

  socket.on('joinRoom', ({ roomId, playerName } = {}) => {
    const room = getRoom(roomId);
    if (!room) {
      socket.emit('error', { message: 'Room not found' });
      return;
    }

    const player = { id: socket.id, name: playerName || 'Player', socketId: socket.id };
    let updatedRoom;
    try {
      updatedRoom = joinRoom(roomId, player);
    } catch (err) {
      socket.emit('error', { message: 'Room is full' });
      return;
    }

    socket.roomId = roomId;
    socket.playerId = player.id;
    socket.join(roomId);
    socket.emit('playerCreated', { playerId: player.id });
    io.to(roomId).emit('roomJoined', { roomId: updatedRoom.id, players: updatedRoom.players });
  });

  socket.on('startGame', ({ roomId } = {}) => {
    const room = getRoom(roomId);
    if (!room) {
      socket.emit('error', { message: 'Room not found' });
      return;
    }

    if (!room.match) {
      const playersInSeatOrder = [...room.players].sort((a, b) => (a.seatIndex || 0) - (b.seatIndex || 0));
      const { match } = startMatch(playersInSeatOrder);
      const startedMatch = startRound(match);
      room.match = startedMatch;
    }

    io.to(roomId).emit('gameState', sanitizeMatchForClient(room.match));
  });

  socket.on('playerAction', ({ roomId, playerId, action } = {}) => {
    const room = getRoom(roomId);
    if (!room || !room.match) {
      socket.emit('error', { message: 'Room not found' });
      return;
    }
    try {
      const { match } = applyAction(room.match, playerId, action);
      room.match = match;
      io.to(roomId).emit('gameState', sanitizeMatchForClient(room.match));
    } catch (err) {
      console.error('playerAction error', err);
      socket.emit('error', { message: err?.message || 'Invalid action' });
    }
  });

  socket.on('disconnect', () => {
    if (socket.roomId && socket.playerId) {
      const updatedRoom = removePlayerFromRoom(socket.roomId, socket.playerId);
      if (updatedRoom) {
        io.to(socket.roomId).emit('roomJoined', { roomId: updatedRoom.id, players: updatedRoom.players });
      }
    }
    console.log(`Client disconnected ${socket.id}`);
  });
});

httpServer.listen(PORT, () => {
  console.log(`Server listening on http://localhost:${PORT}`);
});
