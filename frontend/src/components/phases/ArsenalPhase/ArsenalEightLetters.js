
import React, { useState, useEffect, useRef } from 'react';

export default function ArsenalEightLetters({ socket, roomData, playerId }) {
  const [gameStarted, setGameStarted] = useState(false);
  const [category, setCategory] = useState('');
  const [letters, setLetters] = useState([]);
  const [answers, setAnswers] = useState({});
  const [timer, setTimer] = useState(0);
  const [submitted, setSubmitted] = useState(false);
  const [myElapsed, setMyElapsed] = useState(null);
  const [error, setError] = useState('');
  const [finishedNotification, setFinishedNotification] = useState(null);
  const [validationData, setValidationData] = useState(null);
  const [validationResult, setValidationResult] = useState(null);
  const [winnerInfo, setWinnerInfo] = useState(null);
  const startTimeRef = useRef(null);

  // Socket listeners
  useEffect(() => {
    if (!socket) return;

    const onStart = (data) => {
      setGameStarted(true);
      setCategory(data.category);
      setLetters(data.letters);
      const initialAnswers = {};
      data.letters.forEach(l => { initialAnswers[l] = ''; });
      setAnswers(initialAnswers);
      setTimer(data.timeLimit);
      setSubmitted(false);
      setMyElapsed(null);
      setError('');
      setFinishedNotification(null);
      setValidationData(null);
      setValidationResult(null);
      setWinnerInfo(null);
      startTimeRef.current = performance.now();
    };

    const onPlayerFinished = (data) => {
      if (data.playerId !== playerId) {
        setFinishedNotification({
          message: `${data.playerName} terminou em ${data.elapsed.toFixed(2)}s (${data.order}º)`,
        });
        setTimeout(() => setFinishedNotification(null), 3000);
      }
    };

    const onValidation = (data) => {
      setValidationData(data);
      setValidationResult(null);
    };

    const onAccepted = (data) => {
      setValidationResult({
        type: 'accepted',
        ...data,
      });
    };

    const onRejected = (data) => {
      setValidationResult({
        type: 'rejected',
        ...data,
      });
      // Após 2s, limpar para próxima validação
      setTimeout(() => {
        setValidationData(null);
        setValidationResult(null);
      }, 2500);
    };

    const onEnd = (data) => {
      setWinnerInfo(data);
    };

    const onError = (data) => {
      setError(data.message || 'Erro');
      setTimeout(() => setError(''), 3000);
    };

    socket.on('eight_letters_start', onStart);
    socket.on('eight_letters_player_finished', onPlayerFinished);
    socket.on('eight_letters_validation', onValidation);
    socket.on('eight_letters_accepted', onAccepted);
    socket.on('eight_letters_rejected', onRejected);
    socket.on('eight_letters_end', onEnd);
    socket.on('eight_letters_error', onError);

    return () => {
      socket.off('eight_letters_start', onStart);
      socket.off('eight_letters_player_finished', onPlayerFinished);
      socket.off('eight_letters_validation', onValidation);
      socket.off('eight_letters_accepted', onAccepted);
      socket.off('eight_letters_rejected', onRejected);
      socket.off('eight_letters_end', onEnd);
      socket.off('eight_letters_error', onError);
    };
  }, [socket, playerId]);

  // Countdown
  useEffect(() => {
    if (!gameStarted || timer <= 0 || submitted || winnerInfo) return;
    const interval = setInterval(() => {
      setTimer(prev => (prev <= 1 ? 0 : prev - 1));
    }, 1000);
    return () => clearInterval(interval);
  }, [gameStarted, timer, submitted, winnerInfo]);

  const handleChange = (letter, value) => {
    // Remover acentos e caracteres estranhos
    const cleanValue = value.replace(/[^\p{L}\s\-']/gu, '');
    setAnswers(prev => ({ ...prev, [letter]: cleanValue }));
  };

  const handleSubmit = () => {
    if (submitted) return;
    
    const missing = letters.filter(l => !answers[l] || !answers[l].trim());
    if (missing.length > 0) {
      setError(`Faltam respostas para: ${missing.join(', ')}`);
      setTimeout(() => setError(''), 3000);
      return;
    }
    
    if (!window.confirm('Submeter as tuas respostas? Não poderás alterar depois.')) return;
    
    const elapsed = (performance.now() - startTimeRef.current) / 1000;
    setMyElapsed(elapsed);
    setSubmitted(true);
    
    socket.emit('eight_letters_submit', {
      roomCode: roomData.roomCode,
      answers,
    });
  };

  const handleVote = (vote) => {
    socket.emit('eight_letters_vote', {
      roomCode: roomData.roomCode,
      vote,
    });
  };

  const formatTime = (s) => `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, '0')}`;
  const filledCount = letters.filter(l => answers[l] && answers[l].trim()).length;

  // ============ ECRÃ FINAL ============
  if (winnerInfo) {
    const isWinner = winnerInfo.winnerId === playerId;
    return (
      <div className="fixed inset-0 bg-black/90 flex items-center justify-center z-50">
        <div className="max-w-md w-full bg-[#291923] border-2 border-[#D8B66C] rounded-lg p-8 text-center">
          <div className="text-7xl mb-4">{isWinner ? '🏆' : '📝'}</div>
          <h1 className="font-display text-3xl text-[#E5C982] mb-4">
            {isWinner ? 'Venceste!' : 'Fim do Jogo'}
          </h1>
          {winnerInfo.winnerName ? (
            <>
              <p className="text-2xl text-white mb-4">
                <strong>{winnerInfo.winnerName}</strong> venceu!
              </p>
              <p className="text-[#D8B66C]">+2 moedas de ouro</p>
            </>
          ) : (
            <p className="text-xl text-white">Ninguém apresentou 8 respostas válidas.</p>
          )}
        </div>
      </div>
    );
  }

  // ============ ECRÃ DE VALIDAÇÃO ============
  if (validationData) {
    return (
      <div className="text-center max-w-3xl mx-auto">
        <h1 className="text-4xl font-display font-bold text-[#E5C982] mb-2">📝 VALIDAÇÃO</h1>
        <p className="text-[#F3EBDD]/60 text-sm mb-6">
          Analisem as respostas de <strong className="text-[#E5C982]">{validationData.playerName}</strong> (tempo: {validationData.elapsed.toFixed(2)}s)
        </p>

        <div className="bg-[#291923] border-2 border-[#D8B66C] rounded-lg p-6 mb-6">
          <p className="text-sm text-[#F3EBDD]/60 mb-4">
            Categoria: <strong className="text-[#E5C982]">{category}</strong>
          </p>
          <div className="space-y-2">
            {validationData.answers.map(({ letter, answer }) => (
              <div
                key={letter}
                className="flex items-center gap-4 bg-[#1a0f15] border border-[#D8B66C]/30 rounded-lg p-3"
              >
                <span className="w-12 h-12 rounded-lg bg-[#D8B66C] text-[#291923] font-display font-bold text-2xl flex items-center justify-center">
                  {letter}
                </span>
                <span className="flex-1 text-left text-lg text-[#F3EBDD]">
                  {answer}
                </span>
              </div>
            ))}
          </div>
        </div>

        {validationResult ? (
          <div className={`p-6 rounded-lg border-2 ${
            validationResult.type === 'accepted'
              ? 'bg-green-900/30 border-green-500 text-green-300'
              : 'bg-red-900/30 border-red-500 text-red-300'
          }`}>
            {validationResult.type === 'accepted' ? (
              <>
                <p className="text-2xl font-bold">✅ ACEITE!</p>
                <p className="text-sm mt-2">
                  {validationResult.playerName} venceu com {validationResult.elapsed.toFixed(2)}s
                </p>
              </>
            ) : (
              <>
                <p className="text-2xl font-bold">❌ REJEITADO</p>
                <p className="text-sm mt-2">
                  A validar o próximo jogador...
                </p>
              </>
            )}
          </div>
        ) : (
          <>
            <p className="text-sm text-[#F3EBDD]/60 mb-4">
              As 8 respostas são válidas para a categoria e começam pela letra correta?
            </p>
            <div className="flex justify-center gap-4 flex-wrap">
              <button
                onClick={() => handleVote('accept')}
                className="px-10 py-5 bg-green-700 text-white font-display font-bold text-xl uppercase tracking-widest rounded-lg hover:bg-green-600 transition shadow-soft"
              >
                ✅ ACEITAR
              </button>
              <button
                onClick={() => handleVote('reject')}
                className="px-10 py-5 bg-red-800 text-white font-display font-bold text-xl uppercase tracking-widest rounded-lg hover:bg-red-700 transition shadow-soft"
              >
                ❌ REJEITAR
              </button>
            </div>
          </>
        )}
      </div>
    );
  }

  // ============ ECRÃ DE ESPERA ============
  if (!gameStarted) {
    return (
      <div className="text-center">
        <h1 className="text-5xl font-bold text-[#E5C982] mb-8">📝 8 LETRAS</h1>
        <p className="text-[#F3EBDD] animate-pulse">A preparar o desafio...</p>
      </div>
    );
  }

  // ============ ECRÃ DE JOGO ============
  return (
    <div className="text-center max-w-3xl mx-auto">
      <h1 className="text-3xl font-display font-bold text-[#E5C982] mb-2">📝 8 LETRAS</h1>
      <p className="text-[#F3EBDD]/60 text-sm mb-4">
        Preenche uma resposta por cada letra, dentro da categoria.
      </p>

      {/* Categoria */}
      <div className="bg-[#291923] border-2 border-[#D8B66C] rounded-lg p-4 mb-4">
        <p className="text-xs text-[#F3EBDD]/60 uppercase tracking-widest mb-1">🎯 Categoria</p>
        <p className="text-2xl font-display text-[#E5C982]">{category}</p>
      </div>

      {/* Timer + Progresso */}
      <div className="flex justify-center items-center gap-6 mb-4">
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
            <span className="font-display text-2xl font-bold text-[#E5C982]">{filledCount}/8</span>
          </div>
          <p className="text-xs text-[#F3EBDD]/60 uppercase tracking-widest mt-1">Preenchidas</p>
        </div>
      </div>

      {/* Notificação de outro jogador */}
      {finishedNotification && (
        <div className="mb-4 p-3 bg-[#D8B66C]/20 border border-[#D8B66C] rounded-lg text-[#E5C982]">
          ⚡ {finishedNotification.message}
        </div>
      )}

      {/* Formulário */}
      {!submitted ? (
        <div className="bg-[#291923] border-2 border-[#D8B66C] rounded-lg p-4 mb-4">
          <div className="space-y-2">
            {letters.map(letter => (
              <div key={letter} className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-lg bg-[#D8B66C] text-[#291923] font-display font-bold text-2xl flex items-center justify-center flex-shrink-0">
                  {letter}
                </div>
                <input
                  type="text"
                  value={answers[letter] || ''}
                  onChange={(e) => handleChange(letter, e.target.value)}
                  placeholder={`Palavra começada por ${letter}...`}
                  className="flex-1 px-4 py-3 bg-[#1a0f15] border border-[#D8B66C]/40 text-white rounded-lg focus:outline-none focus:border-[#E5C982]"
                  maxLength={30}
                />
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="bg-[#291923] border-2 border-[#D8B66C] rounded-lg p-6 mb-4">
          <p className="text-2xl text-[#E5C982] mb-2">✅ Respostas submetidas!</p>
          <p className="text-lg text-[#F3EBDD]">
            Tempo: <strong>{myElapsed?.toFixed(2)}s</strong>
          </p>
          <p className="text-sm text-[#F3EBDD]/60 mt-3 animate-pulse">
            A aguardar validação dos outros jogadores...
          </p>
        </div>
      )}

      {error && (
        <div className="mb-4 p-3 bg-red-900/30 border-2 border-red-500 rounded-lg text-red-300">
          {error}
        </div>
      )}

      {!submitted && (
        <button
          onClick={handleSubmit}
          disabled={filledCount < 8}
          className="px-12 py-4 bg-[#D8B66C] text-[#291923] font-display font-bold text-xl uppercase tracking-widest rounded-lg hover:bg-[#E5C982] transition shadow-soft disabled:opacity-40 disabled:cursor-not-allowed"
        >
          🏁 TERMINAR
        </button>
      )}

      {/* Regras */}
      <div className="mt-6 bg-[#291923]/70 border border-[#D8B66C]/30 rounded-lg p-4 text-left">
        <h3 className="text-xs text-[#F3EBDD]/60 uppercase tracking-widest mb-2">📜 Regras</h3>
        <ul className="text-sm text-[#F3EBDD]/80 space-y-1">
          <li>• 8 letras, 8 respostas — todas dentro da categoria</li>
          <li>• Cada resposta deve começar pela letra correspondente</li>
          <li>• Termina rápido para ganhar vantagem de tempo</li>
          <li>• Os outros validam: ✅ aceitar ou ❌ rejeitar</li>
          <li>• Se rejeitado, passa ao próximo mais rápido</li>
          <li>• Ganha quem terminar mais rápido com respostas aceites</li>
        </ul>
      </div>
    </div>
  );
}