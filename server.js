const server = require('express')();
const http = require('http').createServer(server);
const io = require('socket.io')(http);
let players = [];
let isGamePaused = false;

io.on('connection', function (socket) {
    console.log('A user connected: ' + socket.id);

    var playerNumber = players.length + 1;
    let player = {
    	id: socket.id,
    	name: "Player " + playerNumber,
    	number: playerNumber
    }

    players.push(player);

    if (players.length > 0 && players.length <= 4) {
        io.emit('playerRegistered', players);
    } else if (players.length > 4) {
        io.emit('gameFull', players);
    };

    socket.on('createDeck', function (cards) {
        io.emit('createDeck', cards);
    });

    socket.on('promptBid', function (id, minimum, isForced, canAskPartner, bidList, title, keepPrevBid) {
        io.emit('promptBid', id, minimum, isForced, canAskPartner, bidList, title, keepPrevBid);
    });

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
        players = players.filter(player => player.id !== socket.id);
        if (players.length < 4) {
            io.emit('removePlayer', socket.id);
        }
    });

});

http.listen(3000, function () {
    console.log('Server started!');
});