const server = require('express')();
const http = require('http').createServer(server);
const io = require('socket.io')(http);
let players = [null, null, null, null];

io.on('connection', function (socket) {
    console.log('A user connected: ' + socket.id);
    let player;
    for (let i = 0; i < players.length; i++) {
        if (players[i] === null) {
            player = {
                id: socket.id,
                name: "Player " + (i + 1),
                number: i
            };
            players[i] = player;
            break;
        }
    }
    if (player) {
        io.emit('playerJoined', players);
    } else {
        io.emit('gameFull', players);
    }

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
        for (let i = 0; i < players.length; i++) {
            if (players[i] && players[i].id === socket.id) {
                io.emit('removePlayer', socket.id);
                players[i] = null;
            }
        }
    });

});

http.listen(3000, function () {
    console.log('Server started!');
});