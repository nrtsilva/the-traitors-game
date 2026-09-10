import React, { useState, useEffect, useRef } from 'react';

export default function ArsenalEmojiGuess({ socket, roomData, playerId }) {
  const [gameStarted, setGameStarted] = useState(false);
  const [currentRound, setCurrentRound] = useState(1);
  const [totalRounds, setTotalRounds] = useState(10);
  const [emojis, setEmojis] = useState({ emoji1: null, emoji2: null });
  const [roundOpen, setRoundOpen] = useState(false);
  const [roundEnd, setRoundEnd] = useState(null);
  const [finalScores, setFinalScores] = useState(null);
  const [guess, setGuess] = useState('');
  const [error, setError] = useState('');
  const [timer, setTimer] = useState(0);
  const [scores, setScores] = useState([]);
  const [showReveal, setShowReveal] = useState(false);
  const inputRef = useRef(null);

  // Socket listeners
  useEffect(() => {
    if (!socket) return;

    const onRound = (data) => {
      setGameStarted(true);
      setCurrentRound(data.roundNumber);
      setTotalRounds(data.totalRounds);
      setEmojis({ emoji1: data.emoji1, emoji2: data.emoji2 });
      setTimer(data.timeLimit);
      setGuess('');
      setError('');
      setRoundEnd(null);
      setRoundOpen(false);
      setShowReveal(false);
      
      // Pequena animação de entrada
      setTimeout(() => setShowReveal(true), 500);
      setTimeout(() => {
        setRoundOpen(true);
        setTimeout(() => inputRef.current?.focus(), 100);
      }, 1000);
    };

    const onRoundEnd = (data) => {
      setRoundEnd(data);
      setRoundOpen(false);
      setScores(data.scores || []);
      setTimer(0);
    };

    const onInvalid = (data) => {
      setError(data.reason || 'Palavra inválida.');
      setTimeout(() => setError(''), 3000);
    };

    const onEnd = (data) => {
      setFinalScores(data);
      setScores(data.finalScores || []);
    };

    socket.on('emoji_guess_round', onRound);
    socket.on('emoji_guess_round_end', onRoundEnd);
    socket.on('emoji_guess_invalid', onInvalid);
    socket.on('emoji_guess_end', onEnd);

    return () => {
      socket.off('emoji_guess_round', onRound);
      socket.off('emoji_guess_round_end', onRoundEnd);
      socket.off('emoji_guess_invalid', onInvalid);
      socket.off('emoji_guess_end', onEnd);
    };
  }, [socket]);

  // Countdown
  useEffect(() => {
    if (!roundOpen || timer <= 0 || roundEnd || finalScores) return;
    const interval = setInterval(() => {
      setTimer(prev => (prev <= 1 ? 0 : prev - 1));
    }, 1000);
    return () => clearInterval(interval);
  }, [roundOpen, timer, roundEnd, finalScores]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!guess.trim() || !roundOpen) return;
    socket.emit('emoji_guess_submit', {
      roomCode: roomData.roomCode,
      word: guess.trim().toUpperCase(),
    });
    setGuess('');
  };

  // ============ ECRÃ FINAL ============
  if (finalScores) {
    const isWinner = finalScores.winnerId === playerId;
    return (
      <div className="fixed inset-0 bg-black/90 flex items-center justify-center z-50 overflow-auto">
        <div className="max-w-lg w-full bg-[#291923] border-2 border-[#D8B66C] rounded-lg p-8 text-center my-8">
          <div className="text-7xl mb-4">{isWinner ? '🏆' : '🎭'}</div>
          <h1 className="font-display text-3xl text-[#E5C982] mb-6">
            {isWinner ? 'Venceste!' : 'Fim do Jogo'}
          </h1>
          <div className="bg-[#291923] border border-[#D8B66C]/40 rounded-lg p-4 mb-4 text-left">
            <h3 className="font-display text-lg text-[#D8B66C] mb-3 text-center">Classificação Final</h3>
            {finalScores.finalScores.map((s, i) => (
              <div
                key={s.playerId}
                className={`flex justify-between py-2 border-b border-[#D8B66C]/10 ${
                  i === 0 ? 'text-[#E5C982] font-bold' : 'text-[#F3EBDD]'
                }`}
              >
                <span>{i + 1}.º {s.playerName} {i === 0 && '🏆'}</span>
                <span>{s.wins} vitória{s.wins !== 1 ? 's' : ''} · {s.totalTime.toFixed(2)}s</span>
              </div>
            ))}
          </div>
          {isWinner && <p className="text-lg text-[#D8B66C]">Ganhaste 2 moedas de ouro!</p>}
        </div>
      </div>
    );
  }

  // ============ ECRÃ DE ESPERA ============
  if (!gameStarted) {
    return (
      <div className="text-center">
        <h1 className="text-5xl font-bold text-[#E5C982] mb-8">ADIVINHA PELOS EMOJIS</h1>
        <p className="text-[#F3EBDD] animate-pulse">A preparar as combinações...</p>
      </div>
    );
  }

  // ============ ECRÃ DE JOGO ============
  return (
    <div className="text-center">
      <h1 className="text-3xl font-display font-bold text-[#E5C982] mb-2">ADIVINHA PELOS EMOJIS</h1>
      <p className="text-[#F3EBDD]/60 text-sm mb-4">
        Ronda {currentRound} de {totalRounds}
      </p>

      {/* Timer */}
      <div className="mb-4">
        <div className={`inline-block w-20 h-20 rounded-full border-4 flex items-center justify-center bg-[#291923] ${
          timer <= 5 && roundOpen ? 'border-red-500 animate-pulse' : 'border-[#D8B66C]'
        }`}>
          <span className="font-display text-3xl font-bold text-[#D8B66C]">{timer}</span>
        </div>
      </div>

      {/* Emojis */}
      <div className={`flex justify-center items-center gap-6 mb-6 transition-all duration-500 ${showReveal ? 'opacity-100 scale-100' : 'opacity-0 scale-75'}`}>
        <div className="w-40 h-40 bg-[#1a0f15] border-4 border-[#D8B66C] rounded-lg flex items-center justify-center shadow-2xl">
          <span className="text-7xl">{emojis.emoji1}</span>
        </div>
        <div className="flex flex-col items-center">
          <span className="text-3xl text-[#D8B66C] font-display font-bold">+</span>
        </div>
        <div className="w-40 h-40 bg-[#1a0f15] border-4 border-[#D8B66C] rounded-lg flex items-center justify-center shadow-2xl">
          <span className="text-7xl">{emojis.emoji2}</span>
        </div>
      </div>

      {/* = ?
           Qual é a palavra? */}
      {roundOpen && !roundEnd && (
        <p className="text-[#F3EBDD]/70 text-sm mb-3">
          Junta as duas palavras representadas e descobre a resposta!
        </p>
      )}

      {/* Resultado da ronda */}
      {roundEnd && (
        <div className={`mb-4 p-4 rounded-lg border-2 ${
          roundEnd.winnerId
            ? 'bg-green-900/20 border-green-500 text-green-300'
            : 'bg-red-900/20 border-red-500 text-red-300'
        }`}>
          {roundEnd.winnerId ? (
            <>
              <p className="text-xl font-bold">🏆 {roundEnd.winnerName} acertou!</p>
              <p className="text-2xl mt-2 font-display text-[#E5C982]">
                A resposta era: <strong>{roundEnd.answer}</strong>
              </p>
              <p className="text-sm mt-1">em {roundEnd.time.toFixed(3)}s</p>
            </>
          ) : (
            <>
              <p className="text-xl font-bold">⏰ Ninguém acertou!</p>
              <p className="text-2xl mt-2 font-display text-[#E5C982]">
                A resposta era: <strong>{roundEnd.answer}</strong>
              </p>
            </>
          )}
        </div>
      )}

      {/* Formulário */}
      {roundOpen && !roundEnd && (
        <form onSubmit={handleSubmit} className="mb-4">
          <div className="flex justify-center gap-2 max-w-md mx-auto">
            <input
              ref={inputRef}
              type="text"
              value={guess}
              onChange={(e) => setGuess(e.target.value.toUpperCase().replace(/[^A-ZÁÂÃÀÉÊÍÓÔÕÚÇ-]/g, ''))}
              placeholder="QUAL É A PALAVRA?"
              className={`flex-1 px-4 py-3 bg-[#291923] border-2 text-white text-center text-xl uppercase tracking-widest rounded-sm focus:outline-none ${
                error ? 'border-red-500 animate-pulse' : 'border-[#D8B66C] focus:border-[#E5C982]'
              }`}
              maxLength={25}
              autoComplete="off"
            />
            <button
              type="submit"
              className="px-6 py-3 bg-[#D8B66C] text-[#291923] font-bold text-xl rounded-sm hover:bg-[#E5C982] transition"
            >
              ✓
            </button>
          </div>
          {error && <p className="text-red-400 text-sm mt-2">{error}</p>}
        </form>
      )}

      {/* Scores parciais */}
      <div className="max-w-md mx-auto">
        <h3 className="text-xs text-[#F3EBDD]/60 uppercase tracking-widest mb-2">Classificação Parcial</h3>
        <div className="bg-[#291923]/80 border border-[#D8B66C]/30 rounded-lg p-3">
          {scores.length > 0 ? (
            scores.map((s, i) => (
              <div key={s.playerId} className={`flex justify-between py-1 ${i === 0 ? 'text-[#E5C982] font-bold' : 'text-[#F3EBDD]'}`}>
                <span>{i + 1}.º {s.playerName}</span>
                <span>{s.wins} 🏆 · {s.totalTime.toFixed(2)}s</span>
              </div>
            ))
          ) : (
            <p className="text-[#F3EBDD]/40 text-sm">Ainda sem pontuações.</p>
          )}
        </div>
      </div>
    </div>
  );
}