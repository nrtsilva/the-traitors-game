/* ==========================================================
   THE TRAITORS - BACKEND SERVER (NODE.JS + SOCKET.IO)
   Versão: 1.0 (Arquitetura Base)
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
        origin: "*", // Em produção, substitua pelo URL do seu Frontend (ex: http://localhost:3000)
        methods: ["GET", "POST"]
    }
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
                role: 'unassigned', // Será atribuído no 'start_game'
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
        phaseTimer: null, // Handle do setTimeout do Node
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
        // Cria o estado da sala
        const roomState = createInitialRoomState(socket.id, playerName);
        rooms[roomState.roomCode] = roomState;
        
        // O socket junta-se à sala do Socket.io
        socket.join(roomState.roomCode);

        console.log(`[Sala Criada] Código: ${roomState.roomCode} | Anfitrião: ${playerName}`);

        // Envia os dados da sala de volta para o Anfitrião
        callback({
            success: true,
            roomCode: roomState.roomCode,
            players: roomState.players,
            settings: roomState.settings
        });
    });

    // --- EVENTO: ENTRAR NA SALA ---
    socket.on('join_room', ({ roomCode, playerName }, callback) => {
        const room = rooms[roomCode];

        if (!room) {
            return callback({ success: false, message: "Sala não encontrada." });
        }
        if (room.players.length >= room.settings.maxPlayers) {
            return callback({ success: false, message: "Sala cheia." });
        }
        if (room.phase !== GAME_PHASES.WAITING_LOBBY) {
            return callback({ success: false, message: "O jogo já começou." });
        }

        // Adiciona o jogador à sala
        const newPlayer = {
            id: socket.id,
            name: playerName,
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
        socket.join(roomCode);

        console.log(`[Entrada na Sala] ${playerName} entrou em ${roomCode}`);

        // Atualiza todos na sala com a nova lista de jogadores
        io.to(roomCode).emit('room_update', {
            players: room.players,
            settings: room.settings
        });

        callback({ success: true, players: room.players, settings: room.settings });
    });

    // --- EVENTO: ANFITRIÃO ALTERA CONFIGURAÇÕES ---
    socket.on('update_settings', ({ roomCode, newSettings }, callback) => {
        const room = rooms[roomCode];
        if (!room || room.hostId !== socket.id) {
            return callback({ success: false, message: "Apenas o anfitrião pode alterar as configurações." });
        }

        // Atualiza as settings (garantir que apenas campos válidos são alterados)
        room.settings = { ...room.settings, ...newSettings };
        
        io.to(roomCode).emit('settings_updated', room.settings);
        callback({ success: true });
    });

    // --- EVENTO: INICIAR JOGO ---
    socket.on('start_game', ({ roomCode }, callback) => {
        const room = rooms[roomCode];
        if (!room || room.hostId !== socket.id) {
            return callback({ success: false, message: "Apenas o anfitrião pode iniciar o jogo." });
        }

        // 1. Atribuir Roles (Traidores)
        const shuffledPlayers = [...room.players].sort(() => Math.random() - 0.5);
        const traitorCount = room.settings.numTraitors;
        
        // Reinicia estados dos jogadores
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

        // Atribui a role de Traidor
        for (let i = 0; i < traitorCount && i < shuffledPlayers.length; i++) {
            const traitor = shuffledPlayers[i];
            const playerObj = room.players.find(p => p.id === traitor.id);
            if (playerObj) {
                playerObj.role = 'traitor';
                
                // --- AQUI O SISTEMA DE MISSÕES SECRETAS ---
                // (Num cenário real, isto seria puxado de um ficheiro JSON de missões)
                playerObj.secretMissions = [
                    "Sabotar a missão de ordenação colocando um país errado no topo",
                    "Dizer 'Isto é difícil' 3 vezes durante o debate"
                ];
                playerObj.secretMissionsCompleted = [false, false];
            }
        }

        // 2. Resetar variáveis da sala
        room.roundNumber = 1;
        room.phase = GAME_PHASES.PHASE_1_MISSION;
        room.prizeFund = { bars: 0, coins: 0 };
        room.murderedThisRound = null;
        room.banishedThisRound = null;

        // 3. Carregar a 1ª Missão (Simulação - No futuro vem do JSON externo)
        room.currentMissionData = {
            type: 'RANKING_DRAG_DROP',
            title: 'Ranking de Países',
            timeLimit: 120,
            items: [
                { id: 1, name: 'Japão', correctPosition: 4 },
                { id: 2, name: 'Polónia', correctPosition: 8 },
                { id: 3, name: 'Suécia', correctPosition: 10 },
                // ... (restantes países)
            ]
        };

        console.log(`[Jogo Iniciado] Sala: ${roomCode} | Ronda: 1`);
        
        // 4. Enviar estado inicial do jogo para TODOS os jogadores (com dados adaptados)
        room.players.forEach(player => {
            // Clonamos o estado da sala, mas filtramos informações secretas
            const playerState = {
                phase: room.phase,
                roundNumber: room.roundNumber,
                settings: room.settings,
                players: room.players.map(p => ({
                    id: p.id,
                    name: p.name,
                    alive: p.alive,
                    gold: (p.id === player.id) ? p.gold : null, // Só vê o seu próprio ouro
                    role: (p.id === player.id) ? p.role : null  // Só vê a sua própria role
                })),
                prizeFund: room.prizeFund,
                currentMission: room.currentMissionData,
                // Dados secretos apenas para o Traidor
                secretMissions: (player.role === 'traitor') ? player.secretMissions : [],
                secretMissionsCompleted: (player.role === 'traitor') ? player.secretMissionsCompleted : []
            };
            io.to(player.id).emit('game_started', playerState);
        });

        // 5. Iniciar o cronómetro da missão
        startMissionTimer(room);

        callback({ success: true });
    });

    // --- EVENTO: ENVIAR AÇÃO DA MISSÃO ---
    socket.on('submit_mission_action', ({ roomCode, actionData }, callback) => {
        const room = rooms[roomCode];
        if (!room || room.phase !== GAME_PHASES.PHASE_1_MISSION) return;

        // Guarda a ação do jogador (ex: ordem de classificação que ele arrastou)
        // Aqui guardaríamos num mapa: room.playerActions[socket.id] = actionData;
        
        console.log(`[Ação Missão] Jogador ${socket.id} submeteu ação.`);
        callback({ success: true });
    });

    // --- EVENTO: SUBMETER VOTO DE BANIMENTO ---
    socket.on('submit_banishment_vote', ({ roomCode, targetPlayerId }, callback) => {
        const room = rooms[roomCode];
        if (!room || room.phase !== GAME_PHASES.PHASE_2_BANISHMENT) return;

        const player = room.players.find(p => p.id === socket.id);
        if (!player || !player.alive) return;

        // Regista o voto
        player.voteCast = targetPlayerId;
        console.log(`[Voto Banimento] ${player.name} votou em ${targetPlayerId}`);

        // Verifica se todos os vivos já votaram
        const alivePlayers = room.players.filter(p => p.alive);
        const allVoted = alivePlayers.every(p => p.voteCast !== null);

        if (allVoted) {
            processBanishment(room);
        }
        callback({ success: true });
    });

    // --- EVENTO: AÇÃO DO TRAIDOR (MURDER) ---
    socket.on('traitor_murder_choice', ({ roomCode, targetPlayerId }, callback) => {
        const room = rooms[roomCode];
        if (!room || room.phase !== GAME_PHASES.PHASE_4_MURDER) return;

        const traitor = room.players.find(p => p.id === socket.id);
        if (!traitor || traitor.role !== 'traitor' || !traitor.alive) return;

        // Verifica se a vítima tem escudo
        const victim = room.players.find(p => p.id === targetPlayerId);
        if (!victim || !victim.alive) return callback({ success: false, message: "Alvo inválido." });

        const shieldIndex = victim.inventory.indexOf('shield');
        if (shieldIndex !== -1) {
            // Remove o escudo e cancela o assassinato
            victim.inventory.splice(shieldIndex, 1);
            room.murderedThisRound = null;
            console.log(`[Murder] ${traitor.name} tentou matar ${victim.name}, mas o escudo protegeu-o!`);
            callback({ success: true, message: "Alvo protegido por Escudo. Ninguém morre esta noite." });
        } else {
            // Assassinato bem-sucedido
            room.murderedThisRound = targetPlayerId;
            console.log(`[Murder] ${traitor.name} assassinou ${victim.name}!`);
            callback({ success: true, message: "Assassinato bem-sucedido." });
        }

        // Numa implementação real, precisaríamos de esperar que o cronómetro do Blindfold acabasse
        // para depois emitir o evento 'murder_result' para todos. Aqui avançamos logo para simplificar.
        endMurderPhase(room);
    });

    // --- EVENTO: DESCONEXÃO ---
    socket.on('disconnect', () => {
        console.log(`[Desconexão] Socket ID: ${socket.id}`);
        // Lógica para remover jogador da sala se o jogo ainda não tiver começado
        for (const roomCode in rooms) {
            const room = rooms[roomCode];
            const playerIndex = room.players.findIndex(p => p.id === socket.id);
            if (playerIndex !== -1) {
                room.players.splice(playerIndex, 1);
                // Se for o anfitrião, podemos fechar a sala ou transferir host
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
    // Limpa timer antigo se existir
    if (room.phaseTimer) clearTimeout(room.phaseTimer);
    
    // Simula o fim do tempo (No futuro, o frontend envia o fim ou o timeout acontece aqui)
    const timeLimitMs = (room.currentMissionData.timeLimit || 120) * 1000;
    room.phaseTimer = setTimeout(() => {
        console.log(`[Timer] Tempo da Missão expirou na sala ${room.roomCode}. Processando resultados...`);
        processMissionResults(room);
    }, timeLimitMs);
}

function processMissionResults(room) {
    // Lógica de cálculo de pontos da Missão seria aqui.
    // Exemplo: Calcular quantos itens cada jogador acertou e adicionar ao prizeFund.
    
    // Simulação de recompensa
    room.prizeFund.coins += 5;
    if (room.prizeFund.coins >= 5) {
        room.prizeFund.bars += 1;
        room.prizeFund.coins -= 5;
    }

    // Avança para a próxima fase
    room.phase = GAME_PHASES.PHASE_2_BANISHMENT;
    room.players.forEach(p => p.voteCast = null); // Limpa votos

    io.to(room.roomCode).emit('phase_change', {
        phase: room.phase,
        prizeFund: room.prizeFund,
        message: "Missão concluída! Preparem-se para o Banimento."
    });

    // Inicia o cronómetro do debate (se configurado)
    if (room.settings.debateTime > 0 && room.settings.debateTime !== 'Ilimitado') {
        setTimeout(() => {
             // Em produção, o frontend é que controla o cronómetro visual e envia o fim do tempo.
        }, room.settings.debateTime * 1000);
    }
}

function processBanishment(room) {
    // Contagem de votos
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
            banishedId = null; // Empate, ninguém é banido
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

    // Avançar para Armoury (Simulação)
    setTimeout(() => processArmoury(room), 5000);
}

function processArmoury(room) {
    room.phase = GAME_PHASES.PHASE_4_MURDER;

    // Iniciar Blindfold e pedir escolha ao Traidor
    io.to(room.roomCode).emit('blindfold_begin', {
        phase: room.phase,
        duration: 30 // 30 segundos
    });

    // Lógica do cronómetro do Blindfold e assassinato é gerida pelos eventos do Traidor.
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
    
    // Verificar fim do jogo (4 rondas)
    if (room.roundNumber > 4) {
        room.phase = GAME_PHASES.GAME_OVER;
        io.to(room.roomCode).emit('game_over', { message: "O jogo terminou! Iniciando a votação final." });
        // Lógica do Game Over aqui seria chamada.
    } else {
        room.phase = GAME_PHASES.PHASE_1_MISSION;
        // Resetar missão e timer para a próxima ronda
        io.to(room.roomCode).emit('new_round', { roundNumber: room.roundNumber });
        startMissionTimer(room);
    }
}

// --- 7. INICIAR O SERVIDOR ---
server.listen(PORT, () => {
    console.log(`[Servidor] The Traitors Backend está a correr na porta ${PORT}`);
});