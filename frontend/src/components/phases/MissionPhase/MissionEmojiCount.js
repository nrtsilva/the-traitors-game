import React, { useState, useEffect } from 'react';

export default function MissionEmojiCount({ playerState, socket, roomData }) {
  const [gameStarted, setGameStarted] = useState(false);
  const [substitutions, setSubstitutions] = useState([]);
  const [currentLevel, setCurrentLevel] = useState(0);
  const [maxLevel, setMaxLevel] = useState(10);
  const [timer, setTimer] = useState(0);
  const [errorCount, setErrorCount] = useState(0);
  const [lastNewSub, setLastNewSub] = useState(null);
  const [errorFlash, setErrorFlash] = useState(null);
  const [finished, setFinished] = useState(null);

  // Socket listeners
  useEffect(() => {
    if (!socket) return;

    const onStart = (data) => {
      setGameStarted(true);
      setTimer(data.timeLimit);
      setSubstitutions(data.substitutions || []);
      setCurrentLevel(data.currentLevel || 0);
      setMaxLevel(data.maxLevel || 10);
      setErrorCount(0);
      setFinished(null);
    };

    const onNewSub = (data) => {
      setSubstitutions(data.substitutions);
      setCurrentLevel(data.currentLevel);
      setLastNewSub(data.substitution);
      // Tocar som de confirmação (opcional)
      setTimeout(() => setLastNewSub(null), 4000);
    };

    const onError = (data) => {
      setErrorCount(data.errorCount);
      setErrorFlash(data.message);
      setTimeout(() => setErrorFlash(null), 3000);
    };

    socket.on('emoji_count_start', onStart);
    socket.on('emoji_count_new_substitution', onNewSub);
    socket.on('emoji_count_error', onError);

    return () => {
      socket.off('emoji_count_start', onStart);
      socket.off('emoji_count_new_substitution', onNewSub);
      socket.off('emoji_count_error', onError);
    };
  }, [socket]);

  // Countdown
  useEffect(() => {
    if (!gameStarted || timer <= 0 || finished) return;
    const interval = setInterval(() => {
      setTimer(prev => (prev <= 1 ? 0 : prev - 1));
    }, 1000);
    return () => clearInterval(interval);
  }, [gameStarted, timer, finished]);

  // Aguardar fim da missão (mission_outcome vai chegar via App.js)
  // O componente principal trata disso

  const handleNext = () => {
    socket.emit('emoji_count_next', { roomCode: roomData.roomCode });
  };

  const handleError = () => {
    socket.emit('emoji_count_error', { roomCode: roomData.roomCode });
  };

  const handleComplete = () => {
    if (window.confirm('Têm a certeza? Fizeram todas as 10 substituições e completaram a contagem final?')) {
      socket.emit('emoji_count_complete', { roomCode: roomData.roomCode });
    }
  };

  const formatTime = (s) => `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, '0')}`;

  // Criar array de 1..10 com substituições aplicadas
  const renderSequence = () => {
    const seq = [];
    for (let n = 1; n <= 10; n++) {
      const sub = substitutions.find(s => s.number === n);
      seq.push({ number: n, sub });
    }
    return seq;
  };

  if (!gameStarted) {
    return (
      <div className="text-center">
        <h1 className="text-5xl font-bold text-[#E5C982] mb-8">CONTAGEM DOS EMOJIS</h1>
        <p className="text-[#F3EBDD] animate-pulse">A preparar o desafio...</p>
      </div>
    );
  }

  return (
    <div className="text-center max-w-3xl mx-auto">
      <p className="text-[#F3EBDD]/60 text-sm mb-4">
        Contem em voz alta de 1 a 10. Substituam os números pelos emojis!
      </p>

      {/* Header: Timer + Nível + Erros */}
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
            <span className="font-display text-2xl font-bold text-[#E5C982]">{currentLevel}/{maxLevel}</span>
          </div>
          <p className="text-xs text-[#F3EBDD]/60 uppercase tracking-widest mt-1">Substituições</p>
        </div>
        <div className="text-center">
          <div className="w-20 h-20 rounded-full border-4 border-[#D8B66C] flex items-center justify-center bg-[#291923]">
            <span className="font-display text-2xl font-bold text-red-400">{errorCount}</span>
          </div>
          <p className="text-xs text-[#F3EBDD]/60 uppercase tracking-widest mt-1">Erros</p>
        </div>
      </div>

      {/* Nova substituição (destaque) */}
      {lastNewSub && (
        <div className="mb-6 p-6 bg-[#D8B66C]/20 border-2 border-[#D8B66C] rounded-lg animate-pulse">
          <p className="text-xs text-[#F3EBDD]/60 uppercase tracking-widest mb-2">🎉 Nova Substituição!</p>
          <p className="text-3xl font-display text-[#E5C982]">
            Número <span className="text-4xl font-bold">{lastNewSub.number}</span> passa a ser <span className="text-5xl">{lastNewSub.emoji}</span>
          </p>
          <p className="text-lg text-[#F3EBDD] mt-2">
            <strong>{lastNewSub.label}</strong> — {lastNewSub.action}
          </p>
        </div>
      )}

      {/* Erro flash */}
      {errorFlash && (
        <div className="mb-6 p-4 bg-red-900/40 border-2 border-red-500 rounded-lg">
          <p className="text-red-300 font-bold">❌ {errorFlash}</p>
        </div>
      )}

      {/* Sequência atual */}
      <div className="bg-[#291923] border-2 border-[#D8B66C] rounded-lg p-6 mb-6">
        <h3 className="text-sm text-[#F3EBDD]/60 uppercase tracking-widest mb-4">Sequência Atual</h3>
        <div className="flex flex-wrap justify-center gap-2">
          {renderSequence().map(({ number, sub }) => (
            <div
              key={number}
              className={`min-w-[60px] p-3 rounded-lg border-2 ${
                sub
                  ? 'bg-[#D8B66C]/20 border-[#D8B66C]'
                  : 'bg-[#1a0f15] border-[#D8B66C]/30'
              }`}
            >
              {sub ? (
                <>
                  <span className="block text-3xl">{sub.emoji}</span>
                  <span className="block text-xs text-[#E5C982] font-bold mt-1">{sub.label}</span>
                  <span className="block text-[10px] text-[#F3EBDD]/50">({number})</span>
                </>
              ) : (
                <span className="block text-3xl font-display font-bold text-[#F3EBDD]">{number}</span>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Regras resumidas */}
      <div className="bg-[#291923]/70 border border-[#D8B66C]/30 rounded-lg p-4 mb-6 text-left">
        <h3 className="text-xs text-[#F3EBDD]/60 uppercase tracking-widest mb-2">📜 Regras</h3>
        <ul className="text-sm text-[#F3EBDD]/80 space-y-1">
          <li>• Contem em voz alta, um a um, pela vossa ordem</li>
          <li>• Substituam os números pelos emojis (palavra, som ou ação)</li>
          <li>• Após cada contagem bem-sucedida → <strong>PRÓXIMO</strong></li>
          <li>• Se alguém errar → <strong>ERRO</strong> e recomecem do 1</li>
          <li>• As substituições NUNCA se perdem!</li>
        </ul>
      </div>

      {/* Botões */}
      {!finished && timer > 0 && (
        <div className="flex justify-center gap-4 flex-wrap">
          {currentLevel < maxLevel ? (
            <button
              onClick={handleNext}
              className="px-10 py-5 bg-[#D8B66C] text-[#291923] font-display font-bold text-xl uppercase tracking-widest rounded-lg hover:bg-[#E5C982] transition shadow-soft"
            >
              ✅ PRÓXIMO
            </button>
          ) : (
            <button
              onClick={handleComplete}
              className="px-10 py-5 bg-green-700 text-white font-display font-bold text-xl uppercase tracking-widest rounded-lg hover:bg-green-600 transition shadow-soft animate-pulse"
            >
              🏆 CONCLUIR MISSÃO
            </button>
          )}
          <button
            onClick={handleError}
            className="px-10 py-5 bg-red-900/60 border-2 border-red-500 text-red-300 font-display font-bold text-xl uppercase tracking-widest rounded-lg hover:bg-red-900 transition"
          >
            ❌ ERRO
          </button>
        </div>
      )}

      {timer <= 0 && !finished && (
        <div className="mt-6 p-4 bg-red-900/40 border-2 border-red-500 rounded-lg">
          <p className="text-red-300 font-bold text-xl">⏰ Tempo esgotado!</p>
        </div>
      )}
    </div>
  );
}