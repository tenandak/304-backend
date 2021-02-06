import Game from './game.class.js';
import Player from './player.class.js';

import * as socketio from 'socket.io';
import express from 'express';
import { createServer } from 'http';


const app = express(); 
const server = createServer(app); 
const io = new socketio.Server(server);
const PORT = process.env.PORT || 3000;

let game = null;
let players = [null, null, null, null];
let playerFirstHalfDealtCount = 0;

io.on('connection', function (socket) {
    console.log('A user connected: ' + socket.id);
    let player;
    for (let i = 0; i < players.length; i++) {
        if (players[i] === null) {
            player = new Player(socket.id, i);
            players[i] = player;
            break;
        }
    }
    if (player) {
        io.emit('playerJoined', players);
        const numberOfPlayers = players.filter((p) => p != null).length; 
        if (numberOfPlayers === 4 && game === null) {
            game = new Game(players);
            io.emit('startGame', game);
        }
    } else {
        io.emit('gameFull', players);
    }

    socket.on('firstHalfDealt', function (playerId) {
        playerFirstHalfDealtCount++;
        // let player = game.players.find(p => p.id == playerId);
        // player.setIsFirstHalfDealt(true);

        // const count = game.players.filter(pl => pl.getIsFirstHalfDealt()).length;
        if (playerFirstHalfDealtCount === 4) {
            // players.forEach(p => {
            //     p.setIsFirstHalfDealt(false)
            // });
            playerFirstHalfDealtCount = 0;
            let round = game.getActiveRound();
            round.beginFirstBid(socket, io);
        }
    });

    // socket.on('promptBid', function (id, minimum, isForced, canAskPartner, bidList, title, keepPrevBid) {
    //     io.emit('promptBid', id, minimum, isForced, canAskPartner, bidList, title, keepPrevBid);
    // });

    socket.on('selectTrump', function (id, bid, bidList) {
        io.emit('selectTrump', id, bid, bidList);
    });

    socket.on('trumpSelected', function (id, cardId, beginRound) {
        io.emit('trumpSelected', id, cardId, beginRound);
    });

    socket.on('playerMoved', function (id, cardId) {
        io.emit('playerMoved', id, cardId);
    });

    socket.on('nextPlay', function (startingPlayerId, isTrumpKnown) {
        io.emit('nextPlay', startingPlayerId, isTrumpKnown);
    });

    socket.on('disconnect', function () {
        for (let i = 0; i < players.length; i++) {
            if (players[i] && players[i].id === socket.id) {
                io.emit('removePlayer', socket.id);
                players[i] = null;
            }
        }
        game = null;
    });

});

server.listen(PORT, function () {
    console.log('Listening on PORT', PORT);
});