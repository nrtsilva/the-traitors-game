/* ==========================================================
   THE TRAITORS - BACKEND SERVER (NODE.JS + SOCKET.IO)
   Versão: 1.7 (Missões Dinâmicas e Correções Finais)
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

// Carregar as aventuras do ficheiro JSON
const adventures = JSON.parse(fs.readFileSync(path.join(__dirname, 'aventuras.json'), 'utf-8'));

function generateRoomCode() { return crypto.randomBytes(3).toString('hex').toUpperCase(); }

function createInitialRoomState(hostId, hostName) {
    return {
        roomCode: generateRoomCode(), hostId: hostId, phase: GAME_PHASES.WAITING_LOBBY, roundNumber: 0,
        settings: { 
            maxPlayers: 6, 
            numTraitors: 1, 
            sabotageActive: true, // FIXADO: Traidor pode sabotar SEMPRE
            recruitingActive: false, 
            debateTime: 60, 
            banishedLoseGold: true, // Apenas para expulsões
            eliminatedAsSpectator: true, // Se false, eliminados saem da sala
            tutorialMode: true, 
            gameMode: 'remote', 
            numPhases: 2 
        },
        players: [{ id: hostId, name: hostName, role: 'unassigned', alive: true, gold: 3, bars: 2, inventory: [], secretMissions: [], secretMissionsCompleted: [], voteCast: null, isReadyForPhase: false }],
        prizeFund: { bars: 0, coins: 0 }, phaseTimer: null, currentMissionData: null, readyCount: 0,
        endMissionVotes: 0, phaseIntroData: null
    };
}

// Função para eliminar o jogador da sala (se espectador estiver desligado)
function removePlayerFromRoom(room, playerId) {
    const playerIndex = room.players.findIndex(p => p.id === playerId);
    if (playerIndex !== -1) {
        room.players.splice(playerIndex, 1);
    }
    const socket = io.sockets.sockets.get(playerId);
    if (socket) {
        socket.leave(room.roomCode);
        socket.disconnect(true); // Desconecta o jogador
    }
}

io.on('connection', (socket) => {
    console.log(`[Nova Conexão] Socket ID: ${socket.id}`);

    // --- CRIAR SALA ---
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

            const gameMode = room.settings.gameMode || 'remote';

            const shuffled = [...room.players].sort(() => Math.random() - 0.5);
            let traitorCount = room.settings.numTraitors;
            if (!traitorCount || traitorCount < 1 || traitorCount >= room.players.length) traitorCount = 1;

            room.players.forEach(p => { p.role = 'faithful'; p.alive = true; p.gold = 3; p.inventory = []; p.secretMissions = []; p.voteCast = null; p.isReadyForPhase = false; });

            // Atribuir papéis de Traidor
            for (let i = 0; i < traitorCount; i++) {
                const t = shuffled[i];
                const pObj = room.players.find(p => p.id === t.id);
                if (pObj) pObj.role = 'traitor';
            }

            // Filtrar aventuras por modo e escolher uma aleatória
            const availableAdventures = adventures.filter(a => a.mode === gameMode);
            const randomAdventure = availableAdventures[Math.floor(Math.random() * availableAdventures.length)];
            room.currentMissionData = randomAdventure;

            // Atribuir missões secretas dinâmicas ao traidor (DEPOIS da role ser atribuída!)
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

    // --- JOGADOR PRONTO PARA A FASE (RESTAURADO - CRÍTICO) ---
    socket.on('player_ready', ({ roomCode }) => {
        try {
            const cleanCode = (roomCode || "").trim().toUpperCase();
            const room = rooms[cleanCode];
            if (!room) return;

            let player = room.players.find(p => p.id === socket.id);
            if (!player) {
                player = room.players.find(p => !p.isReadyForPhase);
                if (player) {
                    player.id = socket.id;
                    console.log(`[DEBUG] Socket ID mudou! Atualizando ${player.name} para ${socket.id}`);
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
                    
                    // FASE 2: EXPULSÃO (Debate)
                    if (room.phase === GAME_PHASES.PHASE_2_BANISHMENT) {
                        const debateTime = room.settings.debateTime || 60;
                        io.to(cleanCode).emit('phase_started', { phase: room.phase, timer: debateTime });
                        clearTimeout(room.phaseTimer);
                        room.phaseTimer = setTimeout(() => processBanishment(room), debateTime * 1000);
                    } 
                    // FASE 3: ARSENAL (Mini-Jogo Individual) - NÃO USAR TIMER DA MISSÃO!
                    else if (room.phase === GAME_PHASES.PHASE_3_ARMOURY) {
                        io.to(cleanCode).emit('phase_started', { phase: room.phase, timer: null });
                    } 
                    // FASE 1: MISSÃO
                    else {
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

            let player = room.players.find(p => p.id === socket.id);
            if (!player) {
                player = room.players.find(p => p.alive && p.evaluation === undefined);
                if (player) player.id = socket.id;
            }

            if (!player || !player.alive) return;

            if (data.type === 'traitor_answer') {
                player.secretMissionsCompleted = [data.value]; // Guarda [true] ou [false]
            }

            player.evaluation = data;

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

                room.players.forEach(player => {
                    io.to(player.id).emit('phase_intro', { ...room.phaseIntroData });
                });
            }
        } catch (error) {
            console.error("Erro no submit_evaluation:", error);
        }
    });

    // --- VOTO DE EXPULSÃO (CORRIGIDO COM RECUPERAÇÃO DE SOCKET) ---
    socket.on('submit_banishment_vote', ({ roomCode, targetPlayerId, useDagger }, callback) => {
        try {
            const cleanCode = (roomCode || "").trim().toUpperCase();
            const room = rooms[cleanCode];
            if (!room || room.phase !== GAME_PHASES.PHASE_2_BANISHMENT) return;

            let player = room.players.find(p => p.id === socket.id);
            if (!player) {
                player = room.players.find(p => p.alive && p.voteCast === null);
                if (player) player.id = socket.id;
            }
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

    // --- EVENTOS DO ASSASSINATO / RECRUTAMENTO (FASE 4) ---
    socket.on('traitor_choice', ({ roomCode, action }) => {
        const cleanCode = (roomCode || "").trim().toUpperCase();
        const room = rooms[cleanCode];
        if (!room || room.phase !== GAME_PHASES.PHASE_4_MURDER) return;

        const traitor = room.players.find(p => p.id === socket.id);
        if (!traitor || traitor.role !== 'traitor') return;

        // FIX: ADICIONADO O CASO 'KILL'
        if (action === 'kill') {
            io.to(traitor.id).emit('show_player_list', { type: 'kill' });
            return;
        }

        if (action === 'skip') {
            room.murderedThisRound = null;
            room.recruitPending = false;
            io.to(cleanCode).emit('decoy_question'); // Pergunta decoy para todos
            room.pendingDecoys = room.players.filter(p => p.alive).length;
            return;
        }

        if (action === 'recruit') {
            io.to(traitor.id).emit('show_player_list', { type: 'recruit' });
            return;
        }
    });

    socket.on('traitor_murder_choice', ({ roomCode, targetPlayerId }, callback) => {
        const cleanCode = (roomCode || "").trim().toUpperCase();
        const room = rooms[cleanCode];
        if (!room) return;

        const victim = room.players.find(p => p.id === targetPlayerId);
        if (!victim || !victim.alive) return;

        const shieldIndex = victim.inventory.indexOf('shield');
        if (shieldIndex !== -1) {
            victim.inventory.splice(shieldIndex, 1);
            room.murderedThisRound = null;
            room.shieldUsed = true;
        } else {
            room.murderedThisRound = targetPlayerId;
            room.shieldUsed = false;
        }

        io.to(cleanCode).emit('decoy_question');
        room.pendingDecoys = room.players.filter(p => p.alive).length;
        if (typeof callback === 'function') callback({ success: true });
    });

    socket.on('traitor_recruit_choice', ({ roomCode, targetPlayerId }) => {
        const cleanCode = (roomCode || "").trim().toUpperCase();
        const room = rooms[cleanCode];
        if (!room) return;

        const target = room.players.find(p => p.id === targetPlayerId);
        if (!target) return;

        room.recruitTargetId = targetPlayerId;
        io.to(targetPlayerId).emit('recruit_invitation');
        room.recruitPending = true;

        room.players.filter(p => p.alive && p.id !== targetPlayerId).forEach(p => {
            io.to(p.id).emit('decoy_question');
        });
        room.pendingDecoys = room.players.filter(p => p.alive && p.id !== targetPlayerId).length;
    });

    socket.on('decoy_answer', ({ roomCode }) => {
        const cleanCode = (roomCode || "").trim().toUpperCase();
        const room = rooms[cleanCode];
        if (!room) return;

        if (room.pendingDecoys > 0) {
            room.pendingDecoys--;
            if (room.pendingDecoys === 0) {
                if (!room.recruitPending) {
                    endMurderPhase(room);
                }
            }
        }
    });

    socket.on('recruit_decision', ({ roomCode, accepted }) => {
        const cleanCode = (roomCode || "").trim().toUpperCase();
        const room = rooms[cleanCode];
        if (!room) return;

        const target = room.players.find(p => p.id === room.recruitTargetId);
        if (target) {
            if (accepted) {
                target.role = 'traitor';
                target.secretMissions = ["Dizer 'Está difícil' 3 vezes"];
                io.to(cleanCode).emit('recruit_result', { playerName: target.name, accepted: true });
            } else {
                io.to(cleanCode).emit('recruit_result', { playerName: target.name, accepted: false });
            }
        }
        room.recruitPending = false;
        room.murderedThisRound = null;
        
        if (room.pendingDecoys === 0) {
            endMurderPhase(room);
        }
    });

    // --- TERMINAR MISSÃO ANTECIPADAMENTE ---
    socket.on('end_mission', ({ roomCode }) => {
        const cleanCode = (roomCode || "").trim().toUpperCase();
        const room = rooms[cleanCode];
        if (!room || room.phase !== GAME_PHASES.PHASE_1_MISSION) return;

        const player = room.players.find(p => p.id === socket.id);
        if (!player || !player.alive) return;

        if (!player.hasEndMissionVote) {
            player.hasEndMissionVote = true;
            room.endMissionVotes++;
            const aliveCount = room.players.filter(p => p.alive).length;
            io.to(cleanCode).emit('end_mission_vote_update', { votes: room.endMissionVotes, total: aliveCount });

            if (room.endMissionVotes >= aliveCount) {
                if (room.phaseTimer) clearTimeout(room.phaseTimer);
                room.phaseTimer = null;
                io.to(cleanCode).emit('mission_evaluation');
            }
        }
    });

    // --- ARSENAL (Competitivo) ---
    socket.on('submit_arsenal_action', ({ roomCode, actionData }, callback) => {
        try {
            const cleanCode = (roomCode || "").trim().toUpperCase();
            const room = rooms[cleanCode];
            if (!room || room.phase !== GAME_PHASES.PHASE_3_ARMOURY) return;

            let player = room.players.find(p => p.id === socket.id);
            if (!player) {
                player = room.players.find(p => p.alive && p.arsenalChoice === undefined);
                if (player) player.id = socket.id;
            }
            if (!player || !player.alive) return;

            player.arsenalChoice = actionData.value; // Número escolhido (1-6)
            console.log(`[Arsenal] ${player.name} escolheu ${player.arsenalChoice}`);

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

// --- FUNÇÕES DE LÓGICA DO JOGO ---

function startMissionTimer(room) {
    if (room.phaseTimer) clearTimeout(room.phaseTimer);
    const timeLimitMs = (room.currentMissionData.timeLimit || 120) * 1000;
    room.phaseTimer = setTimeout(() => {
        io.to(room.roomCode).emit('mission_evaluation');
    }, timeLimitMs);
}

function startMurderPhase(room) {
    room.phase = GAME_PHASES.PHASE_4_MURDER;
    room.recruitPending = false;
    room.murderedThisRound = null;

    io.to(room.roomCode).emit('blindfold_begin', { duration: 10 });

    setTimeout(() => {
        const aliveTraitors = room.players.filter(p => p.role === 'traitor' && p.alive);

        if (aliveTraitors.length === 0) {
            io.to(room.roomCode).emit('decoy_question');
            room.pendingDecoys = room.players.filter(p => p.alive).length;
            return;
        }

        const traitor = aliveTraitors[0];
        const completedMission = traitor.secretMissionsCompleted && traitor.secretMissionsCompleted[0];
        const canRecruit = room.settings.recruitingActive && (room.settings.numTraitors > 1) && (aliveTraitors.length === 1);

        if (!completedMission && !canRecruit) {
            io.to(traitor.id).emit('traitor_blocked', { message: "Não completaste a missão secreta. Não podes assassinar." });
            io.to(room.roomCode).emit('decoy_question');
            room.pendingDecoys = room.players.filter(p => p.alive).length;
        } else {
            const options = [];
            if (completedMission) options.push('kill');
            if (canRecruit) options.push('recruit');
            options.push('skip');
            io.to(traitor.id).emit('traitor_choices', { options });
        }
    }, 10000);
}

function endMurderPhase(room) {
    if (room.murderedThisRound) {
        const victim = room.players.find(p => p.id === room.murderedThisRound);
        if (victim) {
            victim.alive = false;
            // SEM PERDA DE MOEDAS NO ASSASSINATO
            io.to(room.roomCode).emit('murder_reveal', { type: 'murder', playerName: victim.name, lostGold: 0 });
            
            // Se espectadores estiverem desligados, remover da sala
            if (!room.settings.eliminatedAsSpectator) {
                removePlayerFromRoom(room, victim.id);
            }
        }
    } else if (room.shieldUsed) {
        io.to(room.roomCode).emit('murder_reveal', { type: 'shield', playerName: null });
    } else {
        io.to(room.roomCode).emit('murder_reveal', { type: 'no_one', playerName: null });
    }

    room.roundNumber++;
    if (room.roundNumber > room.totalRounds) {
        room.phase = GAME_PHASES.GAME_OVER;
        io.to(room.roomCode).emit('game_over', { message: "A aventura terminou!" });
        return;
    }

    room.phase = GAME_PHASES.PHASE_1_MISSION;
    room.endMissionVotes = 0;
    room.players.forEach(p => { p.hasEndMissionVote = false; p.evaluation = undefined; p.arsenalChoice = undefined; p.isReadyForPhase = false; });
    
    // CORREÇÃO CRÍTICA: Definir gameMode no topo antes de o usar
    const gameMode = room.settings.gameMode || 'remote';

    // Filtrar aventuras por modo
    const availableAdventures = adventures.filter(a => a.mode === gameMode);
    const randomAdventure = availableAdventures[Math.floor(Math.random() * availableAdventures.length)];
    room.currentMissionData = randomAdventure;
    room.readyCount = 0;

    room.phaseIntroData = {
        title: randomAdventure.title,
        description: randomAdventure.description,
        secretMission: room.players.find(p => p.role === 'traitor')?.secretMissions[0],
        gameMode: gameMode
    };
    
    // Atualizar missões secretas do traidor para a nova ronda
    room.players.forEach(player => {
        if (player.role === 'traitor') {
            player.secretMissions = randomAdventure.traitorSecretMissions || [];
        }
    });

    room.players.forEach(player => {
        const introData = { ...room.phaseIntroData };
        if (player.role === 'traitor') {
            introData.secretMission = player.secretMissions[0]; // Usar a missão dinâmica
        }
        io.to(player.id).emit('phase_intro', introData);
    });
}

function processArsenal(room) {
    const choices = {};
    room.players.filter(p => p.alive).forEach(p => {
        if (p.arsenalChoice !== undefined) {
            choices[p.arsenalChoice] = choices[p.arsenalChoice] || [];
            choices[p.arsenalChoice].push(p);
        }
    });

    let winner = null;
    for (let num = 6; num >= 1; num--) {
        if (choices[num] && choices[num].length === 1) {
            winner = choices[num][0];
            break;
        }
    }

    const rewards = ['2_coins', '1_coin', 'shield', 'dagger'];
    const randomReward = rewards[Math.floor(Math.random() * rewards.length)];

    if (winner) {
        if (randomReward === '2_coins') winner.gold += 2;
        else if (randomReward === '1_coin') winner.gold += 1;
        else winner.inventory.push(randomReward);
    }

    io.to(room.roomCode).emit('arsenal_result', {
        winnerName: winner ? winner.name : 'Ninguém',
        winnerId: winner ? winner.id : null, // ADICIONADO PARA O FRONTEND IDENTIFICAR
        reward: winner ? randomReward : null
    });

    room.players.forEach(p => p.arsenalChoice = undefined);
    setTimeout(() => startMurderPhase(room), 5000);
}

function processBanishment(room) {
    const voteCount = {};
    room.players.filter(p => p.alive).forEach(p => {
        if (p.voteCast) {
            if (Array.isArray(p.voteCast)) {
                p.voteCast.forEach(id => { voteCount[id] = (voteCount[id] || 0) + 1; });
            } else {
                voteCount[p.voteCast] = (voteCount[p.voteCast] || 0) + 1;
            }
        }
    });

    let maxVotes = 0;
    let topPlayersIds = [];
    for (const [id, count] of Object.entries(voteCount)) {
        if (count > maxVotes) {
            maxVotes = count;
            topPlayersIds = [id];
        } else if (count === maxVotes && count > 0) {
            topPlayersIds.push(id);
        }
    }

    const isTie = topPlayersIds.length > 1;
    let banishedName = null;
    let actualLostGold = 0;

    if (maxVotes === 0) {
        // Ninguém votou
    } else if (isTie) {
        topPlayersIds.forEach(id => {
            const player = room.players.find(p => p.id === id);
            if (player) player.gold = Math.max(0, player.gold - 1);
        });
        actualLostGold = 1;
    } else {
        const p = room.players.find(p => p.id === topPlayersIds[0]);
        if (p) {
            p.alive = false;
            if (room.settings.banishedLoseGold) p.gold = Math.max(0, p.gold - 2);
            banishedName = p.name;
            actualLostGold = room.settings.banishedLoseGold ? 2 : 0;
            
            // Se espectadores estiverem desligados, remover da sala
            if (!room.settings.eliminatedAsSpectator) {
                removePlayerFromRoom(room, p.id);
            }
        }
    }

    const revealData = {
        title: "O RESULTADO DA EXPULSÃO",
        description: isTie ? "Todos os jogadores empatados perderam 1 moeda." : (banishedName ? `${banishedName} perdeu ${actualLostGold} moedas.` : "Ninguém foi expulso."),
        banishedName: banishedName,
        lostGold: actualLostGold,
        isTie: isTie
    };

    room.phase = GAME_PHASES.PHASE_3_ARMOURY;
    room.players.forEach(p => p.voteCast = null);

    io.to(room.roomCode).emit('banishment_reveal', revealData);

    setTimeout(() => {
        room.phaseIntroData = {
            title: "O Arsenal",
            description: "Competição individual! O vencedor recebe uma carta de recompensa.",
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
    setInterval(() => { http.get(PUBLIC_URL, (res) => {}).on('error', (e) => {}); }, 240000);
});