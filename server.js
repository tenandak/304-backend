const server = require('express')();
const http = require('http').createServer(server);
const io = require('socket.io')(http);
let players = [];

io.on('connection', function (socket) {
    console.log('A user connected: ' + socket.id);

    let player = {
    	id: socket.id,
    	number: players.length + 1
    }

    players.push(player);
    console.log('PLAYERS:', players);

    if (players.length > 0 && players.length <= 4) {
    	console.log('EMITTING BACK TO CLIENT THE #', players.length);
        io.emit('PlayerRegistered', players);
    };

    socket.on('dealCards', function (cards) {
        io.emit('dealCards', cards);
    });

    socket.on('cardPlayed', function (gameObject, isPlayerA) {
        io.emit('cardPlayed', gameObject, isPlayerA);
    });

    socket.on('disconnect', function () {
        console.log('A user disconnected: ' + socket.id);
        players = players.filter(player => player !== socket.id);
    });
});

http.listen(3000, function () {
    console.log('Server started!');
});