const server = require('express')();
const http = require('http').createServer(server);
const io = require('socket.io')(http);
let players = [];

io.on('connection', function (socket) {
    console.log('A user connected: ' + socket.id);

    var playerNumber = players.length + 1;
    let player = {
    	id: socket.id,
    	name: "Player " + playerNumber,
    	number: playerNumber
    }

    players.push(player);
    console.log('PLAYERS:', players);

    if (players.length > 0 && players.length <= 4) {
    	console.log('EMITTING BACK TO CLIENT THE #', players.length);
        io.emit('PlayerRegistered', players);
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

    // socket.on('playComplete', function (winningPlayerId) {
    //     io.emit('playComplete', winningPlayerId);
    // });

    socket.on('nextPlay', function (startingPlayerId) {
        io.emit('nextPlay', startingPlayerId);
    });


    socket.on('disconnect', function () {
        console.log('A user disconnected: ' + socket.id);
        players = players.filter(player => player !== socket.id);
    });
});

http.listen(3000, function () {
    console.log('Server started!');
});