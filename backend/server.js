/* ==========================================================
   THE TRAITORS - BACKEND SERVER (NODE.JS + SOCKET.IO)
   Versão: 2.1 (Defaults Atualizados e Lógica de Traidores)
   ========================================================== */

const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
    cors: { origin: ["http://localhost:3000", "https://the-traitors-game.vercel.app"], methods: ["GET", "POST"], credentials: true },
    transports: ['websocket', 'polling'] 
});

const PORT = process.env.PORT || 3001;
const rooms = {}; 

const GAME_PHASES = {
    WAITING_LOBBY: 'WAITING_LOBBY', PHASE_1_MISSION: 'PHASE_1_MISSION', PHASE_2_BANISHMENT: 'PHASE_2_BANISHMENT',
    PHASE_3_ARMOURY: 'PHASE_3_ARMOURY', PHASE_4_MURDER: 'PHASE_4_MURDER', GAME_OVER: 'GAME_OVER'
};

// Carregar aventuras
let adventures = [];
try {
    const filePath = path.join(__dirname, 'aventuras.json');
    if (fs.existsSync(filePath)) {
        const fileContent = fs.readFileSync(filePath, 'utf-8');
        if (fileContent.trim().length > 0) {
            adventures = JSON.parse(fileContent);
            console.log(`[Config] ${adventures.length} aventuras carregadas com sucesso.`);
        } else {
            console.error("[Config] ERRO: O ficheiro aventuras.json está vazio!");
        }
    } else {
        console.error("[Config] ERRO: O ficheiro aventuras.json não foi encontrado!");
    }
} catch (error) {
    console.error("[Config] ERRO CRÍTICO ao ler aventuras.json:", error.message);
}

function generateRoomCode() { return crypto.randomBytes(3).toString('hex').toUpperCase(); }

function createInitialRoomState(hostId, hostName) {
    return {
        roomCode: generateRoomCode(), hostId: hostId, phase: GAME_PHASES.WAITING_LOBBY, roundNumber: 0,
        settings: { 
            maxPlayers: 6, 
            numTraitors: 1, 
            sabotageActive: true, 
            recruitingActive: true, // MUDANÇA: Agora é TRUE por defeito
            debateTime: 60, 
            banishedLoseGold: true, 
            eliminatedAsSpectator: true, 
            tutorialMode: true, 
            gameMode: 'in_person', // MUDANÇA: Agora é 'in_person' por defeito
            numPhases: 2,
            soundEffects: true // MUDANÇA: Som por defeito ATIVO
        },
        players: [{ id: hostId, name: hostName, role: 'unassigned', alive: true, gold: 3, bars: 2, inventory: [], secretMissions: [], secretMissionsCompleted: [], voteCast: null, isReadyForPhase: false }],
        prizeFund: { bars: 0, coins: 0 }, phaseTimer: null, currentMissionData: null, readyCount: 0,
        endMissionVotes: 0, phaseIntroData: null, continueVotes: 0
    };
}

function removePlayerFromRoom(room, playerId) {
    const playerIndex = room.players.findIndex(p => p.id === playerId);
    if (playerIndex !== -1) {
        room.players.splice(playerIndex, 1);
    }
    const socket = io.sockets.sockets.get(playerId);
    if (socket) {
        socket.leave(room.roomCode);
        socket.disconnect(true);
    }
}

function convertCoinsToBars(room) {
    while (room.prizeFund.coins >= 5) {
        room.prizeFund.coins -= 5;
        room.prizeFund.bars += 1;
    }
}

io.on('connection', (socket) => {
    console.log(`[Nova Conexão] Socket ID: ${socket.id}`);

    socket.on('create_room', ({ playerName }, callback) => {
        try {
            const roomState = createInitialRoomState(socket.id, (playerName || "Anfitrião").trim());
            rooms[roomState.roomCode] = roomState;
            socket.join(roomState.roomCode);
            callback({ success: true, roomCode: roomState.roomCode, players: roomState.players, settings: roomState.settings });
        } catch (error) {
            callback({ success: false, message: "Erro ao criar a sala." });
        }
    });

    socket.on('join_room', ({ roomCode, playerName }, callback) => {
        try {
            const cleanCode = (roomCode || "").trim().toUpperCase();
            const room = rooms[cleanCode];
            if (!room) return callback({ success: false, message: "Sala não encontrada." });
            if (room.players.length >= room.settings.maxPlayers) return callback({ success: false, message: "Sala cheia." });
            if (room.phase !== GAME_PHASES.WAITING_LOBBY) return callback({ success: false, message: "O jogo já começou." });

            // Verificar se o nome já existe (ignorar maiúsculas/minúsculas)
            const cleanName = (playerName || "Jogador").trim();
            const nameExists = room.players.some(p => p.name.toLowerCase() === cleanName.toLowerCase());
            if (nameExists) {
                return callback({ success: false, message: "Já existe um jogador com esse nome na sala. Escolhe outro nome." });
            }

            const newPlayer = { id: socket.id, name: cleanName, role: 'unassigned', alive: true, gold: 3, inventory: [], secretMissions: [], secretMissionsCompleted: [], voteCast: null, isReadyForPhase: false };
            room.players.push(newPlayer);
            socket.join(cleanCode);
            io.to(cleanCode).emit('room_update', { players: room.players, settings: room.settings });
            callback({ success: true, roomCode: cleanCode, players: room.players, settings: room.settings });
        } catch (error) {
            callback({ success: false, message: "Erro ao entrar." });
        }
    });

    socket.on('update_settings', ({ roomCode, newSettings }, callback) => {
        try {
            const cleanCode = (roomCode || "").trim().toUpperCase();
            const room = rooms[cleanCode];
            if (!room || room.hostId !== socket.id) return;

            // MUDANÇA: Lógica para Traidores baseada no número máximo de jogadores
            let updatedSettings = { ...room.settings, ...newSettings };
            
            // Se o máximo de jogadores for 6 ou menos, forçar 1 traidor. Se for 7+, permitir 2.
            if (updatedSettings.maxPlayers <= 6) {
                updatedSettings.numTraitors = 1;
            } else {
                // Se for 7 ou mais e o utilizador pediu 2, mantém 2, senão 1.
                updatedSettings.numTraitors = (updatedSettings.numTraitors === 2) ? 2 : 1;
            }

            room.settings = updatedSettings;
            io.to(cleanCode).emit('settings_updated', room.settings);
            if (typeof callback === 'function') callback({ success: true, settings: room.settings });
        } catch (error) {
            console.error("Erro no update_settings:", error);
        }
    });

    socket.on('start_game', ({ roomCode }, callback) => {
        try {
            const cleanCode = (roomCode || "").trim().toUpperCase();
            const room = rooms[cleanCode];
            room.endMissionVotes = 0;
            room.players.forEach(p => p.hasEndMissionVote = false);
            if (!room || room.hostId !== socket.id) return;
            
            // MUDANÇA: Regra de mínimo 4 jogadores
            const minPlayers = 4;
            if (room.players.length < minPlayers) {
                return callback({ 
                    success: false, 
                    message: `É necessário ter pelo menos ${minPlayers} jogadores na sala para iniciar. Ajusta o número de jogadores nas configurações ou convida mais amigos.` 
                });
            }

            const gameMode = room.settings.gameMode || 'in_person';
            const shuffled = [...room.players].sort(() => Math.random() - 0.5);
            
            // Determinar número de traidores (garantindo que é 1 se ≤ 6 jogadores, 1 ou 2 se ≥ 7)
            let traitorCount = room.settings.numTraitors;
            if (room.players.length <= 6) traitorCount = 1;
            else if (room.players.length >= 7) traitorCount = Math.min(2, traitorCount);
            else traitorCount = 1;

            room.players.forEach(p => { p.role = 'faithful'; p.alive = true; p.gold = 3; p.inventory = []; p.secretMissions = []; p.voteCast = null; p.isReadyForPhase = false; });

            for (let i = 0; i < traitorCount; i++) {
                const t = shuffled[i];
                const pObj = room.players.find(p => p.id === t.id);
                if (pObj) pObj.role = 'traitor';
            }

            const availableAdventures = adventures.filter(a => a.mode === gameMode);
            const randomAdventure = availableAdventures[Math.floor(Math.random() * availableAdventures.length)];
            room.currentMissionData = randomAdventure;

            room.players.forEach(player => {
                if (player.role === 'traitor') {
                    player.secretMissions = randomAdventure.traitorSecretMissions || [];
                }
            });

            room.roundNumber = 1;
            room.totalRounds = room.settings.numPhases || 2;
            room.phase = GAME_PHASES.PHASE_1_MISSION;
            room.prizeFund = { bars: 0, coins: 0 };
            room.readyCount = 0;

            room.phaseIntroData = {
                title: randomAdventure.title,
                description: randomAdventure.description,
                secretMission: room.players.find(p => p.role === 'traitor')?.secretMissions[0],
                gameMode: gameMode
            };

            room.players.forEach(player => {
                const pState = { phase: room.phase, roundNumber: room.roundNumber, settings: room.settings, prizeFund: room.prizeFund, currentMission: room.currentMissionData, role: player.role, gameMode: gameMode, roomCode: cleanCode, gold: player.gold, bars: player.bars, players: room.players.map(p => ({ id: p.id, name: p.name, alive: p.alive, role: (p.id === player.id) ? p.role : null, gold: p.gold, bars: p.bars })), secretMissions: (player.role === 'traitor') ? player.secretMissions : [] };
                io.to(player.id).emit('game_started', pState);
            });

            room.players.forEach(player => {
                const introData = { ...room.phaseIntroData };
                if (player.role !== 'traitor') delete introData.secretMission;
                io.to(player.id).emit('phase_intro', introData);
            });

            callback({ success: true });
        } catch (error) {
            console.error("Erro no start_game:", error);
            callback({ success: false, message: "Erro ao iniciar o jogo." });
        }
    });

    // ... (resto do ficheiro mantém-se igual, com todos os eventos e funções)
    socket.on('player_ready', ({ roomCode }) => { /* ... */ });
    socket.on('submit_evaluation', ({ roomCode, data }) => { /* ... */ });
    socket.on('submit_banishment_vote', ({ roomCode, targetPlayerId, useDagger }, callback) => { /* ... */ });
    socket.on('traitor_choice', ({ roomCode, action }) => { /* ... */ });
    socket.on('traitor_murder_choice', ({ roomCode, targetPlayerId }, callback) => { /* ... */ });
    socket.on('traitor_recruit_choice', ({ roomCode, targetPlayerId }) => { /* ... */ });
    socket.on('decoy_answer', ({ roomCode }) => { /* ... */ });
    socket.on('recruit_decision', ({ roomCode, accepted }) => { /* ... */ });
    socket.on('continue_after_reveal', ({ roomCode }) => { /* ... */ });
    socket.on('end_mission', ({ roomCode }) => { /* ... */ });
    socket.on('submit_arsenal_action', ({ roomCode, actionData }, callback) => { /* ... */ });
    socket.on('disconnect', () => { /* ... */ });
});

// ... (funções de lógica, startMurderPhase, endMurderPhase, processArsenal, processBanishment, proceedToNextRound, server.listen)

server.keepAliveTimeout = 120000;
server.headersTimeout = 120000;

server.listen(PORT, () => {
    console.log(`[Servidor] The Traitors Backend está a correr na porta ${PORT}`);
    const PUBLIC_URL = process.env.RENDER_EXTERNAL_URL || `https://the-traitors-game.onrender.com`;
    setInterval(() => { http.get(PUBLIC_URL, (res) => {}).on('error', (e) => {}); }, 240000);
});