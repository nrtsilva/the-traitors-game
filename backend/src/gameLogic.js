const { GAME_PHASES } = require('./constants');
const { getMissoesPorModo, getArsenalPorModo } = require('./missionLoader');
const { rooms, convertCoinsToBars, removePlayerFromRoom } = require('./roomManager');

// --- NOVA FUNÇÃO: Completar missão com outcome ---
function completeMission(room, outcome, io) {
    if (outcome) {
        // Adiciona a recompensa ao pote comum
        const reward = parseInt(room.currentMissionData.reward) || 0;
        room.prizeFund.coins += reward;
        convertCoinsToBars(room);
        console.log(`[Missão] Sucesso! Adicionado ${reward} moedas ao pote.`);
    } else {
        console.log('[Missão] Falha! Nenhum prémio adicionado.');
    }

    // Avança para a próxima fase (Expulsão ou Avaliação)
    // Se a missão requer avaliação (estrelas), emitir mission_evaluation
    // Caso contrário, ir diretamente para Expulsão
    if (room.currentMissionData.requiresUserOutcome) {
        // Missões que já tiveram o veredito dos jogadores: saltar avaliação
        startBanishmentPhase(room, io);
    } else {
        // Missões com avaliação automática: pedir avaliação (estrelas)
        io.to(room.roomCode).emit('mission_evaluation');
    }
}

function startBanishmentPhase(room, io) {
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

// --- NOVA FUNÇÃO AUXILIAR: Carregar uma nova missão para a sala ---
function loadNewMission(room) {
    const gameMode = room.settings.gameMode || 'in_person';
    const missoes = getMissoesPorModo(gameMode);
    const randomMissao = missoes[Math.floor(Math.random() * missoes.length)];

    // Atualiza os dados da missão na sala
    room.currentMissionData = randomMissao;
    room.readyCount = 0;

    // Escolher uma missão secreta aleatória para o traidor (se existir)
    const secretMissionsList = randomMissao.traitorSecretMissions || [];
    const selectedSecret = secretMissionsList.length > 0
        ? [secretMissionsList[Math.floor(Math.random() * secretMissionsList.length)]]
        : [];

    // Atribuir a todos os jogadores
    room.players.forEach(player => {
        if (player.role === 'traitor') {
            player.secretMissions = selectedSecret;
        } else {
            player.secretMissions = [];
        }
        // Reset de estados específicos da missão
        player.evaluation = undefined;
        player.arsenalChoice = undefined;
        player.isReadyForPhase = false;
        player.missionValue = undefined;
    });

    // Se for uma missão de desenho colaborativo, preparar o estado de desenho
    if (randomMissao.type === 'COLLABORATIVE_DRAWING') {
        const ids = room.players.filter(p => p.alive).map(p => p.id);
        const guesserId = ids[ids.length - 1];
        const secretWords = randomMissao.secretWords || ["BICICLETA"];
        const secretWord = secretWords[Math.floor(Math.random() * secretWords.length)];

        room.drawingState = {
            order: ids,
            currentDrawerIndex: 0,
            secretWord: secretWord,
            guesserId: guesserId
        };

        room.players.forEach(player => {
            if (player.id === guesserId) {
                io.to(player.id).emit('drawing_status', { type: 'guesser', isYourTurn: false });
            } else {
                const isDrawerTurn = (player.id === ids[0]);
                io.to(player.id).emit('drawing_status', {
                    type: 'drawer',
                    secretWord: secretWord,
                    isYourTurn: isDrawerTurn
                });
            }
        });
    }

    // Preparar os dados de introdução da fase
    const traitor = room.players.find(p => p.role === 'traitor' && p.alive);
    const secretMissionForIntro = traitor ? traitor.secretMissions[0] : null;

    room.phaseIntroData = {
        title: randomMissao.title,
        description: randomMissao.description,
        secretMission: secretMissionForIntro,
        gameMode: gameMode
    };

    return randomMissao;
}

// --- As restantes funções (startMissionTimer, startMurderPhase, etc.) permanecem iguais ---
function startMissionTimer(room, io) {
    if (room.phaseTimer) clearTimeout(room.phaseTimer);
    const timeLimitMs = (room.currentMissionData.timeLimit || 120) * 1000;
    room.phaseTimer = setTimeout(() => {
        // Quando o tempo acaba, tratar como falha (outcome = false)
        completeMission(room, false, io);
    }, timeLimitMs);
}

function startMurderPhase(room, io) {
    room.phase = GAME_PHASES.PHASE_4_MURDER;
    room.recruitPending = false;
    room.murderedThisRound = null;

    io.to(room.roomCode).emit('phase_started', {
        phase: room.phase,
        timer: null,
        roundNumber: room.roundNumber
    });

    io.to(room.roomCode).emit('blindfold_begin', { duration: 10 });

    setTimeout(() => {
        try {
            let traitor = room.players.find(p => p.role === 'traitor' && p.alive);
            if (!traitor) {
                io.to(room.roomCode).emit('decoy_question');
                room.pendingDecoys = room.players.filter(p => p.alive).length;
                return;
            }

            const completedMission = traitor.secretMissionsCompleted && traitor.secretMissionsCompleted[0];
            const canRecruit = room.settings.recruitingActive &&
                (room.settings.numTraitors > 1) &&
                (room.players.filter(p => p.role === 'traitor' && p.alive).length === 1);

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
        } catch (error) {
            console.error("Erro no startMurderPhase:", error);
            io.to(room.roomCode).emit('decoy_question');
            room.pendingDecoys = room.players.filter(p => p.alive).length;
        }
    }, 10000);
}

function endMurderPhase(room, io) {
    try {
        if (room.murderedThisRound) {
            const victim = room.players.find(p => p.id === room.murderedThisRound);
            if (victim) {
                victim.alive = false;
                io.to(room.roomCode).emit('murder_reveal', { type: 'murder', playerName: victim.name, lostGold: 0 });
                if (!room.settings.eliminatedAsSpectator) {
                    removePlayerFromRoom(room, victim.id, io);
                }
            }
        } else if (room.shieldUsed) {
            io.to(room.roomCode).emit('murder_reveal', { type: 'shield', playerName: null });
        } else {
            io.to(room.roomCode).emit('murder_reveal', { type: 'no_one', playerName: null });
        }
        room.continueVotes = 0;
    } catch (error) {
        console.error("Erro no endMurderPhase:", error);
        io.to(room.roomCode).emit('game_over', { message: "Erro no assassinato. A aventura terminou abruptamente." });
    }
}

function processArsenal(room, winner, randomReward, io) {
    if (winner) {
        if (randomReward === '2_coins') winner.gold += 2;
        else if (randomReward === '1_coin') winner.gold += 1;
        else winner.inventory.push(randomReward);
    }

    io.to(room.roomCode).emit('arsenal_result', {
        winnerName: winner ? winner.name : 'Ninguém',
        winnerId: winner ? winner.id : null,
        reward: winner ? randomReward : null
    });

    room.players.forEach(p => p.arsenalTaskResult = undefined);
    room.arsenalReadyCount = 0;
    room.arsenalChoice = undefined;

    setTimeout(() => startMurderPhase(room, io), 5000);
}

function processBanishment(room, io) {
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
            if (player) {
                player.gold = Math.max(0, player.gold - 1);
                room.prizeFund.coins += 1;
            }
        });
        actualLostGold = 1;
    } else {
        const p = room.players.find(p => p.id === topPlayersIds[0]);
        if (p) {
            p.alive = false;
            if (room.settings.banishedLoseGold) {
                p.gold = Math.max(0, p.gold - 2);
                room.prizeFund.coins += 2;
            }
            banishedName = p.name;
            actualLostGold = room.settings.banishedLoseGold ? 2 : 0;
            if (!room.settings.eliminatedAsSpectator) {
                removePlayerFromRoom(room, p.id, io);
            }
        }
    }

    convertCoinsToBars(room);

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

function proceedToNextRound(room, io) {
    room.roundNumber++;
    if (room.roundNumber > room.totalRounds) {
        room.phase = GAME_PHASES.GAME_OVER;
        io.to(room.roomCode).emit('game_over', {
            message: "A aventura terminou!",
            prizeFund: room.prizeFund,
            players: room.players.map(p => ({ name: p.name, gold: p.gold, bars: p.bars, alive: p.alive }))
        });
        return;
    }

    // Avança para a próxima missão
    room.phase = GAME_PHASES.PHASE_1_MISSION;
    room.endMissionVotes = 0;
    room.players.forEach(p => { p.hasEndMissionVote = false; p.evaluation = undefined; p.arsenalChoice = undefined; p.isReadyForPhase = false; });

    loadNewMission(room);

    room.players.forEach(player => {
        const introData = { ...room.phaseIntroData };
        if (player.role === 'traitor') {
            introData.secretMission = player.secretMissions[0] || null;
        } else {
            delete introData.secretMission;
        }
        io.to(player.id).emit('phase_intro', introData);
    });
}

module.exports = {
    loadNewMission,
    completeMission,
    startMissionTimer,
    startMurderPhase,
    endMurderPhase,
    processArsenal,
    processBanishment,
    proceedToNextRound
};