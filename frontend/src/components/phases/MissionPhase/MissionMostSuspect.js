import React, { useState, useEffect, useRef } from 'react';

export default function MissionMostSuspect({ socket, roomData, playerId, playerState }) {
  const [gameStarted, setGameStarted] = useState(false);
  const [phase, setPhase] = useState('waiting'); // 'waiting' | 'voting' | 'waiting_others' | 'dilemma' | 'reveal'
  const [question, setQuestion] = useState(null);
  const [questionNumber, setQuestionNumber] = useState(0);
  const [totalQuestions, setTotalQuestions] = useState(10);
  const [players, setPlayers] = useState([]);
  const [myVote, setMyVote] = useState(null);
  const [votedCount, setVotedCount] = useState(0);
  const [totalNeeded, setTotalNeeded] = useState(0);
  const [dilemma, setDilemma] = useState(null);
  const [reveal, setReveal] = useState(null);
  const [correctCount, setCorrectCount] = useState(0);
  const [timer, setTimer] = useState(0);
  const decisionLockedRef = useRef(false);

  // Socket listeners
  useEffect(() => {
    if (!socket) return;

    const onStart = (data) => {
      setGameStarted(true);
      setTimer(data.timeLimit);
      setTotalQuestions(data.totalQuestions);
      setPhase('waiting');
      setCorrectCount(0);
      setMyVote(null);
      setDilemma(null);
      setReveal(null);
      decisionLockedRef.current = false;
    };

    const onQuestion = (data) => {
      setPhase('voting');
      setQuestion({
        id: data.questionId,
        text: data.questionText,
      });
      setQuestionNumber(data.questionNumber);
      setPlayers(data.players || []);
      setMyVote(null);
      setVotedCount(0);
      setTotalNeeded((data.players || []).length);
      setDilemma(null);
      setReveal(null);
      decisionLockedRef.current = false;
    };

    const onVoteConfirmed = (data) => {
      setMyVote(data.targetId);
      setPhase('waiting_others');
    };

    const onVoteProgress = (data) => {
      setVotedCount(data.votedCount);
      setTotalNeeded(data.totalNeeded);
    };

    const onDilemma = (data) => {
      setPhase('dilemma');
      setDilemma(data);
    };

    const onReveal = (data) => {
      setPhase('reveal');
      setReveal(data);
      setCorrectCount(data.correctCount);
    };

    socket.on('most_suspect_start', onStart);
    socket.on('most_suspect_question', onQuestion);
    socket.on('most_suspect_vote_confirmed', onVoteConfirmed);
    socket.on('most_suspect_vote_progress', onVoteProgress);
    socket.on('most_suspect_dilemma', onDilemma);
    socket.on('most_suspect_reveal', onReveal);

    return () => {
      socket.off('most_suspect_start', onStart);
      socket.off('most_suspect_question', onQuestion);
      socket.off('most_suspect_vote_confirmed', onVoteConfirmed);
      socket.off('most_suspect_vote_progress', onVoteProgress);
      socket.off('most_suspect_dilemma', onDilemma);
      socket.off('most_suspect_reveal', onReveal);
    };
  }, [socket]);

  // Countdown
  useEffect(() => {
    if (!gameStarted || timer <= 0) return;
    const interval = setInterval(() => {
      setTimer(prev => (prev <= 1 ? 0 : prev - 1));
    }, 1000);
    return () => clearInterval(interval);
  }, [gameStarted, timer]);

  const handleVote = (targetId) => {
    if (myVote) return;
    if (targetId === playerId) return; // não pode votar em si próprio
    socket.emit('most_suspect_vote', {
      roomCode: roomData.roomCode,
      targetId,
    });
  };

  const handleDecision = (choice) => {
    if (decisionLockedRef.current) return;
    decisionLockedRef.current = true;
    socket.emit('most_suspect_decision', {
      roomCode: roomData.roomCode,
      choiceId: choice,
    });
  };

  const formatTime = (s) => `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, '0')}`;

  // ============ ECRÃ DE ESPERA ============
  if (!gameStarted) {
    return (
      <div className="text-center">
        <h1 className="text-5xl font-bold text-[#E5C982] mb-8">🕵️ OS MAIS SUSPEITOS</h1>
        <p className="text-[#F3EBDD] animate-pulse">A preparar as perguntas...</p>
      </div>
    );
  }

  // ============ ECRÃ DE JOGO ============
  return (
    <div className="text-center max-w-3xl mx-auto">
      <h1 className="text-4xl font-display font-bold text-[#E5C982] mb-2">🕵️ OS MAIS SUSPEITOS</h1>
      <p className="text-[#F3EBDD]/60 text-sm mb-4">
        Pergunta {questionNumber} de {totalQuestions}
      </p>

      {/* Header: Timer + Acertos */}
      <div className="flex justify-center items-center gap-6 mb-6 flex-wrap">
        <div className="text-center">
          <div className={`w-20 h-20 rounded-full border-4 flex items-center justify-center bg-[#291923] ${
            timer <= 30 ? 'border-red-500 animate-pulse' : 'border-[#D8B66C]'
          }`}>
            <span className="font-display text-2xl font-bold text-[#D8B66C]">{formatTime(timer)}</span>
          </div>
          <p className="text-xs text-[#F3EBDD]/60 uppercase tracking-widest mt-1">Tempo</p>
        </div>
        <div className="text-center">
          <div className="w-20 h-20 rounded-full border-4 border-[#D8B66C] flex items-center justify-center bg-[#291923]">
            <span className="font-display text-2xl font-bold text-[#E5C982]">{correctCount}/{totalQuestions}</span>
          </div>
          <p className="text-xs text-[#F3EBDD]/60 uppercase tracking-widest mt-1">Acertos</p>
        </div>
      </div>

      {/* Pergunta */}
      {question && (
        <div className="bg-[#291923] border-2 border-[#D8B66C] rounded-lg p-6 mb-6">
          <p className="text-3xl font-display text-[#E5C982]">{question.text}</p>
        </div>
      )}

      {/* FASE 1 — VOTAÇÃO */}
      {phase === 'voting' && question && (
        <>
          <p className="text-sm text-[#F3EBDD]/70 mb-4">
            Escolhe um jogador em segredo. Ninguém vê a tua resposta.
          </p>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-2 mb-6">
            {players.filter(p => p.id !== playerId).map(p => (
              <button
                key={p.id}
                onClick={() => handleVote(p.id)}
                className="py-3 px-4 bg-[#291923] border-2 border-[#D8B66C]/40 text-[#F3EBDD] font-bold rounded-lg hover:border-[#D8B66C] hover:bg-[#412734] transition"
              >
                {p.name}
              </button>
            ))}
          </div>
        </>
      )}

      {/* VOTO CONFIRMADO */}
      {phase === 'waiting_others' && (
        <div className="bg-[#D8B66C]/20 border-2 border-[#D8B66C] rounded-lg p-6 mb-6">
          <p className="text-lg text-[#E5C982] mb-2">✅ Voto registado!</p>
          <p className="text-sm text-[#F3EBDD]/70">
            A aguardar os outros jogadores... ({votedCount}/{totalNeeded})
          </p>
          <div className="mt-3 h-2 bg-[#1a0f15] rounded-full overflow-hidden">
            <div
              className="h-full bg-[#D8B66C] transition-all duration-300"
              style={{ width: `${(votedCount / totalNeeded) * 100}%` }}
            />
          </div>
        </div>
      )}

      {/* FASE 2 — DILEMA */}
      {phase === 'dilemma' && dilemma && (
        <div className="bg-[#291923] border-2 border-[#D8B66C] rounded-lg p-6 mb-6">
          <p className="text-sm text-[#F3EBDD]/70 mb-4">
            Qual destes jogadores recebeu mais votos para esta pergunta?
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <button
              onClick={() => handleDecision('A')}
              className="py-6 px-4 bg-[#291923] border-2 border-[#D8B66C] rounded-lg hover:bg-[#D8B66C]/20 transition"
            >
              <div className="text-2xl font-display font-bold text-[#E5C982]">
                A — {dilemma.optionA.name}
              </div>
            </button>
            <button
              onClick={() => handleDecision('B')}
              className="py-6 px-4 bg-[#291923] border-2 border-[#D8B66C] rounded-lg hover:bg-[#D8B66C]/20 transition"
            >
              <div className="text-2xl font-display font-bold text-[#E5C982]">
                B — {dilemma.optionB.name}
              </div>
            </button>
          </div>
          <p className="text-xs text-[#F3EBDD]/40 mt-4">
            Discutam em voz alta antes de decidir!
          </p>
        </div>
      )}

      {/* REVELAÇÃO */}
      {phase === 'reveal' && reveal && (
        <div className={`p-6 rounded-lg border-2 mb-6 ${
          reveal.correct
            ? 'bg-green-900/30 border-green-500'
            : 'bg-red-900/30 border-red-500'
        }`}>
          <p className="text-3xl font-display font-bold mb-3">
            {reveal.correct ? '✅ CORRETO!' : '❌ ERRADO!'}
          </p>
          <p className="text-lg text-[#F3EBDD] mb-2">
            {reveal.correctAnswerName} foi realmente o mais votado ({reveal.votesForWinner} votos).
          </p>
          {!reveal.correct && (
            <p className="text-sm text-[#F3EBDD]/70">
              Escolheram <strong>{reveal.chosenName}</strong>.
            </p>
          )}
          <p className="mt-4 text-[#E5C982] font-bold">
            +{reveal.correct ? '1' : '0'} ponto · Total: {reveal.correctCount}
          </p>
        </div>
      )}

      {/* Regras */}
      <div className="mt-6 bg-[#291923]/70 border border-[#D8B66C]/30 rounded-lg p-4 text-left">
        <h3 className="text-xs text-[#F3EBDD]/60 uppercase tracking-widest mb-2">📜 Regras</h3>
        <ul className="text-sm text-[#F3EBDD]/80 space-y-1">
          <li>• <strong>Fase 1:</strong> Todos votam secretamente em quem acham que corresponde à pergunta.</li>
          <li>• <strong>Fase 2:</strong> O sistema mostra 2 jogadores — o grupo decide qual foi o mais votado.</li>
          <li>• <strong>Empates</strong> são resolvidos pelo tempo de resposta.</li>
          <li>• <strong>5 acertos</strong> → 1 barra 🟨 | <strong>10 acertos</strong> → 3 barras 🪙🪙🪙</li>
        </ul>
      </div>
    </div>
  );
}