import React, { useState, useEffect, useCallback } from 'react';

export default function MissionTicoTecoTaco({ playerState, socket, roomData, playerId }) {
  const [gameStarted, setGameStarted] = useState(false);
  const [timer, setTimer] = useState(0);
  const [responseTimeLimit, setResponseTimeLimit] = useState(2.5);
  const [currentWord, setCurrentWord] = useState(null);
  const [activePlayerId, setActivePlayerId] = useState(null);
  const [activePlayerName, setActivePlayerName] = useState('');
  const [correctCount, setCorrectCount] = useState(0);
  const [targetCorrect, setTargetCorrect] = useState(25);
  const [responseTimer, setResponseTimer] = useState(0);
  const [feedback, setFeedback] = useState(null);
  const [buttonLocked, setButtonLocked] = useState(false);

  const isActivePlayer = activePlayerId === playerId;

  // Socket listeners
  useEffect(() => {
  if (!socket) return;

    const onStart = (data) => {
      setGameStarted(true);
      setTimer(data.timeLimit);
      setResponseTimeLimit(data.responseTimeLimit || 2.5);
      setCorrectCount(0);
      setTargetCorrect(data.targetCorrect || 25);
      setCurrentWord(null);
      setFeedback(null);
    };

    const onWord = (data) => {
      setCurrentWord(data.word);
      setActivePlayerId(data.activePlayerId);
      setActivePlayerName(data.activePlayerName);
      setCorrectCount(data.correctCount);
      setTargetCorrect(data.targetCorrect);
      setResponseTimer(data.responseTimeLimit);
      setFeedback(null);
      setButtonLocked(false);
    };

    const onCorrect = (data) => {
      setCorrectCount(data.correctCount);
      setFeedback({ type: 'correct', count: data.correctCount });
      setButtonLocked(true);
      setTimeout(() => setFeedback(null), 400);
    };

    const onError = (data) => {
      setCorrectCount(0);
      setFeedback({ type: 'error', reason: data.reason });
      setButtonLocked(true);
      setTimeout(() => setFeedback(null), 1500);
    };

    socket.on('ttt_start', onStart);
    socket.on('ttt_word', onWord);
    socket.on('ttt_correct', onCorrect);
    socket.on('ttt_error', onError);

    socket.emit('mission_client_ready', { roomCode: roomData.roomCode });

    return () => {
      socket.off('ttt_start', onStart);
      socket.off('ttt_word', onWord);
      socket.off('ttt_correct', onCorrect);
      socket.off('ttt_error', onError);
    };
  }, [socket, roomData?.roomCode]);

  // Countdown global
  useEffect(() => {
    if (!gameStarted || timer <= 0) return;
    const interval = setInterval(() => {
      setTimer(prev => (prev <= 1 ? 0 : prev - 1));
    }, 1000);
    return () => clearInterval(interval);
  }, [gameStarted, timer]);

  // Countdown da resposta (2.5s) — visual apenas
  useEffect(() => {
    if (!currentWord || buttonLocked || feedback) return;
    if (responseTimer <= 0) return;
    const interval = setInterval(() => {
      setResponseTimer(prev => (prev <= 0.1 ? 0 : Math.max(0, prev - 0.1)));
    }, 100);
    return () => clearInterval(interval);
  }, [currentWord, buttonLocked, feedback, responseTimer]);

  const handleCorrect = useCallback(() => {
    if (buttonLocked || !isActivePlayer) return;
    setButtonLocked(true);
    socket.emit('ttt_correct', { roomCode: roomData.roomCode });
  }, [buttonLocked, isActivePlayer, socket, roomData]);

  const handleError = useCallback(() => {
    if (buttonLocked || !isActivePlayer) return;
    setButtonLocked(true);
    socket.emit('ttt_error', { roomCode: roomData.roomCode });
  }, [buttonLocked, isActivePlayer, socket, roomData]);

  const formatTime = (s) => `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, '0')}`;
  const formatResponseTimer = (t) => t.toFixed(1);

  // Calcular progresso
  const progressPercent = (correctCount / targetCorrect) * 100;

  if (!gameStarted) {
    return (
      <div className="text-center">
        <p className="text-[#F3EBDD] animate-pulse">A preparar a primeira palavra...</p>
      </div>
    );
  }

  return (
    <div className="text-center max-w-3xl mx-auto">
      <h1 className="text-4xl font-display font-bold text-[#E5C982] mb-2">🎵 TICO, TECO, TACO</h1>
      <p className="text-[#F3EBDD]/60 text-sm mb-4">
        Responde em voz alta e valida rapidamente!
      </p>

      {/* Header: Timer Global + Progresso */}
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
            <span className="font-display text-2xl font-bold text-[#E5C982]">{correctCount}/{targetCorrect}</span>
          </div>
          <p className="text-xs text-[#F3EBDD]/60 uppercase tracking-widest mt-1">Acertos</p>
        </div>
      </div>

      {/* Barra de progresso */}
      <div className="mb-6 max-w-md mx-auto">
        <div className="h-3 bg-[#291923] rounded-full overflow-hidden border border-[#D8B66C]/30">
          <div
            className="h-full bg-gradient-to-r from-[#D8B66C] to-[#E5C982] transition-all duration-300"
            style={{ width: `${Math.min(100, progressPercent)}%` }}
          />
        </div>
      </div>

      {/* Regra resumida */}
      <div className="bg-[#291923] border border-[#D8B66C]/30 rounded-lg p-3 mb-6 inline-block">
        <p className="text-xs text-[#F3EBDD]/60 uppercase tracking-widest mb-1">Regra</p>
        <p className="text-sm text-[#F3EBDD]">
          <strong className="text-[#E5C982]">TICO</strong> → TECO · <strong className="text-[#E5C982]">TECO</strong> → TACO · <strong className="text-[#E5C982]">TACO</strong> → TICO TECO TACO
        </p>
      </div>

      {/* Jogador ativo */}
      <div className="mb-4">
        <p className="text-xs text-[#F3EBDD]/60 uppercase tracking-widest mb-1">🎭 Jogador da vez</p>
        <p className={`text-3xl font-display font-bold ${
          isActivePlayer ? 'text-[#E5C982] animate-pulse' : 'text-[#F3EBDD]'
        }`}>
          {activePlayerName} {isActivePlayer && '(TU)'}
        </p>
      </div>

      {/* PALAVRA ATUAL */}
      {currentWord && (
        <div className={`mb-6 p-8 rounded-lg border-4 transition-all duration-200 ${
          feedback?.type === 'correct' ? 'border-green-500 bg-green-900/20'
          : feedback?.type === 'error' ? 'border-red-500 bg-red-900/20 animate-pulse'
          : 'border-[#D8B66C] bg-[#291923]'
        }`}>
          <p className="text-xs text-[#F3EBDD]/60 uppercase tracking-widest mb-2">Diz em voz alta:</p>
          <p className="text-7xl font-display font-bold text-[#E5C982] tracking-widest">
            {currentWord}
          </p>
          
          {/* Barra de resposta 2.5s */}
          <div className="mt-6 max-w-xs mx-auto">
            <div className="h-2 bg-[#1a0f15] rounded-full overflow-hidden">
              <div
                className={`h-full transition-all duration-100 ${
                  responseTimer <= 0.8 ? 'bg-red-500' : 'bg-[#D8B66C]'
                }`}
                style={{ width: `${(responseTimer / responseTimeLimit) * 100}%` }}
              />
            </div>
            <p className={`text-sm mt-1 ${
              responseTimer <= 0.8 ? 'text-red-400 font-bold animate-pulse' : 'text-[#F3EBDD]/60'
            }`}>
              {formatResponseTimer(responseTimer)}s
            </p>
          </div>
        </div>
      )}

      {/* Feedback flash */}
      {feedback?.type === 'correct' && (
        <div className="mb-4 p-3 bg-green-900/40 border-2 border-green-500 rounded-lg">
          <p className="text-green-300 font-bold text-xl">✅ {feedback.count}/{targetCorrect}</p>
        </div>
      )}
      {feedback?.type === 'error' && (
        <div className="mb-4 p-3 bg-red-900/40 border-2 border-red-500 rounded-lg">
          <p className="text-red-300 font-bold text-xl">
            {feedback.reason === 'timeout' ? '⏰ Tempo esgotado! Volta ao 0.' : '❌ Erro! Volta ao 0.'}
          </p>
        </div>
      )}

      {/* Botões — só o jogador ativo vê */}
      {isActivePlayer && currentWord && (
        <div className="flex justify-center gap-4 flex-wrap mb-6">
          <button
            onClick={handleCorrect}
            disabled={buttonLocked}
            className="px-12 py-6 bg-green-700 text-white font-display font-bold text-2xl uppercase tracking-widest rounded-lg hover:bg-green-600 transition shadow-soft disabled:opacity-50"
          >
            ✅ SEGUINTE
          </button>
          <button
            onClick={handleError}
            disabled={buttonLocked}
            className="px-12 py-6 bg-red-800 text-white font-display font-bold text-2xl uppercase tracking-widest rounded-lg hover:bg-red-700 transition shadow-soft disabled:opacity-50"
          >
            ❌ ERREI
          </button>
        </div>
      )}

      {!isActivePlayer && currentWord && (
        <p className="text-[#F3EBDD]/60 text-sm italic mb-6">
          Observa e ouve com atenção — o jogador ativo responde em voz alta.
        </p>
      )}

      {/* Regras resumidas */}
      <div className="bg-[#291923]/70 border border-[#D8B66C]/30 rounded-lg p-4 text-left">
        <h3 className="text-xs text-[#F3EBDD]/60 uppercase tracking-widest mb-2">📜 Regras</h3>
        <ul className="text-sm text-[#F3EBDD]/80 space-y-1">
          <li>• <strong>TICO</strong> → responde <strong>TECO</strong></li>
          <li>• <strong>TECO</strong> → responde <strong>TACO</strong></li>
          <li>• <strong>TACO</strong> → responde <strong>TICO TECO TACO</strong></li>
          <li>• Tens <strong>2,5 segundos</strong> para clicar em SEGUINTE ou ERREI</li>
          <li>• Se não clicares a tempo, conta como falha</li>
          <li>• A cada erro, o contador volta a <strong>0</strong></li>
        </ul>
      </div>

      {timer <= 0 && (
        <div className="mt-6 p-4 bg-red-900/40 border-2 border-red-500 rounded-lg">
          <p className="text-red-300 font-bold text-xl">⏰ Tempo esgotado!</p>
        </div>
      )}
    </div>
  );
}