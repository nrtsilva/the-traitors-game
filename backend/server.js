/* ==========================================================
   THE TRAITORS - BACKEND SERVER (NODE.JS + SOCKET.IO)
   Versão: 1.2 (Espera de Fase, Avaliação e Arsenal)
   ========================================================== */

const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const crypto = require('crypto');

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
const rooms = {}; 

const GAME_PHASES = {
    WAITING_LOBBY: 'WAITING_LOBBY',
    PHASE_1_MISSION: 'PHASE_1_MISSION',
    PHASE_2_BANISHMENT: 'PHASE_2_BANISHMENT',
    PHASE_3_ARMOURY: 'PHASE_3_ARMOURY',
    PHASE_4_MURDER: 'PHASE_4_MURDER',
    GAME_OVER: 'GAME_OVER'
};

function generateRoomCode() {
    return crypto.randomBytes(3).toString('hex').toUpperCase();
}

function createInitialRoomState(hostId, hostName) {
    return {
        roomCode: generateRoomCode(),
        hostId: hostId,
        phase: GAME_PHASES.WAITING_LOBBY,
        roundNumber: 0,
        settings: { maxPlayers: 6, numTraitors: 1, sabotageActive: true, recruitingActive: false, debateTime: 60, banishedLoseGold: true, eliminatedAsSpectator: true, tutorialMode: true },
        players: [{ id: hostId, name: hostName, role: 'unassigned', alive: true, gold: 3, inventory: [], secretMissions: [], secretMissionsCompleted: [], voteCast: null, isReadyForPhase: false }],
        prizeFund: { bars: 0, coins: 0 },
        phaseTimer: null,
        currentMissionData: null,
        readyCount: 0,
        phaseIntroData: null
    };
}

io.on('connection', (socket) => {
    console.log(`[Nova Conexão] Socket ID: ${socket.id}`);

    // --- CRIAR SALA ---
    socket.on('create_room', ({ playerName }, callback) => {
        try {
            const roomState = createInitialRoomState(socket.id, (playerName || "Anfitrião").trim());
            rooms[roomState.roomCode] = roomState;
            socket.join(roomState.roomCode);
            console.log(`[Sala Criada] Código: ${roomState.roomCode} | Anfitrião: ${roomState.players[0].name}`);
            callback({ success: true, roomCode: roomState.roomCode, players: roomState.players, settings: roomState.settings });
        } catch (error) {
            callback({ success: false, message: "Erro ao criar a sala." });
        }
    });

    // --- ENTRAR NA SALA ---
    socket.on('join_room', ({ roomCode, playerName }, callback) => {
        try {
            const cleanCode = (roomCode || "").trim().toUpperCase();
            const room = rooms[cleanCode];
            if (!room) return callback({ success: false, message: "Sala não encontrada." });
            if (room.players.length >= room.settings.maxPlayers) return callback({ success: false, message: "Sala cheia." });
            if (room.phase !== GAME_PHASES.WAITING_LOBBY) return callback({ success: false, message: "O jogo já começou." });

            const newPlayer = { id: socket.id, name: (playerName || "Jogador").trim(), role: 'unassigned', alive: true, gold: 3, inventory: [], secretMissions: [], secretMissionsCompleted: [], voteCast: null, isReadyForPhase: false };
            room.players.push(newPlayer);
            socket.join(cleanCode);
            console.log(`[Entrada na Sala] ${newPlayer.name} entrou em ${cleanCode}`);

            io.to(cleanCode).emit('room_update', { players: room.players, settings: room.settings });
            callback({ success: true, players: room.players, settings: room.settings });
        } catch (error) {
            callback({ success: false, message: "Erro ao entrar." });
        }
    });

    // --- CONFIGURAÇÕES ---
    socket.on('update_settings', ({ roomCode, newSettings }, callback) => {
        try {
            const cleanCode = (roomCode || "").trim().toUpperCase();
            const room = rooms[cleanCode];
            if (!room || room.hostId !== socket.id) return;
            room.settings = { ...room.settings, ...newSettings };
            io.to(cleanCode).emit('settings_updated', room.settings);
            if (typeof callback === 'function') callback({ success: true });
        } catch (error) {
            console.error("Erro no update_settings:", error);
        }
    });

    // --- INICIAR JOGO ---
    socket.on('start_game', ({ roomCode }, callback) => {
        try {
            const cleanCode = (roomCode || "").trim().toUpperCase();
            const room = rooms[cleanCode];
            if (!room || room.hostId !== socket.id) return;
            if (room.players.length < 2) return callback({ success: false, message: "Mínimo 2 jogadores para testes." });

            const shuffled = [...room.players].sort(() => Math.random() - 0.5);
            let traitorCount = room.settings.numTraitors;
            if (!traitorCount || traitorCount < 1 || traitorCount >= room.players.length) traitorCount = 1;

            room.players.forEach(p => { p.role = 'faithful'; p.alive = true; p.gold = 3; p.inventory = []; p.secretMissions = []; p.voteCast = null; p.isReadyForPhase = false; });
			
			console.log(`[DEBUG] Jogadores na sala: ${room.players.length}`);
			console.log(`[DEBUG] Configuração de Traidores: ${room.settings.numTraitors}`);
			console.log(`[DEBUG] Traidores a atribuir: ${traitorCount}`);

            for (let i = 0; i < traitorCount; i++) {
                const t = shuffled[i];
                const pObj = room.players.find(p => p.id === t.id);
                if (pObj) {
                    pObj.role = 'traitor';
                    pObj.secretMissions = ["Sabotar a missão sem ser apanhado", "Dizer 'Está difícil' 3 vezes"];
                }
            }

			console.log(`[DEBUG] Roles finais: ${room.players.map(p => p.name + ': ' + p.role).join(', ')}`);

            room.roundNumber = 1;
            room.phase = GAME_PHASES.PHASE_1_MISSION;
            room.prizeFund = { bars: 0, coins: 0 };
            room.readyCount = 0;

            // Simulação da Missão
            room.currentMissionData = {
                type: 'RANKING',
                title: 'Ranking de Países',
                timeLimit: 120,
                items: [{ id: 1, name: 'Japão', correctPosition: 4 }, { id: 2, name: 'Polónia', correctPosition: 8 }, { id: 3, name: 'Suécia', correctPosition: 10 }, { id: 4, name: 'França', correctPosition: 5 }, { id: 5, name: 'EUA', correctPosition: 2 }, { id: 6, name: 'Índia', correctPosition: 1 }, { id: 7, name: 'Vietname', correctPosition: 6 }, { id: 8, name: 'Nigéria', correctPosition: 3 }, { id: 9, name: 'Coreia do Sul', correctPosition: 7 }, { id: 10, name: 'Austrália', correctPosition: 9 }]
            };

            room.phaseIntroData = {
                title: "Missão I",
                description: "Cooperem para ordenar os países por população. Ganhem ouro para o cofre.",
                secretMission: room.players.find(p => p.role === 'traitor')?.secretMissions[0] // Apenas para traidor
            };

            console.log(`[Jogo Iniciado] ${cleanCode} | Ronda: 1`);

            room.players.forEach(player => {
				const pState = {
					phase: room.phase,
					roundNumber: room.roundNumber,
					settings: room.settings,
					prizeFund: room.prizeFund,
					currentMission: room.currentMissionData,
					role: player.role,  // <-- ADICIONAR ESTA LINHA (mostra a role do próprio jogador)
					players: room.players.map(p => ({
						id: p.id,
						name: p.name,
						alive: p.alive,
						role: (p.id === player.id) ? p.role : null // Isto está correto para a lista de jogadores
					})),
					secretMissions: (player.role === 'traitor') ? player.secretMissions : []
				};
                io.to(player.id).emit('game_started', pState);
            });

            // Envia a intro para todos (com base no papel de cada um)
            room.players.forEach(player => {
                const introData = { ...room.phaseIntroData };
                if (player.role !== 'traitor') {
                    delete introData.secretMission; // Remove para os fiéis
                }
                io.to(player.id).emit('phase_intro', introData);
            });

            callback({ success: true });
        } catch (error) {
            console.error("Erro no start_game:", error);
            callback({ success: false, message: "Erro ao iniciar o jogo." });
        }
    });

	// --- JOGADOR PRONTO PARA A FASE ---
    socket.on('player_ready', ({ roomCode }) => {
        try {
            const cleanCode = (roomCode || "").trim().toUpperCase();
            const room = rooms[cleanCode];
            if (!room) return;

            const player = room.players.find(p => p.id === socket.id);
            if (!player || !player.alive) return;

            if (!player.isReadyForPhase) {
                player.isReadyForPhase = true;
                room.readyCount++;
                
                const aliveCount = room.players.filter(p => p.alive).length;
                
                // Log de DEBUG (Agora está no sítio certo, depois das variáveis existirem)
                console.log(`[DEBUG Ready] Recebido de ${player.name}. Prontos: ${room.readyCount} de ${aliveCount}`);

                io.to(cleanCode).emit('player_status_update', { readyCount: room.readyCount, totalNeeded: aliveCount });

                if (room.readyCount >= aliveCount) {
                    room.players.forEach(p => p.isReadyForPhase = false);
                    room.readyCount = 0;
                    
                    io.to(cleanCode).emit('phase_started', { phase: room.phase, timer: room.currentMissionData.timeLimit });
                    startMissionTimer(room);
                }
            }
        } catch (error) {
            console.error("Erro no player_ready:", error);
        }
    });

    // --- AVALIAÇÃO DA MISSÃO (Fiel dá estrelas, Traidor confirma) ---
    socket.on('submit_evaluation', ({ roomCode, data }) => {
        try {
            const cleanCode = (roomCode || "").trim().toUpperCase();
            const room = rooms[cleanCode];
            if (!room) return;

            const player = room.players.find(p => p.id === socket.id);
            if (!player || !player.alive) return;

            player.evaluation = data;

            // Verifica se todos os vivos responderam
            const alivePlayers = room.players.filter(p => p.alive);
            const allEvaluated = alivePlayers.every(p => p.evaluation !== undefined);

            if (allEvaluated) {
                // (Opcional) Lógica para ver se traidor completou, recompensas etc.
                room.players.forEach(p => p.evaluation = undefined);
                
                // Avançar para a Fase II (Banishment)
                room.phase = GAME_PHASES.PHASE_2_BANISHMENT;
                room.phaseIntroData = {
                    title: "A Expulsão",
                    description: "Discutam em voz alta quem acham que é o Traidor. Quando todos estiverem prontos, votem para expulsar alguém.",
                    secretMission: null
                };
                
                // Limpar votos
                room.players.forEach(p => p.voteCast = null);

                // Enviar intro da Fase II
                room.players.forEach(player => {
                    const introData = { ...room.phaseIntroData };
                    if (player.role !== 'traitor') delete introData.secretMission;
                    io.to(player.id).emit('phase_intro', introData);
                });
            }
        } catch (error) {
            console.error("Erro no submit_evaluation:", error);
        }
    });

    // --- VOTO DE EXPULSÃO ---
    socket.on('submit_banishment_vote', ({ roomCode, targetPlayerId }, callback) => {
        try {
            const cleanCode = (roomCode || "").trim().toUpperCase();
            const room = rooms[cleanCode];
            if (!room || room.phase !== GAME_PHASES.PHASE_2_BANISHMENT) return;

            const player = room.players.find(p => p.id === socket.id);
            if (!player || !player.alive) return;

            player.voteCast = targetPlayerId;
            const allVoted = room.players.filter(p => p.alive).every(p => p.voteCast !== null);

            if (allVoted) processBanishment(room);
            if (typeof callback === 'function') callback({ success: true });
        } catch (error) {
            console.error("Erro no voto:", error);
        }
    });

    // --- ARSENAL (Competitivo) ---
    socket.on('submit_arsenal_action', ({ roomCode, actionData }, callback) => {
        // Implementar mini-jogo do arsenal aqui
    });

    // --- ASSASSINATO (Traidor escolhe) ---
    socket.on('traitor_murder_choice', ({ roomCode, targetPlayerId }, callback) => {
        // Implementar seleção
    });

    // --- DESCONEXÃO ---
    socket.on('disconnect', () => {
        for (const roomCode in rooms) {
            const room = rooms[roomCode];
            const idx = room.players.findIndex(p => p.id === socket.id);
            if (idx !== -1) {
                room.players.splice(idx, 1);
                if (room.hostId === socket.id) {
                    delete rooms[roomCode];
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
        console.log(`[Timer] Missão terminou na sala ${room.roomCode}. Enviando avaliação...`);
        io.to(room.roomCode).emit('mission_evaluation');
    }, timeLimitMs);
}

function processBanishment(room) {
    // Lógica do banimento (cálculo de votos)
    const voteCount = {};
    room.players.filter(p => p.alive).forEach(p => {
        if (p.voteCast) voteCount[p.voteCast] = (voteCount[p.voteCast] || 0) + 1;
    });

    let maxVotes = 0;
    let banishedId = null;
    for (const [id, count] of Object.entries(voteCount)) {
        if (count > maxVotes) { maxVotes = count; banishedId = id; }
        else if (count === maxVotes && count > 0) banishedId = null;
    }

    if (banishedId) {
        const banished = room.players.find(p => p.id === banishedId);
        if (banished) {
            banished.alive = false;
            if (room.settings.banishedLoseGold) banished.gold = Math.max(0, banished.gold - 2);
        }
    }

    room.phase = GAME_PHASES.PHASE_3_ARMOURY;
    room.phaseIntroData = {
        title: "O Arsenal",
        description: "Competição individual! O vencedor recebe uma carta de recompensa (Escudo, Adaga ou Ouro).",
        secretMission: null
    };

    room.players.forEach(player => {
        const introData = { ...room.phaseIntroData };
        io.to(player.id).emit('phase_intro', introData);
    });
    // (Timer para fins de teste)
    setTimeout(() => {
        io.to(room.roomCode).emit('phase_started', { phase: room.phase });
        // Após Arsenal, avançar para Murder
        setTimeout(() => {
            room.phase = GAME_PHASES.PHASE_4_MURDER;
            room.phaseIntroData = {
                title: "O Assassinato",
                description: "A noite caiu! O Traidor escolhe a sua vítima em segredo.",
                secretMission: null
            };
            room.players.forEach(player => {
                const introData = { ...room.phaseIntroData };
                if (player.role !== 'traitor') delete introData.secretMission;
                io.to(player.id).emit('phase_intro', introData);
            });
        }, 5000);
    }, 5000);
}

server.keepAliveTimeout = 120000;
server.headersTimeout = 120000;

server.listen(PORT, () => {
    console.log(`[Servidor] The Traitors Backend está a correr na porta ${PORT}`);
    const PUBLIC_URL = process.env.RENDER_EXTERNAL_URL || `https://the-traitors-game.onrender.com`;
    setInterval(() => {
        http.get(PUBLIC_URL, (res) => {}).on('error', (e) => {});
    }, 240000);
});