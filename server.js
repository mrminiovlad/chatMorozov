const express = require('express');
const http = require('http');
const socketio = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = socketio(server);

app.use(express.static(__dirname + '/public'));

const rooms = new Set();
const roomUsers = new Map();

io.on('connection', (socket) => {
    console.log('a user connected');

    socket.on('disconnect', () => {
        console.log('user disconnected');
        const room = socket.handshake.query.room;
        if (room) {
            rooms.delete(room);
            io.emit('rooms', Array.from(rooms.values()));
            if (roomUsers.has(room)) {
                const users = roomUsers.get(room);
                users.delete(socket.id);
                io.to(room).emit('users in room', users.size);
                if (users.size === 0) {
                    roomUsers.delete(room);
                }
            }
        }
    });

    socket.on('chat message', (msg) => {
        const room = msg.room;
        if (room && rooms.has(room)) {
            io.to(room).emit('chat message', msg.message);
        }
    });

    socket.on('join room', (room) => {
        if (!room || rooms.has(room)) {
            socket.emit('join room error', 'Room is already taken or empty');
            return;
        }
        rooms.add(room);
        io.emit('rooms', Array.from(rooms.values()));
        socket.join(room);
        socket.emit('join room success', room);
        if (!roomUsers.has(room)) {
            roomUsers.set(room, new Set());
        }
        const users = roomUsers.get(room);
        users.add(socket.id);
        io.to(room).emit('users in room', users.size);
    });

    socket.on('private message', (msg) => {
        const room = msg.room;
        if (room) {
            io.to(room).emit('private message', msg.message);
        }
    });

});

server.listen(3000, () => {
    console.log('server is running on port 3000');
    setInterval(() => {
        io.emit('rooms', Array.from(rooms.values()));
        io.emit('users online', io.engine.clientsCount);
    }, 1000);
});
