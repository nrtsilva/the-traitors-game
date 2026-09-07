const { GAME_PHASES } = require('./constants');
const { getMissoesPorModo, getArsenalPorModo } = require('./missionLoader');
const { rooms, convertCoinsToBars, removePlayerFromRoom } = require('./roomManager');

// Funções exportadas que recebem `io` como parâmetro (para emitir eventos)
// Nota: algumas funções usam `rooms` diretamente.

function startMissionTimer(room, io) {
    if (room.phaseTimer) clearTimeout(room.phaseTimer);
    const timeLimitMs = (room.currentMissionData.timeLimit || 120) * 1000;
    room.phaseTimer = setTimeout(() => {
        io.to(room.roomCode).emit('mission_evaluation');
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

    room.phase = GAME_PHASES.PHASE_1_MISSION;
    room.endMissionVotes = 0;
    room.players.forEach(p => { p.hasEndMissionVote = false; p.evaluation = undefined; p.arsenalChoice = undefined; p.isReadyForPhase = false; });

    const gameMode = room.settings.gameMode || 'in_person';
    const missoes = getMissoesPorModo(gameMode);
    const randomMissao = missoes[Math.floor(Math.random() * missoes.length)];
    room.currentMissionData = randomMissao;
    room.readyCount = 0;

    room.phaseIntroData = {
        title: randomMissao.title,
        description: randomMissao.description,
        secretMission: room.players.find(p => p.role === 'traitor')?.secretMissions[0],
        gameMode: gameMode
    };

    room.players.forEach(player => {
        if (player.role === 'traitor') {
            player.secretMissions = randomMissao.traitorSecretMissions || [];
        }
    });

    room.players.forEach(player => {
        const introData = { ...room.phaseIntroData };
        if (player.role === 'traitor') {
            introData.secretMission = player.secretMissions[0];
        }
        io.to(player.id).emit('phase_intro', introData);
    });
}

module.exports = {
    startMissionTimer,
    startMurderPhase,
    endMurderPhase,
    processArsenal,
    processBanishment,
    proceedToNextRound
};