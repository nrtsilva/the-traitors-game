const crypto = require('crypto');
const { GAME_PHASES } = require('./constants');

// Armazenamento global de salas
const rooms = {};

// Gerar código de sala aleatório
function generateRoomCode() {
    return crypto.randomBytes(3).toString('hex').toUpperCase();
}

// Criar estado inicial de uma sala
function createInitialRoomState(hostId, hostName) {
    return {
        roomCode: generateRoomCode(),
        hostId: hostId,
        phase: GAME_PHASES.WAITING_LOBBY,
        roundNumber: 0,
        settings: {
            maxPlayers: 6,
            numTraitors: 1,
            sabotageActive: true,
            recruitingActive: false,
            debateTime: 60,
            banishedLoseGold: true,
            eliminatedAsSpectator: true,
            tutorialMode: true,
            gameMode: 'in_person',
            numPhases: 2,
            soundEffects: true
        },
        players: [{
            id: hostId,
            name: hostName || 'Anfitrião',
            role: 'unassigned',
            alive: true,
            gold: 3,
            bars: 2,
            inventory: [],
            secretMissions: [],
            secretMissionsCompleted: [],
            voteCast: null,
            isReadyForPhase: false
        }],
        prizeFund: { bars: 0, coins: 0 },
        phaseTimer: null,
        currentMissionData: null,
        readyCount: 0,
        endMissionVotes: 0,
        phaseIntroData: null,
        continueVotes: 0,
        drawingState: null,
        currentArsenalTask: null,
        arsenalReadyCount: 0
    };
}

// Remover jogador da sala (e desconectar socket)
function removePlayerFromRoom(room, playerId, io) {
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

// Converter moedas em barras (5 moedas = 1 barra)
function convertCoinsToBars(room) {
    while (room.prizeFund.coins >= 5) {
        room.prizeFund.coins -= 5;
        room.prizeFund.bars += 1;
    }
}

// Converter barras em moedas (1 barra = 5 moedas)
function convertBarsToCoins(room) {
    while (room.prizeFund.bars > 0 && room.prizeFund.coins < 5) {
        room.prizeFund.bars -= 1;
        room.prizeFund.coins += 5;
    }
}

// Antes de subtrair moedas do cofre ou de um jogador
function ensureCoins(player, amount) {
    while (player.gold < amount && player.bars > 0) {
        player.bars -= 1;
        player.gold += 5;
    }
}

module.exports = {
    rooms,
    generateRoomCode,
    createInitialRoomState,
    removePlayerFromRoom,
    convertCoinsToBars
};