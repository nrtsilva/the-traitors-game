const { GAME_PHASES } = require('./constants');
const { rooms, createInitialRoomState, removePlayerFromRoom } = require('./roomManager');
const { getMissoesPorModo, getArsenalPorModo } = require('./missionLoader');
const {
    loadNewMission,
    startMissionTimer,
    startMurderPhase,
    endMurderPhase,
    processArsenal,
    processBanishment,
    proceedToNextRound
} = require('./gameLogic');

function registerSocketHandlers(io) {
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

        // --- ATUALIZAR CONFIGURAÇÕES ---
        socket.on('update_settings', ({ roomCode, newSettings }, callback) => {
            try {
                const cleanCode = (roomCode || "").trim().toUpperCase();
                const room = rooms[cleanCode];
                if (!room || room.hostId !== socket.id) return;

                let updatedSettings = { ...room.settings, ...newSettings };
                if (updatedSettings.maxPlayers <= 6) {
                    updatedSettings.numTraitors = 1;
                    updatedSettings.recruitingActive = false;
                } else {
                    updatedSettings.numTraitors = (updatedSettings.numTraitors === 2) ? 2 : 1;
                }
                room.settings = updatedSettings;
                io.to(cleanCode).emit('settings_updated', room.settings);
                if (typeof callback === 'function') callback({ success: true, settings: room.settings });
            } catch (error) {
                console.error("Erro no update_settings:", error);
            }
        });

        // --- INICIAR JOGO ---
        socket.on('start_game', ({ roomCode }, callback) => {
            try {
                const cleanCode = (roomCode || "").trim().toUpperCase();
                const room = rooms[cleanCode];
                if (!room || room.hostId !== socket.id) {
                    return callback({ success: false, message: "Não autorizado." });
                }

                // Reset de estados gerais
                room.endMissionVotes = 0;
                room.players.forEach(p => p.hasEndMissionVote = false);

                const minPlayers = 2;
                if (room.players.length < minPlayers) {
                    return callback({
                        success: false,
                        message: `É necessário ter pelo menos ${minPlayers} jogadores na sala para iniciar. Ajusta o número de jogadores nas configurações ou convida mais amigos.`
                    });
                }

                const gameMode = room.settings.gameMode || 'in_person';
                const shuffled = [...room.players].sort(() => Math.random() - 0.5);

                // Número de traidores baseado na configuração (com limite para <=6)
                let traitorCount = room.settings.numTraitors || 1;
                if (room.players.length <= 6) traitorCount = 1;

                // Reset completo dos jogadores
                room.players.forEach(p => {
                    p.role = 'faithful';
                    p.alive = true;
                    p.gold = 3;
                    p.bars = 0;
                    p.inventory = [];
                    p.secretMissions = [];
                    p.secretMissionsCompleted = [];
                    p.voteCast = null;
                    p.isReadyForPhase = false;
                    p.evaluation = undefined;
                    p.missionValue = undefined;
                });

                // Atribuir papéis de traidor
                for (let i = 0; i < traitorCount; i++) {
                    const t = shuffled[i];
                    const pObj = room.players.find(p => p.id === t.id);
                    if (pObj) pObj.role = 'traitor';
                }

                // Inicializar estado do jogo
                room.roundNumber = 1;
                room.totalRounds = room.settings.numPhases || 2;
                room.phase = GAME_PHASES.PHASE_1_MISSION;
                room.prizeFund = { bars: 0, coins: 0 };
                room.readyCount = 0;

                // Carregar a primeira missão usando a função auxiliar
                loadNewMission(room, io);

                // Enviar estado inicial para cada jogador
                room.players.forEach(player => {
                    const pState = {
                        phase: room.phase,
                        roundNumber: room.roundNumber,
                        settings: room.settings,
                        prizeFund: room.prizeFund,
                        currentMission: room.currentMissionData,
                        reward: room.currentMissionData.reward,
                        role: player.role,
                        gameMode: gameMode,
                        roomCode: cleanCode,
                        gold: player.gold,
                        bars: player.bars,
                        players: room.players.map(p => ({
                            id: p.id,
                            name: p.name,
                            alive: p.alive,
                            role: (p.id === player.id) ? p.role : null,
                            gold: p.gold,
                            bars: p.bars
                        })),
                        secretMissions: player.secretMissions || []
                    };
                    io.to(player.id).emit('game_started', pState);
                });

                // Enviar introdução da fase a cada jogador (com ou sem missão secreta)
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

        // --- PLAYER READY ---
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
                    io.to(cleanCode).emit('player_status_update', { readyCount: room.readyCount, totalNeeded: aliveCount });

                    if (room.readyCount >= aliveCount) {
                        room.players.forEach(p => p.isReadyForPhase = false);
                        room.readyCount = 0;

                        if (room.phase === GAME_PHASES.PHASE_2_BANISHMENT) {
                            const debateTime = room.settings.debateTime || 60;
                            io.to(cleanCode).emit('phase_started', { phase: room.phase, timer: debateTime });
                            clearTimeout(room.phaseTimer);
                            room.phaseTimer = setTimeout(() => processBanishment(room, io), debateTime * 1000);
                        } else if (room.phase === GAME_PHASES.PHASE_3_ARMOURY) {
                            io.to(cleanCode).emit('phase_started', { phase: room.phase, timer: null });
                            const tarefasArsenal = getArsenalPorModo(room.settings.gameMode);
                            const tarefaAleatoria = tarefasArsenal[Math.floor(Math.random() * tarefasArsenal.length)];
                            room.currentArsenalTask = tarefaAleatoria;
                            io.to(cleanCode).emit('arsenal_task', { task: tarefaAleatoria });
                        } else {
                            io.to(cleanCode).emit('phase_started', { phase: room.phase, timer: room.currentMissionData.timeLimit });
                            startMissionTimer(room, io);
                        }
                    }
                }
            } catch (error) {
                console.error("Erro no player_ready:", error);
            }
        });

        // --- SUBMETER AVALIAÇÃO ---
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
                    player.secretMissionsCompleted = [data.value];
                }
                player.evaluation = data;

                const alivePlayers = room.players.filter(p => p.alive);
                const allEvaluated = alivePlayers.every(p => p.evaluation !== undefined);

                if (allEvaluated) {
                    room.players.forEach(p => p.evaluation = undefined);
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

        // --- VOTO DE EXPULSÃO ---
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

                if (useDagger) {
                    player.voteCast = [targetPlayerId, targetPlayerId];
                    const daggerIndex = player.inventory.indexOf('dagger');
                    if (daggerIndex !== -1) player.inventory.splice(daggerIndex, 1);
                } else {
                    player.voteCast = targetPlayerId;
                }

                const allVoted = room.players.filter(p => p.alive).every(p => p.voteCast !== null);
                if (allVoted) {
                    clearTimeout(room.phaseTimer);
                    processBanishment(room, io);
                }
                if (typeof callback === 'function') callback({ success: true });
            } catch (error) {
                console.error("Erro no voto:", error);
            }
        });

        // --- TRAIDOR ESCOLHE AÇÃO ---
        socket.on('traitor_choice', ({ roomCode, action }) => {
            const cleanCode = (roomCode || "").trim().toUpperCase();
            const room = rooms[cleanCode];
            if (!room || room.phase !== GAME_PHASES.PHASE_4_MURDER) return;

            const traitor = room.players.find(p => p.id === socket.id);
            if (!traitor || traitor.role !== 'traitor') return;

            if (action === 'kill') {
                io.to(traitor.id).emit('show_player_list', { type: 'kill' });
                return;
            }
            if (action === 'skip') {
                room.murderedThisRound = null;
                room.recruitPending = false;
                io.to(cleanCode).emit('decoy_question');
                room.pendingDecoys = room.players.filter(p => p.alive).length;
                return;
            }
            if (action === 'recruit') {
                io.to(traitor.id).emit('show_player_list', { type: 'recruit' });
                return;
            }
        });

        // --- MURDER CHOICE ---
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

        // --- RECRUIT CHOICE ---
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

        // --- DECOY ANSWER ---
        socket.on('decoy_answer', ({ roomCode }) => {
            const cleanCode = (roomCode || "").trim().toUpperCase();
            const room = rooms[cleanCode];
            if (!room) return;

            if (room.pendingDecoys > 0) {
                room.pendingDecoys--;
                if (room.pendingDecoys === 0) {
                    if (!room.recruitPending) {
                        endMurderPhase(room, io);
                    }
                }
            }
        });

        // --- RECRUIT DECISION ---
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
                endMurderPhase(room, io);
            }
        });

        // --- CONTINUE AFTER REVEAL ---
        socket.on('continue_after_reveal', ({ roomCode }) => {
            const cleanCode = (roomCode || "").trim().toUpperCase();
            const room = rooms[cleanCode];
            if (!room) return;

            room.continueVotes++;
            const aliveCount = room.players.filter(p => p.alive).length;

            if (room.continueVotes >= aliveCount) {
                room.continueVotes = 0;
                proceedToNextRound(room, io);
            }
        });

        // --- END MISSION ---
        socket.on('end_mission', ({ roomCode, outcome }) => {
            const cleanCode = (roomCode || "").trim().toUpperCase();
            const room = rooms[cleanCode];
            if (!room || room.phase !== GAME_PHASES.PHASE_1_MISSION) return;

            if (outcome) {
                const reward = parseInt(room.currentMissionData.reward) || 0;
                room.prizeFund.coins += reward;
                convertCoinsToBars(room);
            }

            room.players.forEach(p => p.hasEndMissionVote = false);
            room.endMissionVotes = 0;
            io.to(cleanCode).emit('mission_evaluation');
        });

        // --- SUBMIT MISSION VALUE (ex: Footsies) ---
        socket.on('submit_mission_value', ({ roomCode, value }) => {
            try {
                const cleanCode = (roomCode || "").trim().toUpperCase();
                const room = rooms[cleanCode];
                if (!room || room.phase !== GAME_PHASES.PHASE_1_MISSION) return;
                if (!room.currentMissionData.requiresNumberInput) return;

                let player = room.players.find(p => p.id === socket.id);
                if (!player) {
                    player = room.players.find(p => p.alive);
                    if (player) player.id = socket.id;
                }
                if (!player || !player.alive) return;

                player.missionValue = parseInt(value);
                const alivePlayers = room.players.filter(p => p.alive);
                const allSubmitted = alivePlayers.every(p => p.missionValue !== undefined);

                if (allSubmitted) {
                    const total = alivePlayers.reduce((sum, p) => sum + p.missionValue, 0);
                    const average = Math.round(total / alivePlayers.length);
                    const reward = Math.floor(average / 4);
                    room.prizeFund.coins += reward;
                    convertCoinsToBars(room);
                    room.players.forEach(p => p.missionValue = undefined);
                    io.to(cleanCode).emit('mission_evaluation');
                }
            } catch (error) {
                console.error("Erro no submit_mission_value:", error);
            }
        });

        // --- DRAWING (colaborativo) ---
        socket.on('drawing_update', ({ roomCode, drawing }) => {
            const cleanCode = (roomCode || "").trim().toUpperCase();
            const room = rooms[cleanCode];
            if (!room || !room.drawingState) return;

            const currentDrawerId = room.drawingState.order[room.drawingState.currentDrawerIndex];
            if (socket.id === currentDrawerId) {
                io.to(cleanCode).emit('drawing_update', { drawing });
            }
        });

        socket.on('next_drawer', ({ roomCode }) => {
            const cleanCode = (roomCode || "").trim().toUpperCase();
            const room = rooms[cleanCode];
            if (!room || !room.drawingState) return;

            const currentDrawerId = room.drawingState.order[room.drawingState.currentDrawerIndex];
            if (socket.id !== currentDrawerId) return;

            room.drawingState.currentDrawerIndex++;
            if (room.drawingState.currentDrawerIndex >= room.drawingState.order.length - 1) {
                io.to(room.drawingState.guesserId).emit('drawing_status', { type: 'guessing', isYourTurn: true });
            } else {
                const nextId = room.drawingState.order[room.drawingState.currentDrawerIndex];
                io.to(nextId).emit('drawing_status', { type: 'turn_started', isYourTurn: true });
                room.players.forEach(p => {
                    if (p.id !== nextId && p.id !== room.drawingState.guesserId) {
                        io.to(p.id).emit('drawing_status', { type: 'drawer', secretWord: room.drawingState.secretWord, isYourTurn: false });
                    }
                });
            }
        });

        socket.on('drawing_guess', ({ roomCode, guess }) => {
            const cleanCode = (roomCode || "").trim().toUpperCase();
            const room = rooms[cleanCode];
            if (!room || !room.drawingState) return;
            if (socket.id !== room.drawingState.guesserId) return;

            if (guess.trim().toUpperCase() === room.drawingState.secretWord) {
                io.to(cleanCode).emit('mission_evaluation');
            } else {
                io.to(socket.id).emit('drawing_status', { type: 'guessing', isYourTurn: true, error: "Não foi dessa vez. Tenta novamente." });
            }
        });

        // --- ARSENAL: STOP PLANK ---
        socket.on('stop_plank', ({ roomCode, elapsedTime }) => {
            const cleanCode = (roomCode || "").trim().toUpperCase();
            const room = rooms[cleanCode];
            if (!room || !room.currentArsenalTask) return;
            room.currentArsenalTask.actualTime = elapsedTime;
            console.log(`[Arsenal] Tempo de prancha parado em ${elapsedTime}s`);
        });

        // --- ARSENAL: SUBMIT RESULT ---
        socket.on('submit_arsenal_task_result', ({ roomCode, resultData }, callback) => {
            try {
                const cleanCode = (roomCode || "").trim().toUpperCase();
                const room = rooms[cleanCode];
                if (!room || room.phase !== GAME_PHASES.PHASE_3_ARMOURY) return;

                let player = room.players.find(p => p.id === socket.id);
                if (!player) {
                    player = room.players.find(p => p.alive);
                    if (player) player.id = socket.id;
                }
                if (!player || !player.alive) return;

                player.arsenalTaskResult = resultData;
                room.arsenalReadyCount++;

                const alivePlayers = room.players.filter(p => p.alive);
                if (room.arsenalReadyCount >= alivePlayers.length) {
                    const task = room.currentArsenalTask;
                    let winner = null;
                    let bestScore = -Infinity;

                    if (task.type === 'TIME_GUESS') {
                        const actualTime = task.actualTime || 30;
                        let bestDiff = Infinity;
                        alivePlayers.forEach(p => {
                            const guess = p.arsenalTaskResult.guessTime || 0;
                            const diff = Math.abs(guess - actualTime);
                            if (diff < bestDiff) {
                                bestDiff = diff;
                                winner = p;
                            }
                        });
                    } else {
                        alivePlayers.forEach(p => {
                            const count = (p.arsenalTaskResult.items || []).length;
                            if (count > bestScore) {
                                bestScore = count;
                                winner = p;
                            }
                        });
                    }

                    const rewards = ['2_coins', '1_coin', 'shield', 'dagger'];
                    const randomReward = rewards[Math.floor(Math.random() * rewards.length)];
                    processArsenal(room, winner, randomReward, io);
                }
                if (typeof callback === 'function') callback({ success: true });
            } catch (error) {
                console.error("Erro no submit_arsenal_task_result:", error);
            }
        });

        // --- DISCONNECT ---
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
}

module.exports = { registerSocketHandlers };