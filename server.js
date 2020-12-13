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

    socket.on('promptBid', function (id, minimum, isForced, canAskPartner, bidList, title) {
        io.emit('promptBid', id, minimum, isForced, canAskPartner, bidList, title);
    });

    socket.on('disconnect', function () {
        console.log('A user disconnected: ' + socket.id);
        players = players.filter(player => player !== socket.id);
    });
});

http.listen(3000, function () {
    console.log('Server started!');
});