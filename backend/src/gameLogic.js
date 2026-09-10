const { GAME_PHASES } = require('./constants');
const { getMissoesPorModo, getArsenalPorModo } = require('./missionLoader');
const { rooms, convertCoinsToBars, removePlayerFromRoom } = require('./roomManager');
const fs = require('fs');
const path = require('path');

// Completar missão com outcome
function completeMission(room, outcome, io) {
    if (room.currentMissionData.requiresPlayerChoice) {
        const reward = room.lastMissionReward || 0;
        finishMission(room, outcome, reward, io);
        return;
    }
    const reward = outcome ? parseInt(room.currentMissionData.reward) || 0 : 0;
    finishMission(room, outcome, reward, io);
}

// Finalizar missão e emitir resultado
function finishMission(room, outcome, reward, io) {
    let rewardAmount = reward;
    if (rewardAmount === undefined) {
        if (outcome) {
            rewardAmount = parseInt(room.currentMissionData.reward) || 0;
            if (!room.currentMissionData.requiresPlayerChoice) {
                room.prizeFund.coins += rewardAmount;
                convertCoinsToBars(room);
            }
        } else {
            rewardAmount = 0;
        }
    }

    io.to(room.roomCode).emit('mission_outcome', {
        success: outcome,
        reward: rewardAmount,
        barsAdded: room.prizeFund.bars,
        coinsAdded: room.prizeFund.coins,
        title: room.currentMissionData.title
    });

    console.log(`[Missão] Resultado: ${outcome ? 'Sucesso' : 'Falha'} - Adicionado ${rewardAmount} moedas.`);

    setTimeout(() => {
        if (room.currentMissionData.requiresUserOutcome || room.currentMissionData.requiresPlayerChoice) {
            startBanishmentPhase(room, io);
        } else {
            io.to(room.roomCode).emit('mission_evaluation');
        }
    }, 3000);
}

function startBanishmentPhase(room, io) {
    room.phase = GAME_PHASES.PHASE_2_BANISHMENT;
    room.phaseIntroData = {
        title: "A Expulsão",
        description: "Discutam em voz alta quem acham que é o Traidor. Quando todos estiverem prontos, votem para expulsar alguém.",
        secretMission: null,
        phase: room.phase
    };
    room.players.forEach(p => p.voteCast = null);
    room.players.forEach(player => {
        io.to(player.id).emit('phase_intro', { ...room.phaseIntroData });
    });
}

function loadNewMission(room, io) {
    const gameMode = room.settings.gameMode || 'in_person';
    const missoes = getMissoesPorModo(gameMode);
    let randomMissao;
    
    console.log(`[loadNewMission] Modo: ${gameMode}, missões disponíveis: ${missoes ? missoes.length : 0}`);

    if (!missoes || missoes.length === 0) {
        console.error('[loadNewMission] Nenhuma missão encontrada para o modo:', gameMode);
        randomMissao = {
            id: 'fallback',
            title: 'Missão Padrão',
            description: 'Completem a missão.',
            type: 'DEFAULT',
            reward: 0,
            traitorSecretMissions: []
        };
    } else {
        randomMissao = missoes[Math.floor(Math.random() * missoes.length)];
        console.log('[loadNewMission] Missão selecionada:', randomMissao.title);
    }

    // Fallback extra (caso o randomMissao seja undefined por algum motivo)
    if (!randomMissao) {
        console.error('[loadNewMission] randomMissao é undefined! Usando fallback de emergência.');
        randomMissao = {
            id: 'emergency',
            title: 'Missão de Emergência',
            description: 'Completem a missão.',
            type: 'DEFAULT',
            reward: 0,
            traitorSecretMissions: []
        };
    }

    // ATRIBUIÇÃO EXPLÍCITA E VERIFICAÇÃO
    room.currentMissionData = randomMissao;
    console.log('[loadNewMission] room.currentMissionData definido:', room.currentMissionData ? room.currentMissionData.title : 'UNDEFINED!');
    room.readyCount = 0;

    // ... resto da função (secret missions, drawing state, etc.)
    const secretMissionsList = randomMissao.traitorSecretMissions || [];
    const selectedSecret = secretMissionsList.length > 0
        ? [secretMissionsList[Math.floor(Math.random() * secretMissionsList.length)]]
        : [];

    room.players.forEach(player => {
        if (player.role === 'traitor') {
            player.secretMissions = selectedSecret;
        } else {
            player.secretMissions = [];
        }
        player.evaluation = undefined;
        player.arsenalChoice = undefined;
        player.isReadyForPhase = false;
        player.missionValue = undefined;
    });

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

    const traitor = room.players.find(p => p.role === 'traitor' && p.alive);
    const secretMissionForIntro = traitor ? traitor.secretMissions[0] : null;

    room.phaseIntroData = {
        title: randomMissao.title,
        description: randomMissao.description,
        secretMission: secretMissionForIntro,
        gameMode: gameMode,
        phase: room.phase
    };

    return randomMissao;
}

function startMissionTimer(room, io) {
    if (room.phaseTimer) clearTimeout(room.phaseTimer);
    const timeLimitMs = (room.currentMissionData.timeLimit || 120) * 1000;
    room.phaseTimer = setTimeout(() => {
        finishMission(room, false, 0, io);
    }, timeLimitMs);
}

function pickRandomReward() {
    const rewards = ['2_coins', '1_coin', 'shield', 'dagger'];
    return rewards[Math.floor(Math.random() * rewards.length)];
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

// ===== ARSENAL: ENCONTRA AS LARANJAS =====
const ORANGES_CONFIG = {
    TOTAL_CARDS: 60,
    ORANGES: 30,   // 50%
    APPLES: 15,    // 25%
    LEMONS: 15,    // 25%
    TARGET: 4,
};

function startFindOrangesGame(room, io) {
    const alivePlayers = room.players.filter(p => p.alive);
    
    // Construir baralho
    const deck = [];
    for (let i = 0; i < ORANGES_CONFIG.ORANGES; i++) deck.push('orange');
    for (let i = 0; i < ORANGES_CONFIG.APPLES; i++) deck.push('apple');
    for (let i = 0; i < ORANGES_CONFIG.LEMONS; i++) deck.push('lemon');
    deck.sort(() => Math.random() - 0.5);
    
    // Ordem inicial aleatória
    const order = [...alivePlayers].sort(() => Math.random() - 0.5).map(p => p.id);
    
    room.findOranges = {
        active: true,
        cards: deck.map((type, i) => ({
            id: i,
            type,                // 'orange' | 'apple' | 'lemon'
            temporaryReveal: false,
        })),
        order,
        direction: 1,            // 1 = normal, -1 = invertido
        currentIndex: 0,
        currentOrangeCount: 0,
        penalized: {},           // playerId -> true (perde próximo turno)
        winnerId: null,
    };
    
    io.to(room.roomCode).emit('find_oranges_start', {
        totalCards: deck.length,
        target: ORANGES_CONFIG.TARGET,
        order: order.map(id => {
            const p = room.players.find(pl => pl.id === id);
            return { id, name: p ? p.name : '?' };
        }),
        cards: Array.from({ length: deck.length }, (_, i) => ({ id: i })),
    });
    
    console.log(`[FindOranges] Jogo iniciado. ${alivePlayers.length} jogadores, ${deck.length} cartas.`);
    
    setTimeout(() => announceFindOrangesTurn(room, io), 2500);
}

function getNextOrangesIndex(fo) {
    return (fo.currentIndex + fo.direction + fo.order.length) % fo.order.length;
}

function announceFindOrangesTurn(room, io) {
    const fo = room.findOranges;
    if (!fo || !fo.active) return;
    
    // Saltar jogadores penalizados (máx 1 volta completa)
    let attempts = 0;
    while (fo.penalized[fo.order[fo.currentIndex]] && attempts < fo.order.length) {
        fo.penalized[fo.order[fo.currentIndex]] = false;
        fo.currentIndex = getNextOrangesIndex(fo);
        attempts++;
    }
    
    // Reset contagem de laranjas desta jogada
    fo.currentOrangeCount = 0;
    
    const currentPlayerId = fo.order[fo.currentIndex];
    const currentPlayer = room.players.find(p => p.id === currentPlayerId);
    
    // Esconder todas as cartas reveladas temporariamente
    fo.cards.forEach(c => { c.temporaryReveal = false; });
    
    io.to(room.roomCode).emit('find_oranges_turn', {
        currentPlayerId,
        currentPlayerName: currentPlayer ? currentPlayer.name : '?',
        direction: fo.direction,
        orangeCount: 0,
        target: ORANGES_CONFIG.TARGET,
        hiddenCards: fo.cards.filter(c => !c.temporaryReveal).map(c => c.id),
    });
    
    console.log(`[FindOranges] Turno de ${currentPlayer?.name} (direção: ${fo.direction > 0 ? '→' : '←'})`);
}

function handleFindOrangesFlip(room, io, playerId, cardId) {
    const fo = room.findOranges;
    if (!fo || !fo.active) return;
    
    const currentPlayerId = fo.order[fo.currentIndex];
    if (playerId !== currentPlayerId) {
        io.to(playerId).emit('find_oranges_invalid', { message: 'Não é o teu turno.' });
        return;
    }
    
    const card = fo.cards[cardId];
    if (!card) return;
    
    if (card.temporaryReveal) {
        io.to(playerId).emit('find_oranges_invalid', { message: 'Essa carta já está revelada.' });
        return;
    }
    
    // Revelar a carta para todos
    card.temporaryReveal = true;
    
    let newOrangeCount = fo.currentOrangeCount;
    if (card.type === 'orange') newOrangeCount++;
    
    io.to(room.roomCode).emit('find_oranges_card_flipped', {
        cardId,
        type: card.type,
        orangeCount: newOrangeCount,
    });
    
    if (card.type === 'orange') {
        fo.currentOrangeCount = newOrangeCount;
        
        // VITÓRIA!
        if (fo.currentOrangeCount >= ORANGES_CONFIG.TARGET) {
            finishFindOrangesGame(room, io, playerId);
            return;
        }
        
        // Continuar a jogar
        io.to(room.roomCode).emit('find_oranges_continue', {
            orangeCount: fo.currentOrangeCount,
            target: ORANGES_CONFIG.TARGET,
        });
    } else if (card.type === 'apple') {
        // Penalização + terminar jogada
        fo.penalized[playerId] = true;
        fo.currentOrangeCount = 0;
        
        const playerName = room.players.find(p => p.id === playerId)?.name;
        io.to(room.roomCode).emit('find_oranges_apple', {
            playerName,
        });
        
        fo.currentIndex = getNextOrangesIndex(fo);
        setTimeout(() => announceFindOrangesTurn(room, io), 2800);
    } else if (card.type === 'lemon') {
        // Inverter direção + terminar jogada
        fo.currentOrangeCount = 0;
        fo.direction *= -1;
        
        io.to(room.roomCode).emit('find_oranges_lemon', {
            direction: fo.direction,
        });
        
        fo.currentIndex = getNextOrangesIndex(fo);
        setTimeout(() => announceFindOrangesTurn(room, io), 2800);
    }
}

function finishFindOrangesGame(room, io, winnerId) {
    const fo = room.findOranges;
    if (!fo || !fo.active) return;
    fo.active = false;
    fo.winnerId = winnerId;
    
    const winner = room.players.find(p => p.id === winnerId);
    
    io.to(room.roomCode).emit('find_oranges_end', {
        winnerId,
        winnerName: winner ? winner.name : '?',
    });
    
    room.findOranges = null;
    
    setTimeout(() => {
        processArsenal(room, winner, pickRandomReward(), io);
    }, 3000);
}

// ===== ARSENAL: SONS EM CÓDIGO =====
function generateSoundsCodeSequence(roundNumber) {
    // Dificuldade progressiva: começa com 2 elementos, aumenta 1 a cada ronda
    const minLen = Math.min(2 + Math.floor(roundNumber / 2), 7);
    const maxLen = Math.min(3 + Math.floor(roundNumber / 2), 8);
    const length = minLen + Math.floor(Math.random() * (maxLen - minLen + 1));
    
    const sequence = [];
    for (let i = 0; i < length; i++) {
        // Evitar 3 números iguais consecutivos
        let n;
        do {
            n = 1 + Math.floor(Math.random() * 3);
        } while (
            i >= 2 &&
            sequence[i - 1] === n &&
            sequence[i - 2] === n
        );
        sequence.push(n);
    }
    return sequence;
}

function startSoundsCodeGame(room, io) {
    const alivePlayers = room.players.filter(p => p.alive);
    
    room.soundsCode = {
        active: true,
        players: {},           // playerId -> { eliminated: false, successCount: 0 }
        eliminated: [],        // lista de playerIds eliminados
        currentTurnPlayerId: null,
        roundNumber: 0,
        currentSequence: [],
        awaitingDecision: false,
        winnerId: null,
    };
    
    alivePlayers.forEach(p => {
        room.soundsCode.players[p.id] = { eliminated: false, successCount: 0 };
    });
    
    io.to(room.roomCode).emit('sounds_code_start', {
        totalPlayers: alivePlayers.length,
        playersLeft: alivePlayers.length,
    });
    
    console.log(`[SoundsCode] Jogo iniciado com ${alivePlayers.length} jogadores.`);
    
    setTimeout(() => nextSoundsCodeTurn(room, io), 2500);
}

function nextSoundsCodeTurn(room, io) {
    const sc = room.soundsCode;
    if (!sc || !sc.active) return;
    
    const activePlayers = room.players.filter(p => 
        p.alive && sc.players[p.id] && !sc.players[p.id].eliminated
    );
    
    // Vitória?
    if (activePlayers.length <= 1) {
        sc.winnerId = activePlayers.length === 1 ? activePlayers[0].id : null;
        io.to(room.roomCode).emit('sounds_code_need_winner', {
            remaining: activePlayers.map(p => ({ id: p.id, name: p.name })),
            suggestedWinnerId: sc.winnerId,
        });
        return;
    }
    
    // Escolher jogador (evitar repetir o anterior se houver alternativa)
    const prev = sc.currentTurnPlayerId;
    const pool = activePlayers.filter(p => p.id !== prev);
    const chosen = pool.length > 0 
        ? pool[Math.floor(Math.random() * pool.length)]
        : activePlayers[0];
    
    sc.currentTurnPlayerId = chosen.id;
    sc.roundNumber += 1;
    sc.awaitingDecision = true;
    
    // Gerar sequência
    const sequence = generateSoundsCodeSequence(sc.roundNumber);
    sc.currentSequence = sequence;
    
    io.to(room.roomCode).emit('sounds_code_turn', {
        roundNumber: sc.roundNumber,
        playerId: chosen.id,
        playerName: chosen.name,
        sequence,
        playersLeft: activePlayers.length,
        eliminatedNames: sc.eliminated.map(id => {
            const p = room.players.find(pl => pl.id === id);
            return p ? p.name : '?';
        }),
    });
    
    console.log(`[SoundsCode] Ronda ${sc.roundNumber}: ${chosen.name} → [${sequence.join(' ')}]`);
}

function handleSoundsCodeDecision(room, io, result) {
    // result: 'correct' | 'error'
    const sc = room.soundsCode;
    if (!sc || !sc.active || !sc.awaitingDecision) return;
    
    const playerId = sc.currentTurnPlayerId;
    const player = room.players.find(p => p.id === playerId);
    if (!player) return;
    
    sc.awaitingDecision = false;
    
    if (result === 'correct') {
        sc.players[playerId].successCount += 1;
        
        const activeCount = room.players.filter(p => 
            p.alive && sc.players[p.id] && !sc.players[p.id].eliminated
        ).length;
        
        io.to(room.roomCode).emit('sounds_code_correct', {
            playerId,
            playerName: player.name,
            sequence: sc.currentSequence,
            successCount: sc.players[playerId].successCount,
            playersLeft: activeCount,
        });
        
        console.log(`[SoundsCode] ✅ ${player.name} acertou (${sc.players[playerId].successCount} sucessos)`);
        
        setTimeout(() => nextSoundsCodeTurn(room, io), 2500);
    } else if (result === 'error') {
        sc.players[playerId].eliminated = true;
        sc.eliminated.push(playerId);
        
        const activeCount = room.players.filter(p => 
            p.alive && sc.players[p.id] && !sc.players[p.id].eliminated
        ).length;
        
        io.to(room.roomCode).emit('sounds_code_error', {
            playerId,
            playerName: player.name,
            sequence: sc.currentSequence,
            playersLeft: activeCount,
        });
        
        console.log(`[SoundsCode] ❌ ${player.name} eliminado (${activeCount} restantes)`);
        
        setTimeout(() => nextSoundsCodeTurn(room, io), 2500);
    }
}

function confirmSoundsCodeWinner(room, io, winnerId) {
    const sc = room.soundsCode;
    if (!sc || !sc.active) return;
    
    const winner = room.players.find(p => p.id === winnerId);
    if (!winner) return;
    
    sc.active = false;
    sc.winnerId = winnerId;
    
    io.to(room.roomCode).emit('sounds_code_winner', {
        winnerId,
        winnerName: winner.name,
    });
    
    room.soundsCode = null;
    
    setTimeout(() => {
        processArsenal(room, winner, pickRandomReward(), io);
    }, 3000);
}

// ===== ARSENAL: 8 LETRAS =====
let EIGHT_LETTERS_CATEGORIES = [];
try {
    const p = path.join(__dirname, '..', 'data', 'oito_letras.json');
    const data = JSON.parse(fs.readFileSync(p, 'utf-8'));
    EIGHT_LETTERS_CATEGORIES = data.categories || [];
    console.log(`[8Letras] ${EIGHT_LETTERS_CATEGORIES.length} categorias carregadas.`);
} catch (e) {
    console.error('[8Letras] Erro ao carregar categorias:', e.message);
}

function startEightLettersGame(room, io) {
    const alivePlayers = room.players.filter(p => p.alive);
    
    // Escolher categoria aleatória
    if (EIGHT_LETTERS_CATEGORIES.length === 0) {
        console.error('[8Letras] Sem categorias disponíveis.');
        return;
    }
    const chosen = EIGHT_LETTERS_CATEGORIES[Math.floor(Math.random() * EIGHT_LETTERS_CATEGORIES.length)];
    
    room.eightLetters = {
        active: true,
        category: chosen.category,
        letters: [...chosen.letters],
        players: {},              // playerId -> { answers: {A: '', ...}, finished: false, finishedAt: null, elapsed: null }
        finishOrder: [],          // [{ playerId, elapsed }]
        validationQueue: [],      // [{ playerId, elapsed }]
        currentValidationPlayerId: null,
        startTime: Date.now(),
        winnerId: null,
        endTimer: null,
    };
    
    alivePlayers.forEach(p => {
        const answers = {};
        chosen.letters.forEach(l => { answers[l] = ''; });
        room.eightLetters.players[p.id] = {
            answers,
            finished: false,
            finishedAt: null,
            elapsed: null,
            submitted: false,
        };
    });
    
    io.to(room.roomCode).emit('eight_letters_start', {
        category: chosen.category,
        letters: chosen.letters,
        timeLimit: room.currentArsenalTask.timeLimit || 180,
    });
    
    // Timer global (opcional - força o fim aos 180s)
    const timeLimit = room.currentArsenalTask.timeLimit || 180;
    room.eightLetters.endTimer = setTimeout(() => {
        handleEightLettersTimeout(room, io);
    }, timeLimit * 1000);
    
    console.log(`[8Letras] Jogo iniciado. Categoria: ${chosen.category}`);
}

function handleEightLettersSubmit(room, io, playerId, answers) {
    const el = room.eightLetters;
    if (!el || !el.active) return;
    
    const pState = el.players[playerId];
    if (!pState || pState.finished) return;
    
    // Validar que todas as letras têm resposta
    const missing = el.letters.filter(l => !answers[l] || !answers[l].trim());
    if (missing.length > 0) {
        io.to(playerId).emit('eight_letters_error', {
            message: `Faltam respostas para: ${missing.join(', ')}`,
        });
        return;
    }
    
    // Registar respostas
    pState.answers = {};
    el.letters.forEach(l => {
        pState.answers[l] = answers[l].trim();
    });
    pState.finished = true;
    pState.finishedAt = Date.now();
    pState.elapsed = (pState.finishedAt - el.startTime) / 1000;
    
    el.finishOrder.push({ playerId, elapsed: pState.elapsed });
    el.finishOrder.sort((a, b) => a.elapsed - b.elapsed);
    
    const player = room.players.find(p => p.id === playerId);
    
    io.to(room.roomCode).emit('eight_letters_player_finished', {
        playerId,
        playerName: player ? player.name : '?',
        elapsed: pState.elapsed,
        order: el.finishOrder.length,
        totalPlayers: Object.keys(el.players).length,
    });
    
    console.log(`[8Letras] ${player?.name} terminou em ${pState.elapsed.toFixed(2)}s (${el.finishOrder.length}º)`);
    
    // Se ainda não estamos em validação, iniciar
    if (!el.currentValidationPlayerId) {
        startEightLettersValidation(room, io);
    }
}

function startEightLettersValidation(room, io) {
    const el = room.eightLetters;
    if (!el || !el.active) return;
    
    // Próximo da fila sem validação
    if (el.finishOrder.length === 0) {
        // Ninguém terminou ainda - aguarda
        return;
    }
    
    // Precisamos escolher o mais rápido ainda não validado
    const notValidated = el.finishOrder.filter(f => {
        const pState = el.players[f.playerId];
        return !pState.validated && !pState.rejected;
    });
    
    if (notValidated.length === 0) {
        // Todos rejeitados ou já validados
        finishEightLettersGame(room, io, null);
        return;
    }
    
    const next = notValidated[0];
    el.currentValidationPlayerId = next.playerId;
    
    const player = room.players.find(p => p.id === next.playerId);
    const pState = el.players[next.playerId];
    
    io.to(room.roomCode).emit('eight_letters_validation', {
        playerId: next.playerId,
        playerName: player ? player.name : '?',
        elapsed: next.elapsed,
        answers: el.letters.map(l => ({
            letter: l,
            answer: pState.answers[l],
        })),
    });
    
    console.log(`[8Letras] A validar: ${player?.name} (${next.elapsed.toFixed(2)}s)`);
}

function handleEightLettersVote(room, io, vote) {
    // vote: 'accept' | 'reject'
    const el = room.eightLetters;
    if (!el || !el.active || !el.currentValidationPlayerId) return;
    
    const playerId = el.currentValidationPlayerId;
    const pState = el.players[playerId];
    if (!pState) return;
    
    const player = room.players.find(p => p.id === playerId);
    
    if (vote === 'accept') {
        pState.validated = true;
        el.winnerId = playerId;
        
        io.to(room.roomCode).emit('eight_letters_accepted', {
            playerId,
            playerName: player ? player.name : '?',
            elapsed: pState.elapsed,
        });
        
        console.log(`[8Letras] ✅ ${player?.name} aceite!`);
        
        finishEightLettersGame(room, io, playerId);
    } else {
        pState.rejected = true;
        el.currentValidationPlayerId = null;
        
        io.to(room.roomCode).emit('eight_letters_rejected', {
            playerId,
            playerName: player ? player.name : '?',
        });
        
        console.log(`[8Letras] ❌ ${player?.name} rejeitado.`);
        
        // Passar ao próximo
        setTimeout(() => startEightLettersValidation(room, io), 2000);
    }
}

function handleEightLettersTimeout(room, io) {
    const el = room.eightLetters;
    if (!el || !el.active) return;
    
    console.log(`[8Letras] ⏰ Tempo esgotado. Iniciando validação dos que terminaram.`);
    
    // Se ninguém terminou ou há fila, continuar validação
    if (el.finishOrder.length === 0) {
        finishEightLettersGame(room, io, null);
    } else if (!el.currentValidationPlayerId) {
        startEightLettersValidation(room, io);
    }
}

function finishEightLettersGame(room, io, winnerId) {
    const el = room.eightLetters;
    if (!el || !el.active) return;
    el.active = false;
    if (el.endTimer) clearTimeout(el.endTimer);
    
    let winner = null;
    if (winnerId) winner = room.players.find(p => p.id === winnerId);
    
    io.to(room.roomCode).emit('eight_letters_end', {
        winnerId,
        winnerName: winner ? winner.name : null,
    });
    
    room.eightLetters = null;
    
    setTimeout(() => {
        processArsenal(room, winner, pickRandomReward(), io);
    }, 3000);
}

// ===== JOGO: WORD BUILDER =====
// Carregar dicionário
let DICIONARIO = new Set();
try {
    const dictPath = path.join(__dirname, '..', 'data', 'palavras_pt.json');
    const dictData = JSON.parse(fs.readFileSync(dictPath, 'utf-8'));
    DICIONARIO = new Set(dictData.palavras.map(w => w.toLowerCase()));
    console.log(`[WordBuilder] Dicionário carregado: ${DICIONARIO.size} palavras.`);
} catch (e) {
    console.error('[WordBuilder] Erro ao carregar dicionário:', e.message);
}

const LETTER_WEIGHTS = {
    // Frequentes
    'A': 14, 'E': 13, 'I': 8, 'O': 10, 'U': 5, 'R': 8, 'S': 9, 'N': 6,
    'L': 6, 'M': 5, 'D': 5, 'T': 5, 'C': 4, 'P': 3,
    // Menos frequentes
    'B': 2, 'F': 2, 'G': 2, 'H': 2, 'V': 2,
    // Raras
    'J': 1, 'Q': 1, 'X': 1, 'Z': 1, 'K': 1, 'W': 1, 'Y': 1
};

const RARE_LETTERS = ['J', 'Q', 'X', 'Z', 'K', 'W', 'Y'];

function generateLetters() {
    const letters = [];
    let rareCount = 0;
    
    // Vogais mínimas: garantir pelo menos 4 vogais
    const vowels = ['A', 'E', 'I', 'O', 'U'];
    const consonants = Object.keys(LETTER_WEIGHTS).filter(l => !vowels.includes(l));
    
    // Adicionar 4-5 vogais
    const numVowels = 4 + Math.floor(Math.random() * 2);
    for (let i = 0; i < numVowels; i++) {
        const v = vowels[Math.floor(Math.random() * vowels.length)];
        letters.push(v);
    }
    
    // Adicionar consoantes
    const weightedConsonants = [];
    consonants.forEach(c => {
        const weight = LETTER_WEIGHTS[c] || 1;
        for (let i = 0; i < weight; i++) weightedConsonants.push(c);
    });
    
    while (letters.length < 12) {
        const c = weightedConsonants[Math.floor(Math.random() * weightedConsonants.length)];
        // Regra: máximo 1 letra rara por conjunto
        if (RARE_LETTERS.includes(c)) {
            if (rareCount >= 1) continue;
            rareCount++;
        }
        letters.push(c);
    }
    
    // Embaralhar
    return letters.sort(() => Math.random() - 0.5);
}

function startWordBuilderGame(room, io) {
    const duration = room.currentArsenalTask.duration || 120;
    const gridSize = 15;
    
    room.wordBuilder = {
        active: true,
        duration,
        gridSize,
        players: {},
        endTimeout: null,
    };
    
    const alivePlayers = room.players.filter(p => p.alive);
    
    alivePlayers.forEach(player => {
        const letters = generateLetters();
        const handCount = {};
        letters.forEach(l => { handCount[l] = (handCount[l] || 0) + 1; });
        
        room.wordBuilder.players[player.id] = {
            letters,
            handCount,
            grid: {},       // { "row,col": {letter, wordId} }
            words: [],      // histórico de palavras colocadas
            startTime: Date.now(),
            finishedAt: null,
            lettersUsed: 0,
            wordCount: 0,
        };
        
        io.to(player.id).emit('word_builder_start', {
            duration,
            gridSize,
            letters: letters.sort(),
        });
    });
    
    room.wordBuilder.endTimeout = setTimeout(() => {
        finishWordBuilderGame(room, io);
    }, duration * 1000);
    
    console.log(`[WordBuilder] Jogo iniciado. Duração: ${duration}s`);
}

function getCellKey(row, col) {
    return `${row},${col}`;
}

function validateAndPlaceWord(room, io, playerId, word, row, col, orientation) {
    const wb = room.wordBuilder;
    if (!wb || !wb.active) return { success: false, message: 'Jogo inativo.' };
    
    const pState = wb.players[playerId];
    if (!pState || pState.finishedAt) return { success: false, message: 'Já terminaste.' };
    
    const upperWord = (word || '').trim().toUpperCase();
    if (!upperWord || upperWord.length < 2) return { success: false, message: 'Palavra inválida.' };
    
    // Verificar duplicado
    if (pState.words.some(w => w.word === upperWord)) {
        return { success: false, message: 'Palavra já usada.' };
    }
    
    // Verificar se existe no dicionário
    if (!DICIONARIO.has(upperWord.toLowerCase())) {
        return { success: false, message: 'Palavra não está no dicionário.' };
    }
    
    // Calcular células
    const cells = [];
    for (let i = 0; i < upperWord.length; i++) {
        const r = orientation === 'V' ? row + i : row;
        const c = orientation === 'H' ? col + i : col;
        if (r < 0 || r >= wb.gridSize || c < 0 || c >= wb.gridSize) {
            return { success: false, message: 'Fora do tabuleiro.' };
        }
        cells.push({ r, c, letter: upperWord[i] });
    }
    
    // Verificar letras necessárias (as que não estão já no tabuleiro)
    const handCopy = { ...pState.handCount };
    const newCells = [];
    
    for (const cell of cells) {
        const key = getCellKey(cell.r, cell.c);
        const existing = pState.grid[key];
        if (existing) {
            // Célula já ocupada — letra deve coincidir
            if (existing.letter !== cell.letter) {
                return { success: false, message: `Letra "${cell.letter}" não coincide com "${existing.letter}" já colocada.` };
            }
        } else {
            // Nova célula — precisa da letra na mão
            if (!handCopy[cell.letter] || handCopy[cell.letter] <= 0) {
                return { success: false, message: `Não tens a letra "${cell.letter}" disponível.` };
            }
            handCopy[cell.letter]--;
            newCells.push(cell);
        }
    }
    
    // Se todas as letras já estavam no tabuleiro, não há novas letras para consumir
    if (newCells.length === 0) {
        return { success: false, message: 'Nenhuma letra nova adicionada.' };
    }
    
    // Verificar se há ligação com palavras existentes (a não ser na primeira palavra)
    if (pState.words.length > 0) {
        let hasConnection = false;
        for (const cell of newCells) {
            const neighbors = [
                getCellKey(cell.r - 1, cell.c), getCellKey(cell.r + 1, cell.c),
                getCellKey(cell.r, cell.c - 1), getCellKey(cell.r, cell.c + 1),
            ];
            if (neighbors.some(nk => pState.grid[nk])) {
                hasConnection = true;
                break;
            }
        }
        if (!hasConnection) {
            return { success: false, message: 'A palavra deve cruzar uma já existente.' };
        }
    }
    
    // Colocar no tabuleiro
    const wordId = `w${pState.words.length}_${Date.now()}`;
    for (const cell of cells) {
        const key = getCellKey(cell.r, cell.c);
        if (!pState.grid[key]) {
            pState.grid[key] = { letter: cell.letter, wordId };
            pState.lettersUsed++;
        }
    }
    
    pState.handCount = handCopy;
    pState.words.push({ word: upperWord, row, col, orientation, wordId });
    pState.wordCount = pState.words.length;
    
    io.to(playerId).emit('word_builder_word_added', {
        word: upperWord,
        row, col, orientation,
        lettersUsed: pState.lettersUsed,
        wordCount: pState.wordCount,
        newGrid: pState.grid,
        remainingHand: pState.handCount,
    });
    
    return { success: true };
}

function removeLastWord(room, io, playerId) {
    const wb = room.wordBuilder;
    if (!wb || !wb.active) return;
    const pState = wb.players[playerId];
    if (!pState || pState.finishedAt || pState.words.length === 0) return;
    
    const last = pState.words.pop();
    const wordId = last.wordId;
    
    // Remover letras que pertenciam apenas a esta palavra
    for (const key of Object.keys(pState.grid)) {
        if (pState.grid[key].wordId === wordId) {
            // Verificar se esta célula também pertence a outra palavra (cruzamento)
            const letter = pState.grid[key].letter;
            // Devolver à mão
            pState.handCount[letter] = (pState.handCount[letter] || 0) + 1;
            pState.lettersUsed--;
            delete pState.grid[key];
        }
    }
    
    pState.wordCount = pState.words.length;
    
    io.to(playerId).emit('word_builder_word_removed', {
        remainingHand: pState.handCount,
        lettersUsed: pState.lettersUsed,
        wordCount: pState.wordCount,
        newGrid: pState.grid,
    });
}

function finishWordBuilderPlayer(room, io, playerId) {
    const wb = room.wordBuilder;
    if (!wb || !wb.active) return;
    const pState = wb.players[playerId];
    if (!pState || pState.finishedAt) return;
    
    pState.finishedAt = Date.now();
    pState.elapsedSeconds = (pState.finishedAt - pState.startTime) / 1000;
    
    io.to(playerId).emit('word_builder_you_finished', {
        wordCount: pState.wordCount,
        lettersUsed: pState.lettersUsed,
        elapsedSeconds: pState.elapsedSeconds,
    });
    
    // Notificar todos
    const player = room.players.find(p => p.id === playerId);
    io.to(room.roomCode).emit('word_builder_player_finished', {
        playerId,
        playerName: player ? player.name : 'Desconhecido',
        wordCount: pState.wordCount,
        lettersUsed: pState.lettersUsed,
        elapsedSeconds: pState.elapsedSeconds,
    });
    
    // Se todos terminaram, finalizar
    const all = Object.values(wb.players);
    if (all.every(p => p.finishedAt)) {
        if (wb.endTimeout) clearTimeout(wb.endTimeout);
        finishWordBuilderGame(room, io);
    }
}

function finishWordBuilderGame(room, io) {
    const wb = room.wordBuilder;
    if (!wb || !wb.active) return;
    wb.active = false;
    if (wb.endTimeout) clearTimeout(wb.endTimeout);
    
    const entries = Object.entries(wb.players).map(([id, p]) => {
        const player = room.players.find(pl => pl.id === id);
        const elapsed = p.elapsedSeconds || (Date.now() - p.startTime) / 1000;
        return { playerId: id, playerName: player ? player.name : '?', wordCount: p.wordCount, lettersUsed: p.lettersUsed, elapsedSeconds: elapsed, words: p.words.map(w => w.word) };
    });
    entries.sort((a, b) => {
        if (b.wordCount !== a.wordCount) return b.wordCount - a.wordCount;
        if (b.lettersUsed !== a.lettersUsed) return b.lettersUsed - a.lettersUsed;
        return a.elapsedSeconds - b.elapsedSeconds;
    });
    
    let winnerPlayer = null;
    if (entries.length > 0 && entries[0].wordCount > 0) {
        winnerPlayer = room.players.find(p => p.id === entries[0].playerId);
    }
    
    io.to(room.roomCode).emit('word_builder_end', {
        finalScores: entries,
        winnerId: winnerPlayer ? winnerPlayer.id : null,
        winnerName: winnerPlayer ? winnerPlayer.name : 'Ninguém',
    });
    
    room.wordBuilder = null;
    
    setTimeout(() => {
        processArsenal(room, winnerPlayer, pickRandomReward(), io);
    }, 3000);
}

// ===== JOGO: ADIVINHA PELOS EMOJIS =====
let EMOJI_ROUNDS = [];
try {
    const p = require('path').join(__dirname, '..', 'data', 'emoji_rounds.json');
    const data = JSON.parse(fs.readFileSync(p, 'utf-8'));
    EMOJI_ROUNDS = data.rounds || [];
    console.log(`[EmojiGuess] ${EMOJI_ROUNDS.length} rondas carregadas.`);
} catch (e) {
    console.error('[EmojiGuess] Erro ao carregar rondas:', e.message);
}

// Normalizar texto (remover acentos, minúsculas, hífen, espaços)
function normalizeWord(w) {
    return (w || '')
        .toString()
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')  // remove acentos
        .replace(/[^a-z0-9]/g, '');        // remove tudo o que não seja letra/número
}

function startEmojiGuessGame(room, io) {
    const numRounds = room.currentArsenalTask.rounds || 10;
    const roundTimeLimit = room.currentArsenalTask.roundTimeLimit || 30;
    
    // Embaralhar e escolher N
    const shuffled = [...EMOJI_ROUNDS].sort(() => Math.random() - 0.5);
    const selected = shuffled.slice(0, Math.min(numRounds, shuffled.length));
    
    room.emojiGuess = {
        active: true,
        numRounds: selected.length,
        roundTimeLimit,
        rounds: selected,
        currentRound: 0,
        scores: {},           // playerId -> { wins, totalTime }
        roundTimer: null,
        roundStartTime: null,
        roundAnswered: false,
    };
    
    room.players.filter(p => p.alive).forEach(p => {
        room.emojiGuess.scores[p.id] = { wins: 0, totalTime: 0 };
    });
    
    console.log(`[EmojiGuess] Jogo iniciado com ${selected.length} rondas.`);
    setTimeout(() => startEmojiGuessRound(room, io), 1500);
}

function startEmojiGuessRound(room, io) {
    const eg = room.emojiGuess;
    if (!eg || !eg.active) return;
    
    if (eg.currentRound >= eg.rounds.length) {
        finishEmojiGuessGame(room, io);
        return;
    }
    
    const r = eg.rounds[eg.currentRound];
    eg.roundAnswered = false;
    eg.roundStartTime = Date.now();
    
    io.to(room.roomCode).emit('emoji_guess_round', {
        roundNumber: eg.currentRound + 1,
        totalRounds: eg.rounds.length,
        emoji1: r.emoji1,
        emoji2: r.emoji2,
        timeLimit: eg.roundTimeLimit,
    });
    
    if (eg.roundTimer) clearTimeout(eg.roundTimer);
    eg.roundTimer = setTimeout(() => {
        if (!eg.roundAnswered) {
            eg.roundAnswered = true;
            io.to(room.roomCode).emit('emoji_guess_round_end', {
                roundNumber: eg.currentRound + 1,
                winnerId: null,
                winnerName: null,
                answer: r.answer,
                time: null,
                scores: buildEmojiScores(room),
                timeout: true,
            });
            setTimeout(() => {
                eg.currentRound++;
                startEmojiGuessRound(room, io);
            }, 3000);
        }
    }, eg.roundTimeLimit * 1000);
}

function buildEmojiScores(room) {
    const eg = room.emojiGuess;
    if (!eg) return [];
    return Object.entries(eg.scores).map(([id, s]) => {
        const p = room.players.find(pl => pl.id === id);
        return {
            playerId: id,
            playerName: p ? p.name : 'Desconhecido',
            wins: s.wins,
            totalTime: s.totalTime,
        };
    }).sort((a, b) => {
        if (b.wins !== a.wins) return b.wins - a.wins;
        return a.totalTime - b.totalTime;
    });
}

function submitEmojiGuess(room, io, playerId, guess) {
    const eg = room.emojiGuess;
    if (!eg || !eg.active || eg.roundAnswered) return;
    
    const r = eg.rounds[eg.currentRound];
    if (!r) return;
    
    const normalizedGuess = normalizeWord(guess);
    const normalizedAnswer = normalizeWord(r.answer);
    
    if (!normalizedGuess) {
        io.to(playerId).emit('emoji_guess_invalid', { reason: 'Escreve uma palavra.' });
        return;
    }
    
    if (normalizedGuess !== normalizedAnswer) {
        io.to(playerId).emit('emoji_guess_invalid', { reason: `"${guess.toUpperCase()}" não é a palavra correta. Tenta outra vez!` });
        return;
    }
    
    // VÁLIDA! Primeiro a acertar ganha
    eg.roundAnswered = true;
    if (eg.roundTimer) clearTimeout(eg.roundTimer);
    
    const elapsed = (Date.now() - eg.roundStartTime) / 1000;
    eg.scores[playerId].wins += 1;
    eg.scores[playerId].totalTime += elapsed;
    
    const winner = room.players.find(p => p.id === playerId);
    
    io.to(room.roomCode).emit('emoji_guess_round_end', {
        roundNumber: eg.currentRound + 1,
        winnerId: playerId,
        winnerName: winner ? winner.name : 'Desconhecido',
        answer: r.answer,
        time: elapsed,
        scores: buildEmojiScores(room),
    });
    
    console.log(`[EmojiGuess] Ronda ${eg.currentRound + 1}: ${winner?.name} -> ${r.answer} (${elapsed.toFixed(3)}s)`);
    
    setTimeout(() => {
        eg.currentRound++;
        startEmojiGuessRound(room, io);
    }, 3000);
}

function finishEmojiGuessGame(room, io) {
    const eg = room.emojiGuess;
    if (!eg || !eg.active) return;
    eg.active = false;
    if (eg.roundTimer) clearTimeout(eg.roundTimer);
    
    const finalScores = buildEmojiScores(room);
    
    let winnerPlayer = null;
    if (finalScores.length > 0 && finalScores[0].wins > 0) {
        winnerPlayer = room.players.find(p => p.id === finalScores[0].playerId);
    }
    
    io.to(room.roomCode).emit('emoji_guess_end', {
        finalScores,
        winnerId: winnerPlayer ? winnerPlayer.id : null,
        winnerName: winnerPlayer ? winnerPlayer.name : 'Ninguém',
    });
    
    room.emojiGuess = null;
    
    setTimeout(() => {
        processArsenal(room, winnerPlayer, pickRandomReward(), io);
    }, 3000);
}

// ===== MISSÃO: CONTAGEM DOS EMOJIS =====
let EMOJI_ACTIONS = [];
try {
    const p = path.join(__dirname, '..', 'data', 'emoji_rounds.json');
    const data = JSON.parse(fs.readFileSync(p, 'utf-8'));
    EMOJI_ACTIONS = data.actions || [];
    console.log(`[EmojiCount] ${EMOJI_ACTIONS.length} ações carregadas.`);
} catch (e) {
    console.error('[EmojiCount] Erro ao carregar ações:', e.message);
}

function startEmojiCountMission(room, io) {
    const timeLimit = room.currentMissionData.timeLimit || 180;
    
    room.emojiCount = {
        active: true,
        timeLimit,
        startTime: Date.now(),
        substitutions: [],   // [{ number, emoji, label, action }]
        currentLevel: 0,
        maxLevel: 10,
        errorCount: 0,
        endTimer: null,
    };
    
    // Calcular pool de números e ações disponíveis
    const availableNumbers = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
    const availableActions = [...EMOJI_ACTIONS].sort(() => Math.random() - 0.5);
    
    room.emojiCount.availableNumbers = availableNumbers;
    room.emojiCount.availableActions = availableActions;
    
    io.to(room.roomCode).emit('emoji_count_start', {
        timeLimit,
        maxLevel: room.emojiCount.maxLevel,
        substitutions: [],
        currentLevel: 0,
    });
    
    // Timer global
    room.emojiCount.endTimer = setTimeout(() => {
        finishEmojiCountMission(room, io, false);
    }, timeLimit * 1000);
    
    console.log(`[EmojiCount] Missão iniciada. Duração: ${timeLimit}s`);
}

function handleEmojiCountNext(room, io) {
    const ec = room.emojiCount;
    if (!ec || !ec.active) return;
    if (ec.currentLevel >= ec.maxLevel) return;
    
    // Escolher número e ação ainda não usados
    const usedNumbers = ec.substitutions.map(s => s.number);
    const remainingNumbers = ec.availableNumbers.filter(n => !usedNumbers.includes(n));
    if (remainingNumbers.length === 0) return;
    
    const usedEmojis = ec.substitutions.map(s => s.emoji);
    const remainingActions = ec.availableActions.filter(a => !usedEmojis.includes(a.emoji));
    if (remainingActions.length === 0) return;
    
    const number = remainingNumbers[Math.floor(Math.random() * remainingNumbers.length)];
    const action = remainingActions[Math.floor(Math.random() * remainingActions.length)];
    
    const substitution = {
        number,
        emoji: action.emoji,
        label: action.label,
        action: action.action,
    };
    
    ec.substitutions.push(substitution);
    ec.currentLevel += 1;
    
    io.to(room.roomCode).emit('emoji_count_new_substitution', {
        substitution,
        substitutions: ec.substitutions,
        currentLevel: ec.currentLevel,
        maxLevel: ec.maxLevel,
    });
    
    console.log(`[EmojiCount] Nível ${ec.currentLevel}: ${number} → ${action.emoji} (${action.label})`);
}

function handleEmojiCountError(room, io) {
    const ec = room.emojiCount;
    if (!ec || !ec.active) return;
    ec.errorCount += 1;
    
    io.to(room.roomCode).emit('emoji_count_error', {
        errorCount: ec.errorCount,
        message: 'Erro registado! Recomecem a contagem a partir do 1.',
    });
}

function handleEmojiCountComplete(room, io) {
    const ec = room.emojiCount;
    if (!ec || !ec.active) return;
    if (ec.currentLevel < ec.maxLevel) return;
    
    finishEmojiCountMission(room, io, true);
}

function finishEmojiCountMission(room, io, success) {
    const ec = room.emojiCount;
    if (!ec || !ec.active) return;
    ec.active = false;
    if (ec.endTimer) clearTimeout(ec.endTimer);
    
    const elapsed = (Date.now() - ec.startTime) / 1000;
    
    if (success) {
        // Atribuir 2 barras de ouro ao Cofre Comum
        room.prizeFund.coins += 10; // 2 barras = 10 moedas
        convertCoinsToBars(room);
        
        io.to(room.roomCode).emit('mission_outcome', {
            success: true,
            reward: '2',
            rewardLabel: '2 Barras de Ouro',
            barsAdded: room.prizeFund.bars,
            coinsAdded: room.prizeFund.coins,
            title: room.currentMissionData.title,
            elapsed: elapsed,
            substitutions: ec.substitutions,
        });
        console.log(`[EmojiCount] ✅ Sucesso! Tempo: ${elapsed.toFixed(1)}s`);
    } else {
        io.to(room.roomCode).emit('mission_outcome', {
            success: false,
            reward: 0,
            rewardLabel: '0',
            barsAdded: room.prizeFund.bars,
            coinsAdded: room.prizeFund.coins,
            title: room.currentMissionData.title,
            substitutions: ec.substitutions,
        });
        console.log(`[EmojiCount] ❌ Falha (tempo esgotado). Nível atingido: ${ec.currentLevel}/10`);
    }
    
    room.emojiCount = null;
    
    // Após 3s, avançar para avaliação (como as outras missões)
    setTimeout(() => {
        io.to(room.roomCode).emit('mission_evaluation');
    }, 3500);
}

// ===== MISSÃO: TICO, TECO, TACO =====
const TTT_SEQUENCE = ['TICO', 'TECO', 'TACO'];

function startTicoTecoTacoMission(room, io) {
    const timeLimit = room.currentMissionData.timeLimit || 120;
    const responseTimeLimit = room.currentMissionData.responseTimeLimit || 2.5;
    const targetCorrect = room.currentMissionData.targetCorrect || 25;
    
    room.ticoTecoTaco = {
        active: true,
        timeLimit,
        responseTimeLimit,
        targetCorrect,
        startTime: Date.now(),
        correctCount: 0,
        currentWord: null,
        currentDeadline: null,
        responseTimer: null,
        endTimer: null,
        timeoutFlashTimer: null,
    };
    
    // Rodízio de jogadores
    const alivePlayers = room.players.filter(p => p.alive);
    const rotation = [...alivePlayers].sort(() => Math.random() - 0.5).map(p => p.id);
    
    room.ticoTecoTaco.rotation = rotation;
    room.ticoTecoTaco.rotationIndex = 0;
    
    io.to(room.roomCode).emit('ttt_start', {
        timeLimit,
        responseTimeLimit,
        targetCorrect,
    });
    
    // Timer global
    room.ticoTecoTaco.endTimer = setTimeout(() => {
        finishTicoTecoTacoMission(room, io, false);
    }, timeLimit * 1000);
    
    console.log(`[TicoTecoTaco] Missão iniciada. ${timeLimit}s | ${targetCorrect} acertos | ${responseTimeLimit}s por resposta`);
    
    // Iniciar primeira palavra
    setTimeout(() => nextTicoTecoTacoWord(room, io), 2000);
}

function nextTicoTecoTacoWord(room, io) {
    const ttt = room.ticoTecoTaco;
    if (!ttt || !ttt.active) return;
    
    // Escolher palavra aleatória da sequência
    const word = TTT_SEQUENCE[Math.floor(Math.random() * TTT_SEQUENCE.length)];
    ttt.currentWord = word;
    
    // Rodízio de jogador ativo (só para exibição)
    const activeId = ttt.rotation[ttt.rotationIndex % ttt.rotation.length];
    ttt.rotationIndex++;
    const activePlayer = room.players.find(p => p.id === activeId);
    
    // Calcular deadline
    const now = Date.now();
    ttt.currentDeadline = now + ttt.responseTimeLimit * 1000;
    
    io.to(room.roomCode).emit('ttt_word', {
        word,
        activePlayerId: activeId,
        activePlayerName: activePlayer ? activePlayer.name : 'Desconhecido',
        correctCount: ttt.correctCount,
        targetCorrect: ttt.targetCorrect,
        responseTimeLimit: ttt.responseTimeLimit,
        elapsed: (now - ttt.startTime) / 1000,
    });
    
    // Timer de 2.5s para timeout automático
    if (ttt.responseTimer) clearTimeout(ttt.responseTimer);
    ttt.responseTimer = setTimeout(() => {
        handleTicoTecoTacoTimeout(room, io);
    }, ttt.responseTimeLimit * 1000);
}

function handleTicoTecoTacoCorrect(room, io) {
    const ttt = room.ticoTecoTaco;
    if (!ttt || !ttt.active) return;
    
    if (ttt.responseTimer) clearTimeout(ttt.responseTimer);
    
    ttt.correctCount += 1;
    
    io.to(room.roomCode).emit('ttt_correct', {
        correctCount: ttt.correctCount,
        targetCorrect: ttt.targetCorrect,
        elapsed: (Date.now() - ttt.startTime) / 1000,
    });
    
    // Se atingiu o alvo
    if (ttt.correctCount >= ttt.targetCorrect) {
        finishTicoTecoTacoMission(room, io, true);
        return;
    }
    
    // Próxima palavra
    setTimeout(() => nextTicoTecoTacoWord(room, io), 400);
}

function handleTicoTecoTacoError(room, io) {
    const ttt = room.ticoTecoTaco;
    if (!ttt || !ttt.active) return;
    
    if (ttt.responseTimer) clearTimeout(ttt.responseTimer);
    
    ttt.correctCount = 0;
    
    io.to(room.roomCode).emit('ttt_error', {
        reason: 'error',
        correctCount: 0,
        targetCorrect: ttt.targetCorrect,
        elapsed: (Date.now() - ttt.startTime) / 1000,
    });
    
    // Próxima palavra (recomeça a sequência)
    setTimeout(() => nextTicoTecoTacoWord(room, io), 1500);
}

function handleTicoTecoTacoTimeout(room, io) {
    const ttt = room.ticoTecoTaco;
    if (!ttt || !ttt.active) return;
    
    ttt.correctCount = 0;
    
    io.to(room.roomCode).emit('ttt_error', {
        reason: 'timeout',
        correctCount: 0,
        targetCorrect: ttt.targetCorrect,
        elapsed: (Date.now() - ttt.startTime) / 1000,
    });
    
    // Próxima palavra
    setTimeout(() => nextTicoTecoTacoWord(room, io), 1500);
}

function finishTicoTecoTacoMission(room, io, success) {
    const ttt = room.ticoTecoTaco;
    if (!ttt || !ttt.active) return;
    ttt.active = false;
    
    if (ttt.responseTimer) clearTimeout(ttt.responseTimer);
    if (ttt.endTimer) clearTimeout(ttt.endTimer);
    
    const elapsed = (Date.now() - ttt.startTime) / 1000;
    
    if (success) {
        // Atribuir 2 barras (10 moedas)
        room.prizeFund.coins += 10;
        convertCoinsToBars(room);
        
        io.to(room.roomCode).emit('mission_outcome', {
            success: true,
            reward: '2',
            rewardLabel: '2 Barras de Ouro',
            barsAdded: room.prizeFund.bars,
            coinsAdded: room.prizeFund.coins,
            title: room.currentMissionData.title,
            elapsed: elapsed,
            correctCount: ttt.correctCount,
            targetCorrect: ttt.targetCorrect,
        });
        console.log(`[TicoTecoTaco] ✅ Sucesso! ${ttt.correctCount}/${ttt.targetCorrect} em ${elapsed.toFixed(1)}s`);
    } else {
        io.to(room.roomCode).emit('mission_outcome', {
            success: false,
            reward: 0,
            rewardLabel: '0',
            barsAdded: room.prizeFund.bars,
            coinsAdded: room.prizeFund.coins,
            title: room.currentMissionData.title,
            elapsed: elapsed,
            correctCount: ttt.correctCount,
            targetCorrect: ttt.targetCorrect,
        });
        console.log(`[TicoTecoTaco] ❌ Falha. ${ttt.correctCount}/${ttt.targetCorrect}`);
    }
    
    room.ticoTecoTaco = null;
    
    setTimeout(() => {
        io.to(room.roomCode).emit('mission_evaluation');
    }, 3500);
}

// ===== JOGO: ROLETA DAS PALAVRAS =====
// Letras finais preferenciais (onde terminam mais palavras portuguesas)
const PREFERRED_END_LETTERS = ['A', 'E', 'O', 'S', 'R', 'L', 'M', 'N'];

// Constrói combinações válidas a partir do dicionário
// Retorna uma lista de { start, end, count, difficulty }
let _validCombinationsCache = null;
function buildValidCombinations() {
    if (_validCombinationsCache) return _validCombinationsCache;
    
    const map = {}; // `${start}-${end}` -> count
    
    DICIONARIO.forEach(word => {
        if (word.length < 2) return;
        const start = word[0].toUpperCase();
        const end = word[word.length - 1].toUpperCase();
        const key = `${start}-${end}`;
        map[key] = (map[key] || 0) + 1;
    });
    
    const combos = [];
    Object.entries(map).forEach(([key, count]) => {
        const [start, end] = key.split('-');
        // Critérios:
        // - Mínimo de 3 palavras (garantir que há alternativas)
        // - Máximo de 200 palavras (não ser trivial)
        // - Letra final deve estar na lista preferencial OU ter muitas palavras
        if (count >= 3 && count <= 500) {
            const isPreferredEnd = PREFERRED_END_LETTERS.includes(end);
            // Se for letra final não-preferida, exigir mínimo 8 palavras
            if (!isPreferredEnd && count < 8) return;
            combos.push({ start, end, count });
        }
    });
    
    // Ordenar por dificuldade (mais palavras = mais fácil)
    combos.sort((a, b) => a.count - b.count);
    
    console.log(`[WordRoulette] ${combos.length} combinações válidas construídas.`);
    _validCombinationsCache = combos;
    return combos;
}

// Escolhe N combinações variadas e sem repetir
function selectRouletteCombinations(numRounds) {
    const combos = buildValidCombinations();
    if (combos.length < numRounds) {
        console.warn(`[WordRoulette] Só há ${combos.length} combinações válidas para ${numRounds} rondas.`);
    }
    
    // Estratégia de dificuldade: 3 fáceis, 4 médias, 3 difíceis (ou proporcional)
    const sorted = [...combos].sort((a, b) => b.count - a.count);
    const total = sorted.length;
    
    const easy = sorted.slice(0, Math.floor(total * 0.3));
    const medium = sorted.slice(Math.floor(total * 0.3), Math.floor(total * 0.7));
    const hard = sorted.slice(Math.floor(total * 0.7));
    
    const pools = { easy, medium, hard };
    const distribution = [];
    for (let i = 0; i < numRounds; i++) {
        const r = i / numRounds;
        if (r < 0.3) distribution.push('easy');
        else if (r < 0.7) distribution.push('medium');
        else distribution.push('hard');
    }
    
    const selected = [];
    const used = new Set();
    
    distribution.forEach(diff => {
        const pool = pools[diff].filter(c => !used.has(`${c.start}-${c.end}`));
        if (pool.length === 0) return;
        const pick = pool[Math.floor(Math.random() * pool.length)];
        selected.push(pick);
        used.add(`${pick.start}-${pick.end}`);
    });
    
    // Preencher se faltarem
    while (selected.length < numRounds) {
        const remaining = combos.filter(c => !used.has(`${c.start}-${c.end}`));
        if (remaining.length === 0) break;
        const pick = remaining[Math.floor(Math.random() * remaining.length)];
        selected.push(pick);
        used.add(`${pick.start}-${pick.end}`);
    }
    
    return selected;
}

function startWordRouletteGame(room, io) {
    const numRounds = room.currentArsenalTask.rounds || 10;
    const roundTimeLimit = room.currentArsenalTask.roundTimeLimit || 30;
    
    const combinations = selectRouletteCombinations(numRounds);
    
    room.wordRoulette = {
        active: true,
        numRounds,
        roundTimeLimit,
        combinations,
        currentRound: 0,
        scores: {},           // playerId -> { wins, totalTime }
        roundTimer: null,
        roundStartTime: null,
        roundAnswered: false,
        roundWinner: null,
    };
    
    // Inicializar pontuações
    room.players.filter(p => p.alive).forEach(p => {
        room.wordRoulette.scores[p.id] = { wins: 0, totalTime: 0 };
    });
    
    console.log(`[WordRoulette] Jogo iniciado com ${combinations.length} rondas.`);
    
    // Notificar o início (com pequeno delay para o cliente preparar)
    setTimeout(() => startWordRouletteRound(room, io), 1500);
}

function startWordRouletteRound(room, io) {
    const wr = room.wordRoulette;
    if (!wr || !wr.active) return;
    
    if (wr.currentRound >= wr.combinations.length) {
        finishWordRouletteGame(room, io);
        return;
    }
    
    const combo = wr.combinations[wr.currentRound];
    wr.roundAnswered = false;
    wr.roundWinner = null;
    wr.roundStartTime = Date.now();
    
    // Emitir início da ronda com animação (o cliente faz a animação)
    io.to(room.roomCode).emit('word_roulette_round', {
        roundNumber: wr.currentRound + 1,
        totalRounds: wr.combinations.length,
        startLetter: combo.start,
        endLetter: combo.end,
        timeLimit: wr.roundTimeLimit,
    });
    
    if (wr.roundTimer) clearTimeout(wr.roundTimer);
    wr.roundTimer = setTimeout(() => {
        // Ninguém acertou
        if (!wr.roundAnswered) {
            wr.roundAnswered = true;
            io.to(room.roomCode).emit('word_roulette_round_end', {
                roundNumber: wr.currentRound + 1,
                winnerId: null,
                winnerName: null,
                word: null,
                time: null,
                scores: buildRouletteScores(room),
                timeout: true,
            });
            
            setTimeout(() => {
                wr.currentRound++;
                startWordRouletteRound(room, io);
            }, 3000);
        }
    }, wr.roundTimeLimit * 1000);
}

function buildRouletteScores(room) {
    const wr = room.wordRoulette;
    if (!wr) return [];
    return Object.entries(wr.scores).map(([id, s]) => {
        const p = room.players.find(pl => pl.id === id);
        return {
            playerId: id,
            playerName: p ? p.name : 'Desconhecido',
            wins: s.wins,
            totalTime: s.totalTime,
        };
    }).sort((a, b) => {
        if (b.wins !== a.wins) return b.wins - a.wins;
        return a.totalTime - b.totalTime;
    });
}

function submitWordRouletteGuess(room, io, playerId, word) {
    const wr = room.wordRoulette;
    if (!wr || !wr.active || wr.roundAnswered) return;
    
    const combo = wr.combinations[wr.currentRound];
    if (!combo) return;
    
    const upperWord = (word || '').trim().toUpperCase();
    if (upperWord.length < 2) {
        io.to(playerId).emit('word_roulette_invalid', {
            reason: 'Palavra demasiado curta.',
        });
        return;
    }
    
    const start = upperWord[0];
    const end = upperWord[upperWord.length - 1];
    
    // Verificar letras
    if (start !== combo.start) {
        io.to(playerId).emit('word_roulette_invalid', {
            reason: `A palavra tem de começar por "${combo.start}".`,
        });
        return;
    }
    if (end !== combo.end) {
        io.to(playerId).emit('word_roulette_invalid', {
            reason: `A palavra tem de terminar em "${combo.end}".`,
        });
        return;
    }
    
    // Verificar dicionário (case-insensitive, aceitar acentos)
    const lower = upperWord.toLowerCase();
    let found = DICIONARIO.has(lower);
    if (!found) {
        // Tentar sem acentos
        const normalized = lower.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
        for (const w of DICIONARIO) {
            const wNorm = w.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
            if (wNorm === normalized) { found = true; break; }
        }
    }
    if (!found) {
        io.to(playerId).emit('word_roulette_invalid', {
            reason: `"${upperWord}" não está no dicionário.`,
        });
        return;
    }
    
    // VÁLIDA! É o primeiro?
    wr.roundAnswered = true;
    if (wr.roundTimer) clearTimeout(wr.roundTimer);
    
    const elapsed = (Date.now() - wr.roundStartTime) / 1000;
    wr.scores[playerId].wins += 1;
    wr.scores[playerId].totalTime += elapsed;
    wr.roundWinner = playerId;
    
    const winner = room.players.find(p => p.id === playerId);
    
    io.to(room.roomCode).emit('word_roulette_round_end', {
        roundNumber: wr.currentRound + 1,
        winnerId: playerId,
        winnerName: winner ? winner.name : 'Desconhecido',
        word: upperWord,
        time: elapsed,
        scores: buildRouletteScores(room),
    });
    
    console.log(`[WordRoulette] Ronda ${wr.currentRound + 1}: ${winner?.name} -> ${upperWord} (${elapsed.toFixed(3)}s)`);
    
    setTimeout(() => {
        wr.currentRound++;
        startWordRouletteRound(room, io);
    }, 3000);
}

function finishWordRouletteGame(room, io) {
    const wr = room.wordRoulette;
    if (!wr || !wr.active) return;
    wr.active = false;
    if (wr.roundTimer) clearTimeout(wr.roundTimer);
    
    const finalScores = buildRouletteScores(room);
    
    let winnerPlayer = null;
    if (finalScores.length > 0 && finalScores[0].wins > 0) {
        winnerPlayer = room.players.find(p => p.id === finalScores[0].playerId);
    }
    
    io.to(room.roomCode).emit('word_roulette_end', {
        finalScores,
        winnerId: winnerPlayer ? winnerPlayer.id : null,
        winnerName: winnerPlayer ? winnerPlayer.name : 'Ninguém',
    });
    
    room.wordRoulette = null;
    
    setTimeout(() => {
        processArsenal(room, winnerPlayer, pickRandomReward(), io);
    }, 3000);
}

// ===== MISSÃO: MÍMICA SILENCIOSA =====
let MIME_THEMES = [];
try {
    const p = path.join(__dirname, '..', 'data', 'mimica_temas.json');
    const data = JSON.parse(fs.readFileSync(p, 'utf-8'));
    MIME_THEMES = data.themes || [];
    console.log(`[SilentMime] ${MIME_THEMES.length} temas carregados.`);
} catch (e) {
    console.error('[SilentMime] Erro ao carregar temas:', e.message);
}

// Escolhe uma letra que NÃO esteja na palavra (para não dar pistas)
function pickAllowedSound(word) {
    const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');
    const upperWord = word.toUpperCase()
        .normalize('NFD').replace(/[\u0300-\u036f]/g, ''); // sem acentos
    
    // Preferir consoantes que NÃO estejam na palavra
    const consonants = alphabet.filter(l => !'AEIOU'.includes(l));
    const available = consonants.filter(l => !upperWord.includes(l));
    
    // Fallback: qualquer letra que não esteja na palavra
    const any = alphabet.filter(l => !upperWord.includes(l));
    const pool = available.length > 0 ? available : (any.length > 0 ? any : ['K']);
    
    return pool[Math.floor(Math.random() * pool.length)];
}

function startSilentMimeMission(room, io) {
    const timeLimit = room.currentMissionData.timeLimit || 120;
    
    // Escolher um tema aleatório
    const theme = MIME_THEMES[Math.floor(Math.random() * MIME_THEMES.length)];
    if (!theme) {
        console.error('[SilentMime] Nenhum tema disponível.');
        return;
    }
    
    // Filtrar palavras mime-friendly
    const eligible = theme.words.filter(w => w.mimeFriendly !== false);
    
    // Selecionar 10 palavras com progressão de dificuldade
    const easy = eligible.filter(w => w.difficulty === 'easy');
    const medium = eligible.filter(w => w.difficulty === 'medium');
    const hard = eligible.filter(w => w.difficulty === 'hard');
    
    // Embaralhar cada grupo
    [easy, medium, hard].forEach(arr => arr.sort(() => Math.random() - 0.5));
    
    // Distribuição: 3 fáceis, 4 médias, 3 difíceis (ou até esgotar)
    const selected = [];
    for (let i = 0; i < 3 && i < easy.length; i++) selected.push(easy[i]);
    for (let i = 0; i < 4 && i < medium.length; i++) selected.push(medium[i]);
    for (let i = 0; i < 3 && i < hard.length; i++) selected.push(hard[i]);
    // Preencher se faltarem
    const usedSet = new Set(selected.map(w => w.word));
    for (const w of eligible) {
        if (selected.length >= 10) break;
        if (!usedSet.has(w.word)) { selected.push(w); usedSet.add(w.word); }
    }
    
    // Preparar palavras com som permitido
    const wordsWithSound = selected.slice(0, 10).map(w => ({
        word: w.word,
        difficulty: w.difficulty,
        allowedSound: pickAllowedSound(w.word),
        guessed: false,
    }));
    
    // Rodízio de jogadores
    const alivePlayers = room.players.filter(p => p.alive);
    const rotation = [...alivePlayers].sort(() => Math.random() - 0.5).map(p => p.id);
    
    room.silentMime = {
        active: true,
        timeLimit,
        startTime: Date.now(),
        theme: theme.id,
        themeLabel: theme.label,
        words: wordsWithSound,
        currentIndex: 0,
        guessedCount: 0,
        rotation,
        rotationIndex: 0,
        currentMimerId: null,
        endTimer: null,
    };
    
    io.to(room.roomCode).emit('silent_mime_start', {
        timeLimit,
        themeLabel: theme.label,
        totalWords: wordsWithSound.length,
    });
    
    // Timer global
    room.silentMime.endTimer = setTimeout(() => {
        finishSilentMimeMission(room, io, false);
    }, timeLimit * 1000);
    
    console.log(`[SilentMime] Missão iniciada. Tema: ${theme.label} | ${wordsWithSound.length} palavras`);
    
    // Iniciar primeira ronda
    setTimeout(() => startSilentMimeRound(room, io), 2000);
}

function startSilentMimeRound(room, io) {
    const sm = room.silentMime;
    if (!sm || !sm.active) return;
    
    // Verificar se todas foram adivinhadas
    if (sm.guessedCount >= sm.words.length) {
        finishSilentMimeMission(room, io, true);
        return;
    }
    
    // Encontrar próxima palavra não adivinhada
    let nextIndex = sm.words.findIndex(w => !w.guessed);
    if (nextIndex === -1) {
        finishSilentMimeMission(room, io, true);
        return;
    }
    sm.currentIndex = nextIndex;
    
    // Rodízio do mimico
    if (sm.rotation.length === 0) return;
    const mimerId = sm.rotation[sm.rotationIndex % sm.rotation.length];
    sm.rotationIndex++;
    sm.currentMimerId = mimerId;
    
    const mimer = room.players.find(p => p.id === mimerId);
    const word = sm.words[sm.currentIndex];
    
    // Avisar todos (exceto o mimico, que recebe a palavra)
    io.to(room.roomCode).emit('silent_mime_round', {
        roundNumber: sm.guessedCount + 1,
        totalWords: sm.words.length,
        mimerName: mimer ? mimer.name : 'Desconhecido',
        mimerId: mimerId,
        word: null, // não revelar a palavra
        allowedSound: null,
        guessedCount: sm.guessedCount,
        elapsed: (Date.now() - sm.startTime) / 1000,
    });
    
    // Enviar ao mimico a palavra e o som (privado)
    io.to(mimerId).emit('silent_mime_your_turn', {
        word: word.word,
        allowedSound: word.allowedSound,
        difficulty: word.difficulty,
    });
    
    console.log(`[SilentMime] Ronda para ${mimer?.name}: "${word.word}" (som: ${word.allowedSound})`);
}

function handleSilentMimeCorrect(room, io, playerId) {
    const sm = room.silentMime;
    if (!sm || !sm.active) return;
    
    const word = sm.words[sm.currentIndex];
    if (!word || word.guessed) return;
    
    word.guessed = true;
    sm.guessedCount++;
    
    io.to(room.roomCode).emit('silent_mime_correct', {
        word: word.word,
        guessedBy: playerId,
        guessedCount: sm.guessedCount,
        totalWords: sm.words.length,
        elapsed: (Date.now() - sm.startTime) / 1000,
    });
    
    console.log(`[SilentMime] ✅ "${word.word}" adivinhada! (${sm.guessedCount}/${sm.words.length})`);
    
    // Se completou todas, terminar
    if (sm.guessedCount >= sm.words.length) {
        setTimeout(() => finishSilentMimeMission(room, io, true), 2000);
        return;
    }
    
    // Próxima ronda
    setTimeout(() => startSilentMimeRound(room, io), 2500);
}

function handleSilentMimePass(room, io) {
    const sm = room.silentMime;
    if (!sm || !sm.active) return;
    
    const word = sm.words[sm.currentIndex];
    if (!word || word.guessed) return;
    
    // Marcar como "passada" mas NÃO conta como adivinhada
    // Move para o próximo índice (a palavra pode voltar a aparecer no fim se sobrar tempo)
    io.to(room.roomCode).emit('silent_mime_passed', {
        word: word.word, // só mostramos depois de passar
        guessedCount: sm.guessedCount,
        elapsed: (Date.now() - sm.startTime) / 1000,
    });
    
    // Reordenar: mover a palavra passada para o fim da lista
    const currentWord = sm.words.splice(sm.currentIndex, 1)[0];
    sm.words.push(currentWord);
    
    console.log(`[SilentMime] ⏭️ "${currentWord.word}" passada.`);
    
    setTimeout(() => startSilentMimeRound(room, io), 2000);
}

function finishSilentMimeMission(room, io, success) {
    const sm = room.silentMime;
    if (!sm || !sm.active) return;
    sm.active = false;
    if (sm.endTimer) clearTimeout(sm.endTimer);
    
    const elapsed = (Date.now() - sm.startTime) / 1000;
    
    if (success) {
        // Atribuir 2 barras de ouro ao Cofre Comum
        room.prizeFund.coins += 10; // 2 barras = 10 moedas
        convertCoinsToBars(room);
        
        io.to(room.roomCode).emit('mission_outcome', {
            success: true,
            reward: '2',
            rewardLabel: '2 Barras de Ouro',
            barsAdded: room.prizeFund.bars,
            coinsAdded: room.prizeFund.coins,
            title: room.currentMissionData.title,
            elapsed: elapsed,
            guessedCount: sm.guessedCount,
            totalWords: sm.words.length,
        });
        console.log(`[SilentMime] ✅ Sucesso! Tempo: ${elapsed.toFixed(1)}s`);
    } else {
        io.to(room.roomCode).emit('mission_outcome', {
            success: false,
            reward: 0,
            rewardLabel: '0',
            barsAdded: room.prizeFund.bars,
            coinsAdded: room.prizeFund.coins,
            title: room.currentMissionData.title,
            elapsed: elapsed,
            guessedCount: sm.guessedCount,
            totalWords: sm.words.length,
        });
        console.log(`[SilentMime] ❌ Falha. ${sm.guessedCount}/${sm.words.length}`);
    }
    
    room.silentMime = null;
    
    setTimeout(() => {
        io.to(room.roomCode).emit('mission_evaluation');
    }, 3500);
}

// ===== ARSENAL: SOPRA E SOBREVIVE =====
function startBlowSurviveGame(room, io) {
    const alivePlayers = room.players.filter(p => p.alive);
    
    room.blowSurvive = {
        active: true,
        players: {},          // playerId -> { eliminated: false }
        eliminated: [],       // lista de playerIds eliminados
        currentTurnPlayerId: null,
        roundNumber: 0,
        awaitingDecision: false,
        winnerId: null,
    };
    
    alivePlayers.forEach(p => {
        room.blowSurvive.players[p.id] = { eliminated: false };
    });
    
    io.to(room.roomCode).emit('blow_survive_start', {
        totalPlayers: alivePlayers.length,
        playersLeft: alivePlayers.length,
    });
    
    console.log(`[BlowSurvive] Jogo iniciado com ${alivePlayers.length} jogadores.`);
    
    setTimeout(() => nextBlowSurviveTurn(room, io), 2000);
}

function nextBlowSurviveTurn(room, io) {
    const bs = room.blowSurvive;
    if (!bs || !bs.active) return;
    
    // Jogadores ativos
    const activePlayers = room.players.filter(p => 
        p.alive && bs.players[p.id] && !bs.players[p.id].eliminated
    );
    
    // Verificar vitória
    if (activePlayers.length <= 1) {
        bs.winnerId = activePlayers.length === 1 ? activePlayers[0].id : null;
        io.to(room.roomCode).emit('blow_survive_need_winner', {
            remaining: activePlayers.map(p => ({ id: p.id, name: p.name })),
            suggestedWinnerId: bs.winnerId,
        });
        return;
    }
    
    // Escolher aleatoriamente (nunca o mesmo da ronda anterior)
    const prev = bs.currentTurnPlayerId;
    const pool = activePlayers.filter(p => p.id !== prev);
    const chosen = pool.length > 0 
        ? pool[Math.floor(Math.random() * pool.length)]
        : activePlayers[0];
    
    bs.currentTurnPlayerId = chosen.id;
    bs.roundNumber += 1;
    bs.awaitingDecision = true;
    
    io.to(room.roomCode).emit('blow_survive_turn', {
        roundNumber: bs.roundNumber,
        playerId: chosen.id,
        playerName: chosen.name,
        playersLeft: activePlayers.length,
        eliminatedNames: bs.eliminated.map(id => {
            const p = room.players.find(pl => pl.id === id);
            return p ? p.name : '?';
        }),
    });
    
    console.log(`[BlowSurvive] Ronda ${bs.roundNumber}: ${chosen.name} deve soprar.`);
}

function handleBlowSurviveDecision(room, io, result) {
    // result: 'none' | 'some' | 'all'
    const bs = room.blowSurvive;
    if (!bs || !bs.active || !bs.awaitingDecision) return;
    
    const playerId = bs.currentTurnPlayerId;
    const player = room.players.find(p => p.id === playerId);
    if (!player) return;
    
    bs.awaitingDecision = false;
    
    let eliminated = false;
    let reason = '';
    
    if (result === 'none') {
        eliminated = true;
        reason = 'Não moveu nenhum pedaço.';
    } else if (result === 'all') {
        eliminated = true;
        reason = 'Moveu todos os pedaços (soprou demasiado forte).';
    } else if (result === 'some') {
        eliminated = false;
        reason = 'Moveu alguns pedaços — sobrevive.';
    } else {
        return; // inválido
    }
    
    if (eliminated) {
        bs.players[playerId].eliminated = true;
        bs.eliminated.push(playerId);
    }
    
    const activeCount = room.players.filter(p => 
        p.alive && bs.players[p.id] && !bs.players[p.id].eliminated
    ).length;
    
    io.to(room.roomCode).emit('blow_survive_result', {
        playerId,
        playerName: player.name,
        result,
        reason,
        eliminated,
        playersLeft: activeCount,
    });
    
    console.log(`[BlowSurvive] ${player.name}: ${reason} (${activeCount} em jogo)`);
    
    setTimeout(() => nextBlowSurviveTurn(room, io), 2500);
}

function confirmBlowSurviveWinner(room, io, winnerId) {
    const bs = room.blowSurvive;
    if (!bs || !bs.active) return;
    
    const winner = room.players.find(p => p.id === winnerId);
    if (!winner) return;
    
    bs.active = false;
    bs.winnerId = winnerId;
    
    io.to(room.roomCode).emit('blow_survive_winner', {
        winnerId,
        winnerName: winner.name,
    });
    
    room.blowSurvive = null;
    
    setTimeout(() => {
        processArsenal(room, winner, pickRandomReward(), io);
    }, 3000);
}

// ===== JOGO: TIME STOP / PRECISION TIMER =====
function startTimeStopGame(room, io) {
    const duration = room.currentArsenalTask.duration || 120;
    const targets = room.currentArsenalTask.targets || [0.500, 1.000, 1.500];
    const tolerance = room.currentArsenalTask.tolerance || 0.010;
    
    room.timeStop = {
        active: true,
        duration,
        targets,
        tolerance,
        players: {},
        endTimeout: null,
    };
    
    const alivePlayers = room.players.filter(p => p.alive);
    
    alivePlayers.forEach(player => {
        room.timeStop.players[player.id] = {
            startTime: null,
            completedAt: null,
            totalElapsedTime: null,
            currentTargetIndex: 0,
            completedTargets: 0,
            attempts: 0,
            eliminated: false,
            lastTargetAchievedAt: null,
            elapsedMs: 0,
        };
        
        io.to(player.id).emit('time_stop_start', {
            duration,
            targets,
            tolerance,
        });
    });
    
    // Timer global de fim de jogo
    room.timeStop.endTimeout = setTimeout(() => {
        finishTimeStopGame(room, io);
    }, duration * 1000);
    
    console.log(`[TimeStop] Jogo iniciado. Duração: ${duration}s | Metas: ${targets.join(', ')} | Tolerância: ±${tolerance}s`);
}

function handleTimeStopAttempt(room, io, playerId, attemptData) {
    const ts = room.timeStop;
    if (!ts || !ts.active) return;
    
    const pState = ts.players[playerId];
    if (!pState || pState.eliminated || pState.completedAt) return;
    
    const { elapsedSeconds } = attemptData;
    if (typeof elapsedSeconds !== 'number' || elapsedSeconds < 0) return;
    
    // Se for a primeira tentativa, registar o startTime
    if (pState.startTime === null) {
        pState.startTime = Date.now();
    }
    
    pState.attempts += 1;
    
    const target = ts.targets[pState.currentTargetIndex];
    const diff = Math.abs(elapsedSeconds - target);
    const success = diff <= ts.tolerance;
    
    if (!success) {
        // Falhou - retorna o resultado, mantém o alvo atual
        io.to(playerId).emit('time_stop_result', {
            success: false,
            target,
            elapsed: elapsedSeconds,
            diff,
            currentTargetIndex: pState.currentTargetIndex,
            completedTargets: pState.completedTargets,
        });
        return;
    }
    
    // Acertou
    pState.completedTargets += 1;
    pState.currentTargetIndex += 1;
    pState.lastTargetAchievedAt = Date.now();
    
    const allCompleted = pState.completedTargets >= ts.targets.length;
    
    if (allCompleted) {
        // Completou as 3 metas!
        pState.completedAt = Date.now();
        pState.totalElapsedTime = (pState.completedAt - pState.startTime) / 1000;
        pState.elapsedMs = pState.totalElapsedTime * 1000;
        
        io.to(playerId).emit('time_stop_result', {
            success: true,
            target,
            elapsed: elapsedSeconds,
            diff,
            completed: true,
            completedTargets: pState.completedTargets,
            totalElapsedTime: pState.totalElapsedTime,
            attempts: pState.attempts,
        });
        
        // Notificar todos
        const player = room.players.find(p => p.id === playerId);
        io.to(room.roomCode).emit('time_stop_player_completed', {
            playerId,
            playerName: player ? player.name : 'Desconhecido',
            totalElapsedTime: pState.totalElapsedTime,
        });
        
        console.log(`[TimeStop] ${player?.name} completou as 3 metas em ${pState.totalElapsedTime.toFixed(3)}s`);
        
        // Se todos completaram, terminar já
        const allPlayers = Object.values(ts.players);
        const allDone = allPlayers.every(p => p.completedAt || p.eliminated);
        if (allDone) {
            if (ts.endTimeout) clearTimeout(ts.endTimeout);
            finishTimeStopGame(room, io);
        }
    } else {
        io.to(playerId).emit('time_stop_result', {
            success: true,
            target,
            elapsed: elapsedSeconds,
            diff,
            completed: false,
            nextTarget: ts.targets[pState.currentTargetIndex],
            completedTargets: pState.completedTargets,
            totalElapsedTime: pState.totalElapsedTime,
        });
    }
}

function finishTimeStopGame(room, io) {
    const ts = room.timeStop;
    if (!ts || !ts.active) return;
    ts.active = false;
    if (ts.endTimeout) clearTimeout(ts.endTimeout);
    
    const entries = Object.entries(ts.players).map(([id, p]) => {
        const player = room.players.find(pl => pl.id === id);
        return { playerId: id, playerName: player ? player.name : '?', completedTargets: p.completedTargets, totalElapsedTime: p.totalElapsedTime, attempts: p.attempts, lastTargetAchievedAt: p.lastTargetAchievedAt };
    });
    entries.sort((a, b) => {
        if (b.completedTargets !== a.completedTargets) return b.completedTargets - a.completedTargets;
        if (a.completedTargets === ts.targets.length && b.completedTargets === ts.targets.length) {
            return (a.totalElapsedTime || 0) - (b.totalElapsedTime || 0);
        }
        return (a.lastTargetAchievedAt || Infinity) - (b.lastTargetAchievedAt || Infinity);
    });
    
    let winnerPlayer = null;
    if (entries.length > 0 && entries[0].completedTargets > 0) {
        winnerPlayer = room.players.find(p => p.id === entries[0].playerId);
    }
    
    io.to(room.roomCode).emit('time_stop_end', {
        finalScores: entries,
        winnerId: winnerPlayer ? winnerPlayer.id : null,
        winnerName: winnerPlayer ? winnerPlayer.name : 'Ninguém',
    });
    
    room.timeStop = null;
    
    setTimeout(() => {
        processArsenal(room, winnerPlayer, pickRandomReward(), io);
    }, 3000);
}

// ===== JOGO: COLOR REFLEX =====
const VALID_COLORS = ['red', 'green', 'blue', 'yellow'];
const PURPLE = 'purple';
const GRID_SIZE = 16;

function startColorReflexGame(room, io) {
    const duration = room.currentArsenalTask.duration || 60;
    
    room.colorReflex = {
        active: true,
        duration: duration,
        players: {},
    };
    
    const alivePlayers = room.players.filter(p => p.alive);
    
    alivePlayers.forEach(player => {
        const grid = Array(GRID_SIZE).fill(null).map(() => ({
            state: 'inactive',
            color: null,
        }));
        
        room.colorReflex.players[player.id] = {
            grid,
            score: 0,
            eliminated: false,
            eliminationTime: null,
            lastScoreTime: null,
            timeouts: [],
        };
        
        // Avisar o jogador que o jogo começou
        io.to(player.id).emit('color_reflex_start', {
            duration: duration,
            gridSize: GRID_SIZE,
        });
        
        // Agendar primeiras ativações
        for (let i = 0; i < GRID_SIZE; i++) {
            scheduleColorReflexActivation(room, io, player.id, i, 300, 1500);
        }
    });
    
    // Timer de fim de jogo
    room.colorReflex.endTimeout = setTimeout(() => {
        finishColorReflexGame(room, io);
    }, duration * 1000);
    
    console.log(`[ColorReflex] Jogo iniciado. Duração: ${duration}s`);
}

function scheduleColorReflexActivation(room, io, playerId, index, minDelay = 500, maxDelay = 3000) {
    const cr = room.colorReflex;
    if (!cr || !cr.active) return;
    const pState = cr.players[playerId];
    if (!pState || pState.eliminated) return;
    
    const delay = minDelay + Math.random() * (maxDelay - minDelay);
    const timeoutId = setTimeout(() => {
        activateColorReflexSquare(room, io, playerId, index);
    }, delay);
    pState.timeouts.push(timeoutId);
}

function activateColorReflexSquare(room, io, playerId, index) {
    const cr = room.colorReflex;
    if (!cr || !cr.active) return;
    const pState = cr.players[playerId];
    if (!pState || pState.eliminated) return;
    
    // 15% chance de roxo, senão cor válida
    const isPurple = Math.random() < 0.15;
    const color = isPurple ? PURPLE : VALID_COLORS[Math.floor(Math.random() * VALID_COLORS.length)];
    
    const square = pState.grid[index];
    square.state = 'active';
    square.color = color;
    
    io.to(playerId).emit('color_reflex_square', {
        index,
        state: 'active',
        color,
    });
    
    // Auto-desativar: roxo dura menos tempo
    const activeDuration = isPurple ? 1500 : 2500;
    const timeoutId = setTimeout(() => {
        if (square.state === 'active') {
            square.state = 'inactive';
            square.color = null;
            io.to(playerId).emit('color_reflex_square', {
                index,
                state: 'inactive',
                color: null,
            });
            scheduleColorReflexActivation(room, io, playerId, index);
        }
    }, activeDuration);
    pState.timeouts.push(timeoutId);
}

function handleColorReflexClick(room, io, playerId, index) {
    const cr = room.colorReflex;
    if (!cr || !cr.active) return;
    const pState = cr.players[playerId];
    if (!pState || pState.eliminated) return;
    
    const square = pState.grid[index];
    if (!square || square.state !== 'active') return;
    
    if (square.color === PURPLE) {
        // Eliminado
        pState.eliminated = true;
        pState.eliminationTime = Date.now();
        io.to(playerId).emit('color_reflex_eliminated');
        console.log(`[ColorReflex] ${playerId} eliminado por clicar no roxo.`);
        return;
    }
    
    // Pontuação
    pState.score += 1;
    pState.lastScoreTime = Date.now();
    
    io.to(playerId).emit('color_reflex_score', {
        score: pState.score,
        index,
    });
    
    // Desativar quadrado
    square.state = 'inactive';
    square.color = null;
    io.to(playerId).emit('color_reflex_square', {
        index,
        state: 'inactive',
        color: null,
    });
    
    scheduleColorReflexActivation(room, io, playerId, index);
}

function finishColorReflexGame(room, io) {
    const cr = room.colorReflex;
    if (!cr) return;
    cr.active = false;
    
    Object.values(cr.players).forEach(p => p.timeouts.forEach(t => clearTimeout(t)));
    if (cr.endTimeout) clearTimeout(cr.endTimeout);
    
    const entries = Object.entries(cr.players).map(([id, p]) => {
        const player = room.players.find(pl => pl.id === id);
        return { playerId: id, playerName: player ? player.name : '?', score: p.score, eliminated: p.eliminated, lastScoreTime: p.lastScoreTime || 0 };
    });
    entries.sort((a, b) => {
        if (b.score !== a.score) return b.score - a.score;
        return a.lastScoreTime - b.lastScoreTime;
    });
    
    let winnerPlayer = null;
    if (entries.length > 0 && entries[0].score > 0) {
        winnerPlayer = room.players.find(p => p.id === entries[0].playerId);
    }
    
    io.to(room.roomCode).emit('color_reflex_end', {
        finalScores: entries,
        winnerId: winnerPlayer ? winnerPlayer.id : null,
        winnerName: winnerPlayer ? winnerPlayer.name : 'Ninguém',
    });
    
    room.colorReflex = null;
    
    setTimeout(() => {
        processArsenal(room, winnerPlayer, pickRandomReward(), io);
    }, 3000);
}

// ===== JOGO: O Que Vem a Seguir? =====
function startWordGuesserGame(room, io) {
    const task = room.currentArsenalTask;
    const allWords = task.wordsList || [];
    const numRounds = task.rounds || 10;
    
    // Embaralhar e escolher
    const shuffled = [...allWords].sort(() => Math.random() - 0.5);
    const selectedWords = shuffled.slice(0, numRounds);
    
    room.wordGuesser = {
		active: true,
        words: selectedWords,
        currentRound: 0,
        scores: {},
        roundTimer: null,
        answered: false,
        firstCorrect: null,
    };
    
    // Inicializar pontuações
    room.players.filter(p => p.alive).forEach(p => {
        room.wordGuesser.scores[p.id] = 0;
    });
    
    startWordGuesserRound(room, io);
}

function startWordGuesserRound(room, io) {
    const wg = room.wordGuesser;
    if (!wg) return;
    
    // Se já terminou todas as rondas
    if (wg.currentRound >= wg.words.length) {
        finishWordGuesserGame(room, io);
        return;
    }
    
    const roundData = wg.words[wg.currentRound];
    wg.answered = false;
    wg.firstCorrect = null;
    
    const timeLimit = room.currentArsenalTask.timeLimit || 30;
    
    io.to(room.roomCode).emit('word_guesser_round', {
        roundNumber: wg.currentRound + 1,
        totalRounds: wg.words.length,
        clues: roundData.clues,
        timeLimit: timeLimit,
    });
    
    if (wg.roundTimer) clearTimeout(wg.roundTimer);
    wg.roundTimer = setTimeout(() => {
        // Ninguém acertou
        io.to(room.roomCode).emit('word_guesser_round_end', {
            winnerId: null,
            winnerName: null,
            answer: roundData.answer,
            roundNumber: wg.currentRound + 1,
            scores: buildScoresArray(room),
        });
        
        setTimeout(() => {
            wg.currentRound++;
            startWordGuesserRound(room, io);
        }, 3000);
    }, timeLimit * 1000);
}

function submitWordGuess(room, io, playerId, guess) {
    const wg = room.wordGuesser;
    if (!wg || wg.answered) return;
    
    const roundData = wg.words[wg.currentRound];
    if (!roundData) return;
    
    const normalizedGuess = (guess || '').trim().toUpperCase();
    const normalizedAnswer = roundData.answer.toUpperCase();
    
    // Resposta errada
    if (normalizedGuess !== normalizedAnswer) {
        io.to(playerId).emit('word_guesser_wrong', { guess: normalizedGuess });
        return;
    }
    
    // Resposta correta - primeiro a acertar ganha a ronda
    wg.answered = true;
    wg.firstCorrect = playerId;
    wg.scores[playerId] = (wg.scores[playerId] || 0) + 1;
    
    if (wg.roundTimer) clearTimeout(wg.roundTimer);
    
    const winner = room.players.find(p => p.id === playerId);
    
    io.to(room.roomCode).emit('word_guesser_round_end', {
        winnerId: playerId,
        winnerName: winner?.name || 'Desconhecido',
        answer: roundData.answer,
        roundNumber: wg.currentRound + 1,
        scores: buildScoresArray(room),
    });
    
    setTimeout(() => {
        wg.currentRound++;
        startWordGuesserRound(room, io);
    }, 3000);
}

function buildScoresArray(room) {
    const wg = room.wordGuesser;
    if (!wg) return [];
    return Object.entries(wg.scores).map(([id, count]) => {
        const p = room.players.find(pl => pl.id === id);
        return {
            playerId: id,
            playerName: p ? p.name : 'Desconhecido',
            score: count,
        };
    }).sort((a, b) => b.score - a.score);
}

function finishWordGuesserGame(room, io) {
    const wg = room.wordGuesser;
    if (!wg || !wg.active) return;
    wg.active = false;
    
    let maxScore = 0;
    let winners = [];
    Object.entries(wg.scores).forEach(([id, count]) => {
        if (count > maxScore) { maxScore = count; winners = [id]; }
        else if (count === maxScore && count > 0) winners.push(id);
    });
    
    let winnerPlayer = null;
    if (winners.length > 0) winnerPlayer = room.players.find(p => p.id === winners[0]);
    
    io.to(room.roomCode).emit('word_guesser_end', {
        finalScores: buildScoresArray(room),
        winnerId: winnerPlayer ? winnerPlayer.id : null,
        winnerName: winnerPlayer ? winnerPlayer.name : 'Ninguém',
    });
    
    room.wordGuesser = null;
    
    setTimeout(() => {
        processArsenal(room, winnerPlayer, pickRandomReward(), io);
    }, 3000);
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

function processArsenal(room, winner, randomReward, io, delayMs = 5000) {
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

    setTimeout(() => startMurderPhase(room, io), delayMs);
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
            secretMission: null,
            phase: room.phase
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

    // Passar io para loadNewMission
    loadNewMission(room, io);

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
};