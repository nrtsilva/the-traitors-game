const { GAME_PHASES } = require('./constants');
const { rooms, createInitialRoomState, removePlayerFromRoom, convertCoinsToBars } = require('./roomManager');
const { getMissoesPorModo, getArsenalPorModo } = require('./missionLoader');
const {
    loadNewMission,
    completeMission,
    finishMission,
    startBanishmentPhase,
    startMissionTimer,
    startMurderPhase,
    endMurderPhase,
    processArsenal,
    processBanishment,
    proceedToNextRound,
    startWordGuesserGame,
    submitWordGuess,
    startColorReflexGame,
    handleColorReflexClick,
    startTimeStopGame,
    handleTimeStopAttempt,
    startWordBuilderGame,
    validateAndPlaceWord,
    removeLastWord,
    finishWordBuilderPlayer,
    startWordRouletteGame,
    submitWordRouletteGuess,
    startEmojiGuessGame,
    submitEmojiGuess,
    startEmojiCountMission,
    handleEmojiCountNext,
    handleEmojiCountError,
    handleEmojiCountComplete,
    startSilentMimeMission,
    handleSilentMimeCorrect,
    handleSilentMimePass,
    startTicoTecoTacoMission,
    handleTicoTecoTacoCorrect,
    handleTicoTecoTacoError,
    startBlowSurviveGame,
    handleBlowSurviveDecision,
    confirmBlowSurviveWinner,
    startFindOrangesGame,
    handleFindOrangesFlip,
    startSoundsCodeGame,
    handleSoundsCodeDecision,
    confirmSoundsCodeWinner,
    startEightLettersGame,
    handleEightLettersSubmit,
    handleEightLettersVote,
    startMostSuspectMission,
    submitMostSuspectVote,
    submitMostSuspectDecision,
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

                const newPlayer = { id: socket.id, name: cleanName, role: 'unassigned', alive: true, gold: 3, bars: 2, inventory: [], secretMissions: [], secretMissionsCompleted: [], voteCast: null, isReadyForPhase: false };
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
                if (!room || room.hostId !== socket.id) return;

                room.roleRevealReady = 0;
                room.totalAlivePlayers = room.players.filter(p => p.alive).length;

                const minPlayers = 2;
                if (room.players.length < minPlayers) {
                    return callback({
                        success: false,
                        message: `É necessário ter pelo menos ${minPlayers} jogadores na sala para iniciar.`
                    });
                }

                const gameMode = room.settings.gameMode || 'in_person';
                const shuffled = [...room.players].sort(() => Math.random() - 0.5);
                let traitorCount = 1; // Para 2-6 jogadores, é sempre 1

                room.players.forEach(p => { p.role = 'faithful'; p.alive = true; p.gold = 3; p.bars = 2; p.inventory = []; p.secretMissions = []; p.voteCast = null; p.isReadyForPhase = false; });

                for (let i = 0; i < traitorCount; i++) {
                    const t = shuffled[i];
                    const pObj = room.players.find(p => p.id === t.id);
                    if (pObj) pObj.role = 'traitor';
                }

                // Carregar primeira missão
                loadNewMission(room, io);

                if (!room.currentMissionData) {
                    console.error('[start_game] Falha ao carregar missão! room.currentMissionData é undefined.');
                    return callback({ success: false, message: "Erro ao carregar missão. Tente novamente." });
                }

                console.log('[start_game] Missão carregada:', room.currentMissionData.title);

                room.roundNumber = 1;
                room.totalRounds = room.settings.numPhases || 2;
                room.phase = GAME_PHASES.PHASE_1_MISSION;
                room.prizeFund = { bars: 0, coins: 0 };
                room.readyCount = 0;

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
                        players: room.players.map(p => ({ id: p.id, name: p.name, alive: p.alive, role: (p.id === player.id) ? p.role : null, gold: p.gold, bars: p.bars })),
                        secretMissions: (player.role === 'traitor') ? player.secretMissions : []
                    };
                    io.to(player.id).emit('game_started', pState);
                });

                // Enviar introdução da fase
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

        // --- ROLE REVEAL READY (coletivo) ---
        socket.on('role_reveal_ready', ({ roomCode }) => {
            const cleanCode = (roomCode || "").trim().toUpperCase();
            const room = rooms[cleanCode];
            if (!room) return;

            room.roleRevealReady = (room.roleRevealReady || 0) + 1;

            io.to(cleanCode).emit('role_reveal_ready_progress', {
                readyCount: room.roleRevealReady,
                totalPlayers: room.totalAlivePlayers || room.players.filter(p => p.alive).length,
            });

            if (room.roleRevealReady >= (room.totalAlivePlayers || room.players.filter(p => p.alive).length)) {
                io.to(cleanCode).emit('role_reveal_all_ready');
            }
        });
		
		// --- CLIENTE PRONTO PARA MISSÃO (re-emite o estado da missão em curso) ---
		socket.on('mission_client_ready', ({ roomCode }) => {
			const cleanCode = (roomCode || "").trim().toUpperCase();
			const room = rooms[cleanCode];
			if (!room) return;

			const missionType = room.currentMissionData?.type;
			if (!missionType) return;

			console.log(`[mission_client_ready] ${missionType} para ${socket.id}`);

			// ===== SILENT_MIME =====
			if (missionType === 'SILENT_MIME') {
				if (!room.silentMime) {
					// Ainda não arrancou — inicia agora
					console.log('[mission_client_ready] Forçar startSilentMimeMission');
					startSilentMimeMission(room, io);
				} else {
					// Já arrancou — reenvia o estado
					io.to(socket.id).emit('silent_mime_start', {
						timeLimit: room.silentMime.timeLimit,
						themeLabel: room.silentMime.themeLabel,
						totalWords: room.silentMime.words.length,
					});
				}
			}

			// ===== EMOJI_COUNT (após corrigir o tipo) =====
			if (missionType === 'EMOJI_COUNT') {
				if (!room.emojiCount) {
					startEmojiCountMission(room, io);
				} else {
					io.to(socket.id).emit('emoji_count_start', {
						timeLimit: room.emojiCount.timeLimit,
						maxLevel: room.emojiCount.maxLevel,
						substitutions: room.emojiCount.substitutions,
						currentLevel: room.emojiCount.currentLevel,
					});
				}
			}

			// ===== TICO_TECO_TACO =====
			if (missionType === 'TICO_TECO_TACO') {
				if (!room.ticoTecoTaco) {
					startTicoTecoTacoMission(room, io);
				} else {
					io.to(socket.id).emit('ttt_start', {
						timeLimit: room.ticoTecoTaco.timeLimit,
						responseTimeLimit: room.ticoTecoTaco.responseTimeLimit,
						targetCorrect: room.ticoTecoTaco.targetCorrect,
					});
				}
			}

			// ===== MOST_SUSPECT =====
			if (missionType === 'MOST_SUSPECT') {
				if (!room.mostSuspect) {
					startMostSuspectMission(room, io);
				} else {
					io.to(socket.id).emit('most_suspect_start', {
						timeLimit: room.mostSuspect.timeLimit,
						totalQuestions: room.mostSuspect.questions.length,
					});
				}
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
                if (player.isReadyForPhase) return;

                player.isReadyForPhase = true;
                room.readyCount++;
                const aliveCount = room.players.filter(p => p.alive).length;
                io.to(cleanCode).emit('player_status_update', { readyCount: room.readyCount, totalNeeded: aliveCount });

                if (room.readyCount < aliveCount) return;

                // ---- TODOS PRONTOS ----
                room.players.forEach(p => p.isReadyForPhase = false);
                room.readyCount = 0;

                // FASE 2: BANISHMENT
                if (room.phase === GAME_PHASES.PHASE_2_BANISHMENT) {
                    const debateTime = room.settings.debateTime || 60;
                    io.to(cleanCode).emit('phase_started', { phase: room.phase, timer: debateTime });
                    clearTimeout(room.phaseTimer);
                    room.phaseTimer = setTimeout(() => processBanishment(room, io), debateTime * 1000);
                    return;
                }

                // FASE 3: ARMOURY
                if (room.phase === GAME_PHASES.PHASE_3_ARMOURY) {
                    if (!room.currentArsenalTask) {
                        const tarefasArsenal = getArsenalPorModo(room.settings.gameMode);
                        const tarefaAleatoria = tarefasArsenal[Math.floor(Math.random() * tarefasArsenal.length)];
                        room.currentArsenalTask = tarefaAleatoria;
                        io.to(cleanCode).emit('arsenal_task', { task: tarefaAleatoria });

                        const tipo = tarefaAleatoria.type;
                        setTimeout(() => {
                            if (tipo === 'WORD_COMBINATION')  startWordGuesserGame(room, io);
                            if (tipo === 'COLOR_REFLEX')      startColorReflexGame(room, io);
                            if (tipo === 'PRECISION_TIMER')   startTimeStopGame(room, io);
                            if (tipo === 'WORD_BUILDER')      startWordBuilderGame(room, io);
                            if (tipo === 'WORD_ROULETTE')     startWordRouletteGame(room, io);
                            if (tipo === 'EMOJI_GUESS')       startEmojiGuessGame(room, io);
                            if (tipo === 'BLOW_SURVIVE')      startBlowSurviveGame(room, io);
                            if (tipo === 'FIND_ORANGES')      startFindOrangesGame(room, io);
                            if (tipo === 'SOUNDS_CODE')       startSoundsCodeGame(room, io);
                            if (tipo === 'EIGHT_LETTERS')     startEightLettersGame(room, io);
                        }, 2000);
                    }
                    return;
                }

                // FASE 1: MISSION
                const missionType = room.currentMissionData?.type;
                const isSpecialMission = [
                    'SILENT_MIME', 'EMOJI_COUNT', 'TICO_TECO_TACO', 'MOST_SUSPECT',
                ].includes(missionType);

                if (isSpecialMission) {
                    // Missões especiais gerem o seu próprio tempo.
                    io.to(cleanCode).emit('phase_started', {
                        phase: room.phase,
                        timer: null,
                        roundNumber: room.roundNumber,
                    });

                    console.log(`[player_ready] Missão especial: ${missionType}. A iniciar em 2s...`);
                    setTimeout(() => {
                        if (missionType === 'SILENT_MIME')     startSilentMimeMission(room, io);
                        if (missionType === 'EMOJI_COUNT')     startEmojiCountMission(room, io);
                        if (missionType === 'TICO_TECO_TACO')  startTicoTecoTacoMission(room, io);
                        if (missionType === 'MOST_SUSPECT')    startMostSuspectMission(room, io);
                    }, 2000);
                    return;
                }

                // Missão normal
                io.to(cleanCode).emit('phase_started', {
                    phase: room.phase,
                    timer: room.currentMissionData.timeLimit,
                    roundNumber: room.roundNumber,
                });
                startMissionTimer(room, io);
            } catch (error) {
                console.error("Erro no player_ready:", error);
            }
        });

        // --- 8 LETRAS: submeter respostas ---
        socket.on('eight_letters_submit', ({ roomCode, answers }) => {
            const cleanCode = (roomCode || "").trim().toUpperCase();
            const room = rooms[cleanCode];
            if (!room || !room.eightLetters) return;
            handleEightLettersSubmit(room, io, socket.id, answers);
        });

        // --- 8 LETRAS: validar (aceitar/rejeitar) ---
        socket.on('eight_letters_vote', ({ roomCode, vote }) => {
            const cleanCode = (roomCode || "").trim().toUpperCase();
            const room = rooms[cleanCode];
            if (!room || !room.eightLetters) return;
            handleEightLettersVote(room, io, vote);
        });

        // --- SOUNDS CODE: supervisores registam resultado ---
        socket.on('sounds_code_decision', ({ roomCode, result }) => {
            const cleanCode = (roomCode || "").trim().toUpperCase();
            const room = rooms[cleanCode];
            if (!room || !room.soundsCode) return;
            handleSoundsCodeDecision(room, io, result);
        });

        // --- SOUNDS CODE: confirmar vencedor ---
        socket.on('sounds_code_confirm_winner', ({ roomCode, winnerId }) => {
            const cleanCode = (roomCode || "").trim().toUpperCase();
            const room = rooms[cleanCode];
            if (!room || !room.soundsCode) return;
            confirmSoundsCodeWinner(room, io, winnerId);
        });

        // --- TIME STOP: TENTATIVA DE PARAGEM ---
        socket.on('time_stop_attempt', ({ roomCode, elapsedSeconds }) => {
            const cleanCode = (roomCode || "").trim().toUpperCase();
            const room = rooms[cleanCode];
            if (!room || !room.timeStop) return;

            const player = room.players.find(p => p.id === socket.id);
            if (!player || !player.alive) return;

            handleTimeStopAttempt(room, io, socket.id, { elapsedSeconds });
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
                    startBanishmentPhase(room, io);
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

        // --- FIND ORANGES: virar carta ---
        socket.on('find_oranges_flip', ({ roomCode, cardId }) => {
            const cleanCode = (roomCode || "").trim().toUpperCase();
            const room = rooms[cleanCode];
            if (!room || !room.findOranges) return;
            const player = room.players.find(p => p.id === socket.id);
            if (!player || !player.alive) return;
            handleFindOrangesFlip(room, io, socket.id, cardId);
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
            completeMission(room, outcome, io);
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
					room.lastMissionReward = reward;
					room.currentMissionData.requiresPlayerChoice = true;
					room.players.forEach(p => p.missionValue = undefined);
					completeMission(room, true, io);
                }
            } catch (error) {
                console.error("Erro no submit_mission_value:", error);
            }
        });

        // --- SUBMIT CATEGORY CHOICE (para missões do tipo CATEGORY_CHOICE) ---
        socket.on('submit_category_choice', ({ roomCode, choice }, callback) => {
            try {
                const cleanCode = (roomCode || "").trim().toUpperCase();
                const room = rooms[cleanCode];

                if (!room) {
                    console.error(`[submit_category_choice] Sala ${cleanCode} não encontrada.`);
                    return callback?.({ success: false, message: "Sala não encontrada." });
                }
                if (room.phase !== GAME_PHASES.PHASE_1_MISSION) {
                    console.error(`[submit_category_choice] Sala ${cleanCode} não está na fase de missão.`);
                    return callback?.({ success: false, message: "A missão já terminou." });
                }
                if (!room.currentMissionData?.requiresPlayerChoice) {
                    console.error(`[submit_category_choice] Missão atual não requer escolha dos jogadores.`);
                    return callback?.({ success: false, message: "Esta missão não pede escolhas." });
                }

                let player = room.players.find(p => p.id === socket.id);
                if (!player) {
                    player = room.players.find(p => p.alive && p.categoryChoice === undefined);
                    if (player) {
                        player.id = socket.id;
                        console.log(`[DEBUG] Socket ID mudou! Atualizando ${player.name} para ${socket.id}`);
                    }
                }
                if (!player || !player.alive) {
                    console.error(`[submit_category_choice] Jogador não encontrado ou já eliminado.`);
                    return callback?.({ success: false, message: "Jogador não encontrado." });
                }

                const options = room.currentMissionData.options || [];
                if (choice === undefined || choice === null || choice < 0 || choice >= options.length) {
                    console.error(`[submit_category_choice] Escolha inválida: ${choice}`);
                    return callback?.({ success: false, message: "Escolha inválida." });
                }

                player.categoryChoice = choice;
                room.categoryChoicesCount = (room.categoryChoicesCount || 0) + 1;

                const alivePlayers = room.players.filter(p => p.alive);

                if (room.categoryChoicesCount >= alivePlayers.length) {
                    const choices = alivePlayers.map(p => p.categoryChoice);
                    const uniqueChoices = new Set(choices);
                    const reward = uniqueChoices.size;

                    room.prizeFund.coins += reward;
                    convertCoinsToBars(room);
                    room.lastMissionReward = reward;

                    room.players.forEach(p => p.categoryChoice = undefined);
                    room.categoryChoicesCount = 0;

                    completeMission(room, true, io);
                }

                if (typeof callback === 'function') callback({ success: true });
            } catch (error) {
                console.error("Erro no submit_category_choice:", error);
                if (typeof callback === 'function') {
                    callback({ success: false, message: error.message || "Erro interno." });
                }
            }
        });

        // --- EMOJI GUESS: submeter palavra ---
        socket.on('emoji_guess_submit', ({ roomCode, word }) => {
            const cleanCode = (roomCode || "").trim().toUpperCase();
            const room = rooms[cleanCode];
            if (!room || !room.emojiGuess) return;
            const player = room.players.find(p => p.id === socket.id);
            if (!player || !player.alive) return;
            submitEmojiGuess(room, io, socket.id, word);
        });

        // --- WORD ROULETTE: submeter palavra ---
        socket.on('word_roulette_submit', ({ roomCode, word }) => {
            const cleanCode = (roomCode || "").trim().toUpperCase();
            const room = rooms[cleanCode];
            if (!room || !room.wordRoulette) return;
            const player = room.players.find(p => p.id === socket.id);
            if (!player || !player.alive) return;
            submitWordRouletteGuess(room, io, socket.id, word);
        });

        // --- TICO TECO TACO: ACERTOU ---
        socket.on('ttt_correct', ({ roomCode }) => {
            const cleanCode = (roomCode || "").trim().toUpperCase();
            const room = rooms[cleanCode];
            if (!room || !room.ticoTecoTaco) return;
            handleTicoTecoTacoCorrect(room, io);
        });

        // --- TICO TECO TACO: ERROU ---
        socket.on('ttt_error', ({ roomCode }) => {
            const cleanCode = (roomCode || "").trim().toUpperCase();
            const room = rooms[cleanCode];
            if (!room || !room.ticoTecoTaco) return;
            handleTicoTecoTacoError(room, io);
        });

        // --- SILENT MIME: acertou ---
        socket.on('silent_mime_correct', ({ roomCode }) => {
            const cleanCode = (roomCode || "").trim().toUpperCase();
            const room = rooms[cleanCode];
            if (!room || !room.silentMime) return;
            handleSilentMimeCorrect(room, io, socket.id);
        });

        // --- SILENT MIME: passar palavra ---
        socket.on('silent_mime_pass', ({ roomCode }) => {
            const cleanCode = (roomCode || "").trim().toUpperCase();
            const room = rooms[cleanCode];
            if (!room || !room.silentMime) return;
            handleSilentMimePass(room, io);
        });

        // --- JOGO WORD BUILDER: adicionar palavra ---
        socket.on('word_builder_add', ({ roomCode, word, row, col, orientation }) => {
            const cleanCode = (roomCode || "").trim().toUpperCase();
            const room = rooms[cleanCode];
            if (!room || !room.wordBuilder) return;
            const player = room.players.find(p => p.id === socket.id);
            if (!player || !player.alive) return;

            const result = validateAndPlaceWord(room, io, socket.id, word, row, col, orientation);
            if (!result.success) {
                io.to(socket.id).emit('word_builder_error', { message: result.message });
            }
        });

        // --- JOGO WORD BUILDER: remover última palavra ---
        socket.on('word_builder_remove_last', ({ roomCode }) => {
            const cleanCode = (roomCode || "").trim().toUpperCase();
            const room = rooms[cleanCode];
            if (!room || !room.wordBuilder) return;
            const player = room.players.find(p => p.id === socket.id);
            if (!player || !player.alive) return;
            removeLastWord(room, io, socket.id);
        });

        // --- JOGO WORD BUILDER: terminar ---
        socket.on('word_builder_finish', ({ roomCode }) => {
            const cleanCode = (roomCode || "").trim().toUpperCase();
            const room = rooms[cleanCode];
            if (!room || !room.wordBuilder) return;
            const player = room.players.find(p => p.id === socket.id);
            if (!player || !player.alive) return;
            finishWordBuilderPlayer(room, io, socket.id);
        });

        // --- JOGO "O QUE VEM A SEGUIR?" — SUBMETER RESPOSTA ---
        socket.on('submit_word_guess', ({ roomCode, guess }) => {
            const cleanCode = (roomCode || "").trim().toUpperCase();
            const room = rooms[cleanCode];
            if (!room || !room.wordGuesser) return;

            const player = room.players.find(p => p.id === socket.id);
            if (!player || !player.alive) return;

            submitWordGuess(room, io, socket.id, guess);
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

        // --- EMOJI COUNT: PRÓXIMO NÍVEL ---
        socket.on('emoji_count_next', ({ roomCode }) => {
            const cleanCode = (roomCode || "").trim().toUpperCase();
            const room = rooms[cleanCode];
            if (!room || !room.emojiCount) return;
            handleEmojiCountNext(room, io);
        });

        // --- EMOJI COUNT: REGISTAR ERRO ---
        socket.on('emoji_count_error', ({ roomCode }) => {
            const cleanCode = (roomCode || "").trim().toUpperCase();
            const room = rooms[cleanCode];
            if (!room || !room.emojiCount) return;
            handleEmojiCountError(room, io);
        });

        // --- EMOJI COUNT: CONCLUIR MISSÃO ---
        socket.on('emoji_count_complete', ({ roomCode }) => {
            const cleanCode = (roomCode || "").trim().toUpperCase();
            const room = rooms[cleanCode];
            if (!room || !room.emojiCount) return;
            handleEmojiCountComplete(room, io);
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
		
		// --- MOST SUSPECT: votar num jogador ---
		socket.on('most_suspect_vote', ({ roomCode, targetId }) => {
			const cleanCode = (roomCode || "").trim().toUpperCase();
			const room = rooms[cleanCode];
			if (!room || !room.mostSuspect) return;
			submitMostSuspectVote(room, io, socket.id, targetId);
		});

		// --- MOST SUSPECT: escolher A ou B ---
		socket.on('most_suspect_decision', ({ roomCode, choiceId }) => {
			const cleanCode = (roomCode || "").trim().toUpperCase();
			const room = rooms[cleanCode];
			if (!room || !room.mostSuspect) return;
			submitMostSuspectDecision(room, io, choiceId);
		});

        // --- BLOW SURVIVE: supervisores registam resultado ---
        socket.on('blow_survive_decision', ({ roomCode, result }) => {
            const cleanCode = (roomCode || "").trim().toUpperCase();
            const room = rooms[cleanCode];
            if (!room || !room.blowSurvive) return;
            handleBlowSurviveDecision(room, io, result);
        });

        // --- BLOW SURVIVE: confirmar vencedor final ---
        socket.on('blow_survive_confirm_winner', ({ roomCode, winnerId }) => {
            const cleanCode = (roomCode || "").trim().toUpperCase();
            const room = rooms[cleanCode];
            if (!room || !room.blowSurvive) return;
            confirmBlowSurviveWinner(room, io, winnerId);
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