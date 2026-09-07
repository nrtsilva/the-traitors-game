const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const { registerSocketHandlers } = require('./src/socketHandlers');
const { rooms } = require('./src/roomManager'); // apenas para manter referência, mas não é usado diretamente

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: ["http://localhost:3000", "https://the-traitors-game.vercel.app"],
        methods: ["GET", "POST"],
        credentials: true
    },
    transports: ['websocket', 'polling']
});

const PORT = process.env.PORT || 3001;

// Registar todos os handlers de socket
registerSocketHandlers(io);

// Manter o servidor ativo (para Render)
server.keepAliveTimeout = 120000;
server.headersTimeout = 120000;

server.listen(PORT, () => {
    console.log(`[Servidor] The Traitors Backend está a correr na porta ${PORT}`);
    const PUBLIC_URL = process.env.RENDER_EXTERNAL_URL || `https://the-traitors-game.onrender.com`;
    // Ping para manter o servidor acordado (se necessário)
    setInterval(() => {
        http.get(PUBLIC_URL, (res) => {}).on('error', (e) => {});
    }, 240000);
});