/* ==========================================================
   THE TRAITORS - BACKEND SERVER (NODE.JS + SOCKET.IO)
   Versão: 1.1 (Estável e à prova de crashes)
   Descrição: Gerencia o Lobby, o Estado das Salas e a Lógica
   do Ciclo de Jogo (Fases 1 a 4 e Fim de Jogo).
   ========================================================== */

const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const crypto = require('crypto');

// 1. CONFIGURAÇÃO INICIAL DO SERVIDOR
const app = express();
const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: ["http://localhost:3000", "https://the-traitors-game.vercel.app"], 
        methods: ["GET", "POST"],
        credentials: true // Adicione isto!
    },
    transports: ['websocket', 'polling'] 
});

const PORT = process.env.PORT || 3001;

// 2. ARMAZENAMENTO DE ESTADO (Salas Ativas)
// Em produção, use Redis. Aqui usamos um objeto em memória para simplificar o MVP.
const rooms = {}; 

// 3. CONSTANTES DE ESTADO DO JOGO
const GAME_PHASES = {
    WAITING_LOBBY: 'WAITING_LOBBY',
    PHASE_1_MISSION: 'PHASE_1_MISSION',
    PHASE_2_BANISHMENT: 'PHASE_2_BANISHMENT',
    PHASE_3_ARMOURY: 'PHASE_3_ARMOURY',
    PHASE_4_MURDER: 'PHASE_4_MURDER',
    GAME_OVER: 'GAME_OVER'
};

// 4. FUNÇÕES AUXILIARES

// Gera um código de sala aleatório de 6 caracteres
function generateRoomCode() {
    return crypto.randomBytes(3).toString('hex').toUpperCase();
}

// Cria o estado inicial de uma sala
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
            tutorialMode: true
        },
        players: [
            {
                id: hostId,
                name: hostName,
                role: 'unassigned',
                alive: true,
                gold: 3,
                inventory: [],
                secretMissions: [],
                secretMissionsCompleted: [],
                voteCast: null,
                lastNumberChoice: null,
                isReady: false
            }
        ],
        prizeFund: { bars: 0, coins: 0 },
        phaseTimer: null,
        currentMissionData: null,
        resultsPending: false,
        murderedThisRound: null,
        banishedThisRound: null
    };
}

// 5. LÓGICA DO SOCKET.IO (EVENTOS EM TEMPO REAL)
io.on('connection', (socket) => {
    console.log(`[Nova Conexão] Socket ID: ${socket.id}`);

    // --- EVENTO: CRIAR SALA ---
    socket.on('create_room', ({ playerName }, callback) => {
        try {
            const roomState = createInitialRoomState(socket.id, (playerName || "Anfitrião").trim());
            rooms[roomState.roomCode] = roomState;
            
            socket.join(roomState.roomCode);

            console.log(`[Sala Criada] Código: ${roomState.roomCode} | Anfitrião: ${roomState.players[0].name}`);

            callback({
                success: true,
                roomCode: roomState.roomCode,
                players: roomState.players,
                settings: roomState.settings
            });
        } catch (error) {
            console.error("Erro no create_room:", error);
            callback({ success: false, message: "Erro ao criar a sala." });
        }
    });

    // --- EVENTO: ENTRAR NA SALA ---
    socket.on('join_room', ({ roomCode, playerName }, callback) => {
        try {
            // Normalizar o código (trim e uppercase) para evitar conflitos
            const cleanCode = (roomCode || "").trim().toUpperCase();
            const room = rooms[cleanCode];

            if (!room) {
                return callback({ success: false, message: "Sala não encontrada." });
            }
            if (room.players.length >= room.settings.maxPlayers) {
                return callback({ success: false, message: "Sala cheia." });
            }
            if (room.phase !== GAME_PHASES.WAITING_LOBBY) {
                return callback({ success: false, message: "O jogo já começou." });
            }

            const newPlayer = {
                id: socket.id,
                name: (playerName || "Jogador").trim(),
                role: 'unassigned',
                alive: true,
                gold: 3,
                inventory: [],
                secretMissions: [],
                secretMissionsCompleted: [],
                voteCast: null,
                lastNumberChoice: null,
                isReady: false
            };
            
            room.players.push(newPlayer);
            socket.join(cleanCode);

            console.log(`[Entrada na Sala] ${newPlayer.name} entrou em ${cleanCode}`);

            // Usar sempre o cleanCode para emitir
            io.to(cleanCode).emit('room_update', {
                players: room.players,
                settings: room.settings
            });

            callback({ success: true, players: room.players, settings: room.settings });

        } catch (error) {
            console.error("Erro no join_room:", error);
            callback({ success: false, message: "Erro interno no servidor. Tenta novamente." });
        }
    });

    // --- EVENTO: ANFITRIÃO ALTERA CONFIGURAÇÕES ---
    socket.on('update_settings', ({ roomCode, newSettings }, callback) => {
        try {
            const cleanCode = (roomCode || "").trim().toUpperCase();
            const room = rooms[cleanCode];
            if (!room || room.hostId !== socket.id) {
                return callback({ success: false, message: "Apenas o anfitrião pode alterar as configurações." });
            }

            room.settings = { ...room.settings, ...newSettings };
            
            io.to(cleanCode).emit('settings_updated', room.settings);
            callback({ success: true });
        } catch (error) {
            console.error("Erro no update_settings:", error);
            callback({ success: false, message: "Erro ao atualizar configurações." });
        }
    });

    // --- EVENTO: INICIAR JOGO ---
    socket.on('start_game', ({ roomCode }, callback) => {
        try {
            const cleanCode = (roomCode || "").trim().toUpperCase();
            const room = rooms[cleanCode];
            if (!room || room.hostId !== socket.id) {
                return callback({ success: false, message: "Apenas o anfitrião pode iniciar o jogo." });
            }

            if (room.players.length < 4) {
                return callback({ success: false, message: "É necessário pelo menos 4 jogadores para iniciar." });
            }

            // Atribuir Roles
            const shuffledPlayers = [...room.players].sort(() => Math.random() - 0.5);
            const traitorCount = room.settings.numTraitors;
            
            room.players.forEach(p => {
                p.role = 'faithful';
                p.alive = true;
                p.gold = 3;
                p.inventory = [];
                p.secretMissions = [];
                p.secretMissionsCompleted = [];
                p.voteCast = null;
                p.isReady = false;
            });

            for (let i = 0; i < traitorCount && i < shuffledPlayers.length; i++) {
                const traitor = shuffledPlayers[i];
                const playerObj = room.players.find(p => p.id === traitor.id);
                if (playerObj) {
                    playerObj.role = 'traitor';
                    playerObj.secretMissions = [
                        "Sabotar a missão de ordenação colocando um país errado no topo",
                        "Dizer 'Isto é difícil' 3 vezes durante o debate"
                    ];
                    playerObj.secretMissionsCompleted = [false, false];
                }
            }

            // Resetar variáveis
            room.roundNumber = 1;
            room.phase = GAME_PHASES.PHASE_1_MISSION;
            room.prizeFund = { bars: 0, coins: 0 };
            room.murderedThisRound = null;
            room.banishedThisRound = null;

            // Simulação de 1ª Missão (Ranking de Países)
            room.currentMissionData = {
                type: 'RANKING_DRAG_DROP',
                title: 'Ranking de Países',
                timeLimit: 120,
                items: [
                    { id: 1, name: 'Japão', correctPosition: 4 },
                    { id: 2, name: 'Polónia', correctPosition: 8 },
                    { id: 3, name: 'Suécia', correctPosition: 10 },
                    { id: 4, name: 'França', correctPosition: 5 },
                    { id: 5, name: 'EUA', correctPosition: 2 },
                    { id: 6, name: 'Índia', correctPosition: 1 },
                    { id: 7, name: 'Vietname', correctPosition: 6 },
                    { id: 8, name: 'Nigéria', correctPosition: 3 },
                    { id: 9, name: 'Coreia do Sul', correctPosition: 7 },
                    { id: 10, name: 'Austrália', correctPosition: 9 }
                ]
            };

            console.log(`[Jogo Iniciado] Sala: ${cleanCode} | Ronda: 1`);

            // Enviar estado individual a cada jogador
            room.players.forEach(player => {
                const playerState = {
                    phase: room.phase,
                    roundNumber: room.roundNumber,
                    settings: room.settings,
                    players: room.players.map(p => ({
                        id: p.id,
                        name: p.name,
                        alive: p.alive,
                        gold: (p.id === player.id) ? p.gold : null,
                        role: (p.id === player.id) ? p.role : null
                    })),
                    prizeFund: room.prizeFund,
                    currentMission: room.currentMissionData,
                    secretMissions: (player.role === 'traitor') ? player.secretMissions : [],
                    secretMissionsCompleted: (player.role === 'traitor') ? player.secretMissionsCompleted : []
                };
                io.to(player.id).emit('game_started', playerState);
            });

            startMissionTimer(room);
            callback({ success: true });

        } catch (error) {
            console.error("Erro no start_game:", error);
            callback({ success: false, message: "Erro ao iniciar o jogo." });
        }
    });

    // --- EVENTO: AÇÃO DA MISSÃO (Placeholder) ---
    socket.on('submit_mission_action', ({ roomCode, actionData }, callback) => {
        const cleanCode = (roomCode || "").trim().toUpperCase();
        const room = rooms[cleanCode];
        if (!room || room.phase !== GAME_PHASES.PHASE_1_MISSION) return;
        console.log(`[Ação Missão] Jogador ${socket.id} submeteu ação.`);
        callback({ success: true });
    });

    // --- EVENTO: VOTO DE BANIMENTO ---
    socket.on('submit_banishment_vote', ({ roomCode, targetPlayerId }, callback) => {
        try {
            const cleanCode = (roomCode || "").trim().toUpperCase();
            const room = rooms[cleanCode];
            if (!room || room.phase !== GAME_PHASES.PHASE_2_BANISHMENT) return;

            const player = room.players.find(p => p.id === socket.id);
            if (!player || !player.alive) return;

            player.voteCast = targetPlayerId;
            console.log(`[Voto Banimento] ${player.name} votou em ${targetPlayerId}`);

            const alivePlayers = room.players.filter(p => p.alive);
            const allVoted = alivePlayers.every(p => p.voteCast !== null);

            if (allVoted) {
                processBanishment(room);
            }
            callback({ success: true });
        } catch (error) {
            console.error("Erro no submit_banishment_vote:", error);
            callback({ success: false, message: "Erro ao votar." });
        }
    });

    // --- EVENTO: AÇÃO DO TRAIDOR (MURDER) ---
    socket.on('traitor_murder_choice', ({ roomCode, targetPlayerId }, callback) => {
        try {
            const cleanCode = (roomCode || "").trim().toUpperCase();
            const room = rooms[cleanCode];
            if (!room || room.phase !== GAME_PHASES.PHASE_4_MURDER) return;

            const traitor = room.players.find(p => p.id === socket.id);
            if (!traitor || traitor.role !== 'traitor' || !traitor.alive) return;

            const victim = room.players.find(p => p.id === targetPlayerId);
            if (!victim || !victim.alive) return callback({ success: false, message: "Alvo inválido." });

            const shieldIndex = victim.inventory.indexOf('shield');
            if (shieldIndex !== -1) {
                victim.inventory.splice(shieldIndex, 1);
                room.murderedThisRound = null;
                console.log(`[Murder] ${traitor.name} tentou matar ${victim.name}, mas o escudo protegeu-o!`);
                callback({ success: true, message: "Alvo protegido por Escudo. Ninguém morre esta noite." });
            } else {
                room.murderedThisRound = targetPlayerId;
                console.log(`[Murder] ${traitor.name} assassinou ${victim.name}!`);
                callback({ success: true, message: "Assassinato bem-sucedido." });
            }

            endMurderPhase(room);
        } catch (error) {
            console.error("Erro no traitor_murder_choice:", error);
            callback({ success: false, message: "Erro ao executar assassinato." });
        }
    });

    // --- EVENTO: DESCONEXÃO ---
    socket.on('disconnect', () => {
        console.log(`[Desconexão] Socket ID: ${socket.id}`);
        for (const roomCode in rooms) {
            const room = rooms[roomCode];
            const playerIndex = room.players.findIndex(p => p.id === socket.id);
            if (playerIndex !== -1) {
                room.players.splice(playerIndex, 1);
                if (room.hostId === socket.id) {
                    delete rooms[roomCode];
                    io.to(roomCode).emit('room_closed');
                } else {
                    io.to(roomCode).emit('room_update', { players: room.players });
                }
                break;
            }
        }
    });
});

// --- 6. FUNÇÕES DE LÓGICA DO JOGO ---

function startMissionTimer(room) {
    if (room.phaseTimer) clearTimeout(room.phaseTimer);
    
    const timeLimitMs = (room.currentMissionData.timeLimit || 120) * 1000;
    room.phaseTimer = setTimeout(() => {
        console.log(`[Timer] Tempo da Missão expirou na sala ${room.roomCode}. Processando resultados...`);
        processMissionResults(room);
    }, timeLimitMs);
}

function processMissionResults(room) {
    room.prizeFund.coins += 5;
    if (room.prizeFund.coins >= 5) {
        room.prizeFund.bars += 1;
        room.prizeFund.coins -= 5;
    }

    room.phase = GAME_PHASES.PHASE_2_BANISHMENT;
    room.players.forEach(p => p.voteCast = null);

    io.to(room.roomCode).emit('phase_change', {
        phase: room.phase,
        prizeFund: room.prizeFund,
        message: "Missão concluída! Preparem-se para o Banimento."
    });
}

function processBanishment(room) {
    const voteCount = {};
    room.players.filter(p => p.alive).forEach(p => {
        if (p.voteCast) {
            voteCount[p.voteCast] = (voteCount[p.voteCast] || 0) + 1;
        }
    });

    let maxVotes = 0;
    let banishedId = null;
    for (const [playerId, count] of Object.entries(voteCount)) {
        if (count > maxVotes) {
            maxVotes = count;
            banishedId = playerId;
        } else if (count === maxVotes && count > 0) {
            banishedId = null;
        }
    }

    if (banishedId) {
        const banishedPlayer = room.players.find(p => p.id === banishedId);
        if (banishedPlayer) {
            banishedPlayer.alive = false;
            if (room.settings.banishedLoseGold) banishedPlayer.gold = Math.max(0, banishedPlayer.gold - 2);
            room.banishedThisRound = banishedId;
        }
    }

    room.phase = GAME_PHASES.PHASE_3_ARMOURY;
    
    io.to(room.roomCode).emit('banishment_result', {
        banishedId: banishedId,
        alivePlayers: room.players.filter(p => p.alive).map(p => p.id),
        phase: room.phase
    });

    setTimeout(() => processArmoury(room), 5000);
}

function processArmoury(room) {
    room.phase = GAME_PHASES.PHASE_4_MURDER;

    io.to(room.roomCode).emit('blindfold_begin', {
        phase: room.phase,
        duration: 30
    });
}

function endMurderPhase(room) {
    const victim = room.murderedThisRound ? room.players.find(p => p.id === room.murderedThisRound) : null;
    if (victim) {
        victim.alive = false;
        if (room.settings.banishedLoseGold) victim.gold = Math.max(0, victim.gold - 2);
    }

    io.to(room.roomCode).emit('murder_result', {
        murderedId: room.murderedThisRound,
        prizeFund: room.prizeFund
    });

    room.roundNumber++;
    
    if (room.roundNumber > 4) {
        room.phase = GAME_PHASES.GAME_OVER;
        io.to(room.roomCode).emit('game_over', { message: "O jogo terminou! Iniciando a votação final." });
    } else {
        room.phase = GAME_PHASES.PHASE_1_MISSION;
        io.to(room.roomCode).emit('new_round', { roundNumber: room.roundNumber });
        startMissionTimer(room);
    }
}

// --- 7. INICIAR O SERVIDOR ---

// Configuração para evitar que o Render desligue a ligação por inatividade
server.keepAliveTimeout = 120000; // 2 minutos
server.headersTimeout = 120000; // 2 minutos

server.listen(PORT, () => {
    console.log(`[Servidor] The Traitors Backend está a correr na porta ${PORT}`);
    
    // PING INTERNO: Mantém o servidor acordado no Render Free
    // Tem de apontar para o URL público, não para localhost!
    const PUBLIC_URL = process.env.RENDER_EXTERNAL_URL || `https://the-traitors-game.onrender.com`;
    
    setInterval(() => {
        http.get(PUBLIC_URL, (res) => {
            // Apenas para "acordar" o servidor
        }).on('error', (e) => {
            // Ignora erros silenciosamente
        });
    }, 240000); // A cada 4 minutos (240000 milissegundos)
});