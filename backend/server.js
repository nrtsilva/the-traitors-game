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
        settings: { maxPlayers: 6, numTraitors: 1, sabotageActive: true, recruitingActive: false, debateTime: 60, banishedLoseGold: true, eliminatedAsSpectator: true, tutorialMode: true, gameMode: 'remote', numPhases: 2 },players: [{ id: hostId, name: hostName, role: 'unassigned', alive: true, gold: 3, bars: 2, inventory: [], secretMissions: [], secretMissionsCompleted: [], voteCast: null, isReadyForPhase: false }],
        prizeFund: { bars: 0, coins: 0 },
        phaseTimer: null,
        currentMissionData: null,
        readyCount: 0,
		endMissionVotes: 0,
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
            callback({ success: true, roomCode: cleanCode, players: room.players, settings: room.settings });
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
			room.endMissionVotes = 0;
			room.players.forEach(p => p.hasEndMissionVote = false);
            if (!room || room.hostId !== socket.id) return;
            if (room.players.length < 2) return callback({ success: false, message: "Mínimo 2 jogadores para testes." });

            // 1. DEFINIR O MODO DE JOGO LOGO NO INÍCIO!
            const gameMode = room.settings.gameMode || 'remote';

            const shuffled = [...room.players].sort(() => Math.random() - 0.5);
            let traitorCount = room.settings.numTraitors;
            if (!traitorCount || traitorCount < 1 || traitorCount >= room.players.length) traitorCount = 1;

            room.players.forEach(p => { p.role = 'faithful'; p.alive = true; p.gold = 3; p.inventory = []; p.secretMissions = []; p.voteCast = null; p.isReadyForPhase = false; });
            
            console.log(`[DEBUG] Jogadores na sala: ${room.players.length}`);
            console.log(`[DEBUG] Configuração de Traidores: ${room.settings.numTraitors}`);
            console.log(`[DEBUG] Traidores a atribuir: ${traitorCount}`);

            // Atribuir papéis de Traidor (agora gameMode já existe!)
            for (let i = 0; i < traitorCount; i++) {
                const t = shuffled[i];
                const pObj = room.players.find(p => p.id === t.id);
                if (pObj) {
                    pObj.role = 'traitor';
                    
                    // GERAR TAREFAS ESPECÍFICAS CONSOANTE O MODO
                    if (gameMode === 'in_person') {
                        pObj.secretMissions = [
                            "Escolher o objeto amarelo para último",
                            "Dizer 'Está difícil' 3 vezes"
                        ];
                    } else {
                        pObj.secretMissions = [
                            "Colocar um país errado no topo da lista",
                            "Dizer 'Está difícil' 3 vezes"
                        ];
                    }
                }
            }

            console.log(`[DEBUG] Roles finais: ${room.players.map(p => p.name + ': ' + p.role).join(', ')}`);

            room.roundNumber = 1;
			room.totalRounds = room.settings.numPhases || 2;
            room.phase = GAME_PHASES.PHASE_1_MISSION;
            room.prizeFund = { bars: 0, coins: 0 };
            room.readyCount = 0;

            // 2. CRIAR A MISSÃO BASEADA NO MODO
            let missionData;
            if (gameMode === 'in_person') {
                missionData = {
                    type: 'PHYSICAL_OBJECT_HUNT',
                    title: 'Caça aos Objetos',
                    timeLimit: 120,
                    description: "Encontrem objetos com as cores indicadas na sala!",
                    items: [
                        { id: 1, name: 'Objeto Azul', description: 'Encontrem um objeto azul na sala.' },
                        { id: 2, name: 'Objeto Vermelho', description: 'Encontrem um objeto vermelho na sala.' },
                        { id: 3, name: 'Objeto de Papel', description: 'Encontrem um objeto de papel na sala.' }
                    ]
                };
            } else {
                missionData = {
                    type: 'RANKING',
                    title: 'Ranking de Países',
                    timeLimit: 120,
                    items: [{ id: 1, name: 'Japão', correctPosition: 4 }, { id: 2, name: 'Polónia', correctPosition: 8 }, { id: 3, name: 'Suécia', correctPosition: 10 }, { id: 4, name: 'França', correctPosition: 5 }, { id: 5, name: 'EUA', correctPosition: 2 }, { id: 6, name: 'Índia', correctPosition: 1 }, { id: 7, name: 'Vietname', correctPosition: 6 }, { id: 8, name: 'Nigéria', correctPosition: 3 }, { id: 9, name: 'Coreia do Sul', correctPosition: 7 }, { id: 10, name: 'Austrália', correctPosition: 9 }]
                };
            }

            room.currentMissionData = missionData;

            room.phaseIntroData = {
                title: "Missão I",
                description: missionData.title === 'Caça aos Objetos' 
                    ? "Encontrem os objetos pedidos na sala. Trabalhem em equipa para ganhar ouro!" 
                    : "Cooperem para ordenar os países por população. Ganhem ouro para o cofre.",
                secretMission: room.players.find(p => p.role === 'traitor')?.secretMissions[0],
                gameMode: gameMode
            };

            console.log(`[Jogo Iniciado] ${cleanCode} | Ronda: 1 | Modo: ${gameMode}`);

            room.players.forEach(player => {
                const pState = {
                    phase: room.phase, 
                    roundNumber: room.roundNumber, 
                    settings: room.settings, 
                    prizeFund: room.prizeFund,
                    currentMission: room.currentMissionData,
                    role: player.role,
                    gameMode: gameMode,
                    roomCode: cleanCode,
                    gold: player.gold,
                    bars: player.bars,
                    players: room.players.map(p => ({ id: p.id, name: p.name, alive: p.alive, role: (p.id === player.id) ? p.role : null, gold: p.gold, bars: p.bars })),
                    secretMissions: (player.role === 'traitor') ? player.secretMissions : []
                };
                io.to(player.id).emit('game_started', pState);
            });

            room.players.forEach(player => {
                const introData = { ...room.phaseIntroData };
                if (player.role !== 'traitor') {
                    delete introData.secretMission;
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

			// Procura o jogador pelo socket.id atual
			let player = room.players.find(p => p.id === socket.id);

			// Se não encontrar (porque o socket.id mudou), procura um jogador
			// que ainda não tenha pressionado "Iniciar Fase" e atualiza o ID dele
			if (!player) {
				player = room.players.find(p => !p.isReadyForPhase);
				if (player) {
					console.log(`[DEBUG] Socket ID mudou! Atualizando ${player.name} para ${socket.id}`);
					player.id = socket.id; // Atualiza o ID para o novo socket
				}
			}

			if (!player || !player.alive) return;

			if (!player.isReadyForPhase) {
				player.isReadyForPhase = true;
				room.readyCount++;
				
				const aliveCount = room.players.filter(p => p.alive).length;
				
				console.log(`[DEBUG Ready] Recebido de ${player.name}. Prontos: ${room.readyCount} de ${aliveCount}`);

				io.to(cleanCode).emit('player_status_update', { readyCount: room.readyCount, totalNeeded: aliveCount });

				if (room.readyCount >= aliveCount) {
                    room.players.forEach(p => p.isReadyForPhase = false);
                    room.readyCount = 0;
                    
                    if (room.phase === GAME_PHASES.PHASE_2_BANISHMENT) {
                        const debateTime = room.settings.debateTime || 60;
                        io.to(cleanCode).emit('phase_started', { phase: room.phase, timer: debateTime });
                        
                        // Iniciar timer de debate
                        clearTimeout(room.phaseTimer);
                        room.phaseTimer = setTimeout(() => processBanishment(room), debateTime * 1000);
                    } else {
                        io.to(cleanCode).emit('phase_started', { phase: room.phase, timer: room.currentMissionData.timeLimit });
                        startMissionTimer(room);
                    }
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

            // Procura o jogador atual
            let player = room.players.find(p => p.id === socket.id);

            // Se não encontrar, procura um jogador vivo que ainda não tenha respondido
            if (!player) {
                player = room.players.find(p => p.alive && p.evaluation === undefined);
                if (player) {
                    player.id = socket.id; // Atualiza o ID
                }
            }

            if (!player || !player.alive) return;

            player.evaluation = data;
            console.log(`[DEBUG Avaliação] Recebida de ${player.name}.`);

            // Verifica se todos os vivos responderam
            const alivePlayers = room.players.filter(p => p.alive);
            const allEvaluated = alivePlayers.every(p => p.evaluation !== undefined);

			if (allEvaluated) {
                room.players.forEach(p => p.evaluation = undefined);
                
                // Avançar para a Fase II (Expulsão)
                room.phase = GAME_PHASES.PHASE_2_BANISHMENT;
                room.phaseIntroData = {
                    title: "A Expulsão",
                    description: "Discutam em voz alta quem acham que é o Traidor. Quando todos estiverem prontos, votem para expulsar alguém.",
                    secretMission: null
                };
                
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

	function processArsenal(room) {
		// 1. Encontrar Vencedor (maior número único)
		const choices = {};
		room.players.filter(p => p.alive).forEach(p => {
			if (p.arsenalChoice !== undefined) {
				choices[p.arsenalChoice] = choices[p.arsenalChoice] || [];
				choices[p.arsenalChoice].push(p);
			}
		});

		let winner = null;
		// Encontrar o número mais alto que só tem 1 jogador
		for (let num = 6; num >= 1; num--) {
			if (choices[num] && choices[num].length === 1) {
				winner = choices[num][0];
				break;
			}
		}

		// 2. Atribuir Prémio Aleatório
		const rewards = ['2_coins', '1_coin', 'shield', 'dagger'];
		const randomReward = rewards[Math.floor(Math.random() * rewards.length)];

		if (winner) {
			if (randomReward === '2_coins') winner.gold += 2;
			else if (randomReward === '1_coin') winner.gold += 1;
			else winner.inventory.push(randomReward);

			console.log(`[Arsenal] Vencedor: ${winner.name} | Prémio: ${randomReward}`);
		}

		// 3. Emitir Resultado
		io.to(room.roomCode).emit('arsenal_result', {
			winnerName: winner ? winner.name : 'Ninguém',
			reward: winner ? randomReward : null
		});

		// 4. Limpar escolhas e avançar para Assassinato
        room.players.forEach(p => p.arsenalChoice = undefined);

        // Avançar automaticamente para a próxima fase (assassinato -> nova ronda)
        // Como ainda não temos a interface do traidor, avançamos direto para a próxima ronda
        setTimeout(() => {
            endMurderPhase(room);
        }, 5000);
	}

    // --- VOTO DE EXPULSÃO ---
    socket.on('submit_banishment_vote', ({ roomCode, targetPlayerId, useDagger }, callback) => {
        try {
            const cleanCode = (roomCode || "").trim().toUpperCase();
            const room = rooms[cleanCode];
            if (!room || room.phase !== GAME_PHASES.PHASE_2_BANISHMENT) return;

            const player = room.players.find(p => p.id === socket.id);
            if (!player || !player.alive) return;

            player.voteCast = targetPlayerId;
			
			if (useDagger) {
				player.voteCast = [targetPlayerId, targetPlayerId]; // Dois votos para o mesmo
			} else {
				player.voteCast = targetPlayerId; // Um voto
			}		
		
            const allVoted = room.players.filter(p => p.alive).every(p => p.voteCast !== null);

			if (allVoted) {
                clearTimeout(room.phaseTimer); // Limpa o timer se todos votarem cedo
                processBanishment(room);
            }
            if (typeof callback === 'function') callback({ success: true });
        } catch (error) {
            console.error("Erro no voto:", error);
        }
    });

    // --- ARSENAL (Competitivo) ---
    socket.on('submit_arsenal_action', ({ roomCode, actionData }, callback) => {
        try {
            const cleanCode = (roomCode || "").trim().toUpperCase();
            const room = rooms[cleanCode];
            if (!room || room.phase !== GAME_PHASES.PHASE_3_ARMOURY) return;

            const player = room.players.find(p => p.id === socket.id);
            if (!player || !player.alive) return;

            player.arsenalChoice = actionData.value; // Número escolhido (1-6)
            console.log(`[Arsenal] ${player.name} escolheu ${player.arsenalChoice}`);

            // Verifica se todos escolheram
            const alivePlayers = room.players.filter(p => p.alive);
            const allChose = alivePlayers.every(p => p.arsenalChoice !== undefined);

            if (allChose) {
                processArsenal(room);
            }
            if (typeof callback === 'function') callback({ success: true });
        } catch (error) {
            console.error("Erro no submit_arsenal_action:", error);
        }
    });	

    // --- ASSASSINATO (Traidor escolhe) ---
    socket.on('traitor_murder_choice', ({ roomCode, targetPlayerId }, callback) => {
        // Por agora, para testar, se o traidor não escolher, avançamos automaticamente.
        // Implementar a escolha real mais tarde.
        const cleanCode = (roomCode || "").trim().toUpperCase();
        const room = rooms[cleanCode];
        if (!room) return;

        room.murderedThisRound = targetPlayerId || null; // Se ninguém for escolhido, ninguém morre
        endMurderPhase(room); // Chama a função que avança para a próxima ronda!
        
        if (typeof callback === 'function') callback({ success: true });
    });
	
	// --- EVENTO: TERMINAR MISSÃO ANTECIPADAMENTE ---
	socket.on('end_mission', ({ roomCode }) => {
		const cleanCode = (roomCode || "").trim().toUpperCase();
		const room = rooms[cleanCode];
		if (!room || room.phase !== GAME_PHASES.PHASE_1_MISSION) return;

		const player = room.players.find(p => p.id === socket.id);
		if (!player || !player.alive) return;

		if (!player.hasEndMissionVote) {
			player.hasEndMissionVote = true;
			room.endMissionVotes++;
			console.log(`[Missão] Voto para terminar de ${player.name}. Votos: ${room.endMissionVotes}`);

			const aliveCount = room.players.filter(p => p.alive).length;
			io.to(cleanCode).emit('end_mission_vote_update', { votes: room.endMissionVotes, total: aliveCount });

			if (room.endMissionVotes >= aliveCount) {
				if (room.phaseTimer) clearTimeout(room.phaseTimer); // Para o cronómetro
				room.phaseTimer = null;
				io.to(cleanCode).emit('mission_evaluation');
			}
		}
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

function endMurderPhase(room) {
    // Verifica a vítima (se houver)
    const victim = room.murderedThisRound ? room.players.find(p => p.id === room.murderedThisRound) : null;
    if (victim) {
        victim.alive = false;
        if (room.settings.banishedLoseGold) victim.gold = Math.max(0, victim.gold - 2);
    }

    room.roundNumber++;
    
    // Verificar fim da aventura
    if (room.roundNumber > room.totalRounds) {
        room.phase = GAME_PHASES.GAME_OVER;
        io.to(room.roomCode).emit('game_over', { message: "A aventura terminou! Iniciando a votação final." });
        return;
    }

    // PREPARAR NOVA RONDA
    room.phase = GAME_PHASES.PHASE_1_MISSION;
    room.prizeFund = { bars: 0, coins: 0 }; // (Opcional: resetar o cofre, ou manter acumulado)
    room.endMissionVotes = 0;
    room.players.forEach(p => { p.hasEndMissionVote = false; p.evaluation = undefined; p.arsenalChoice = undefined; });

    // Gerar nova missão (aqui reutilizamos a lógica do start_game, mas simplificado para teste)
    const gameMode = room.settings.gameMode || 'remote';
    let missionData;
    if (gameMode === 'in_person') {
        missionData = {
            type: 'PHYSICAL_OBJECT_HUNT',
            title: 'Caça aos Objetos - Ronda ' + room.roundNumber,
            timeLimit: 120,
            items: [
                { id: 1, name: 'Objeto Azul', description: 'Encontrem um objeto azul na sala.' },
                { id: 2, name: 'Objeto Verde', description: 'Encontrem um objeto verde na sala.' }
            ]
        };
    } else {
        // Alternar ordem para não ser sempre igual
        missionData = {
            type: 'RANKING',
            title: 'Ranking de Países - Ronda ' + room.roundNumber,
            timeLimit: 120,
            items: [{ id: 1, name: 'Japão', correctPosition: 4 }, { id: 2, name: 'Brasil', correctPosition: 5 }]
        };
    }
    room.currentMissionData = missionData;
    room.readyCount = 0;

    // Enviar intro da nova missão para todos
    room.phaseIntroData = {
        title: "Missão " + room.roundNumber,
        description: "Nova missão começou! Cooperem para ganhar ouro.",
        secretMission: null, // O traidor receberá a missão secreta no start_game, mas aqui simplificamos
        gameMode: gameMode
    };

    room.players.forEach(player => {
        const introData = { ...room.phaseIntroData };
        if (player.role === 'traitor') {
            introData.secretMission = "Dizer 'Está difícil' 3 vezes";
        }
        io.to(player.id).emit('phase_intro', introData);
    });

    // Aguardar que todos cliquem em iniciar antes de começar o timer
    // (O timer é iniciado no player_ready)
}

function processBanishment(room) {
    // Contagem de votos (agora com suporte para Adaga - 2 votos)
    const voteCount = {};
    room.players.filter(p => p.alive).forEach(p => {
        if (p.voteCast) {
            if (Array.isArray(p.voteCast)) {
                // Se for um array (Adaga), contamos cada elemento
                p.voteCast.forEach(id => {
                    voteCount[id] = (voteCount[id] || 0) + 1;
                });
            } else {
                // Voto normal
                voteCount[p.voteCast] = (voteCount[p.voteCast] || 0) + 1;
            }
        }
    });

    let maxVotes = 0;
    let banishedId = null;
    for (const [id, count] of Object.entries(voteCount)) {
        if (count > maxVotes) { maxVotes = count; banishedId = id; }
        else if (count === maxVotes && count > 0) banishedId = null;
    }

    let banishedPlayer = null;
    if (banishedId) {
        banishedPlayer = room.players.find(p => p.id === banishedId);
        if (banishedPlayer) {
            banishedPlayer.alive = false;
            if (room.settings.banishedLoseGold) banishedPlayer.gold = Math.max(0, banishedPlayer.gold - 2);
        }
    }

    // Dados para a Revelação
    const revealData = {
        title: "O RESULTADO DA EXPULSÃO",
        description: banishedPlayer ? `O jogador ${banishedPlayer.name} foi expulso da mansão.` : "Ninguém foi expulso (houve um empate).",
        banishedName: banishedPlayer ? banishedPlayer.name : null,
        lostGold: banishedPlayer ? 2 : 0
    };

    room.phase = GAME_PHASES.PHASE_3_ARMOURY;

    // Emitir revelação para todos
    io.to(room.roomCode).emit('banishment_reveal', revealData);

    // Após 5 segundos, avançar para o Arsenal
    setTimeout(() => {
        room.phaseIntroData = {
            title: "O Arsenal",
            description: "Competição individual! O vencedor recebe uma carta de recompensa (Escudo, Adaga ou Ouro).",
            secretMission: null
        };
        room.players.forEach(player => {
            io.to(player.id).emit('phase_intro', { ...room.phaseIntroData });
        });
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