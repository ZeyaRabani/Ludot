const express = require('express');
const http = require('http');
const cors = require('cors');
const { Server } = require('socket.io');

const app = express();
app.use(cors());

const server = http.createServer(app);

const io = new Server(server, {
    cors: {
        origin: '*',
        methods: ['GET', 'POST'],
    },
});

const rooms = {};

io.on('connection', (socket) => {
    console.log('User connected:', socket.id);

    socket.on('join-room', ({ roomId, playerName }) => {
        socket.join(roomId);

        if (!rooms[roomId]) rooms[roomId] = [];
        if (rooms[roomId].length >= 4) {
            socket.emit('room-full');
            return;
        }

        const colors = ['red', 'blue', 'green', 'yellow'];
        const playerColor = colors[rooms[roomId].length];
        
        const playerData = {
            id: socket.id,
            name: playerName,
            color: playerColor
        };

        rooms[roomId].push(playerData);
        io.to(roomId).emit('player-joined', rooms[roomId]);
        
        io.to(roomId).emit('turn-updated', 0);
    });

    socket.on('dice-roll', ({ roomId, player, value }) => {
        io.to(roomId).emit('dice-rolled', { player, value });
    });

    socket.on('move-token', ({ roomId, moveData }) => {
        io.to(roomId).emit('token-moved', moveData);
    });

    socket.on('disconnecting', () => {
        for (const roomId of socket.rooms) {
            if (roomId !== socket.id && rooms[roomId]) {
                rooms[roomId] = rooms[roomId].filter(id => id !== socket.id);
                io.to(roomId).emit('player-left', socket.id);
            }
        }
    });
});

const PORT = 4000;
server.listen(PORT, () => {
    console.log(`Socket server running on http://localhost:${PORT}`);
});
