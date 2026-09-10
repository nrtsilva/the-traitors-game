import React, { useState, useEffect, useRef } from 'react';

export default function ArsenalWordGuesser({ socket, roomData, playerId, playerState }) {
  const [round, setRound] = useState(null);
  const [guess, setGuess] = useState('');
  const [wrongGuess, setWrongGuess] = useState(false);
  const [roundEnd, setRoundEnd] = useState(null);
  const [finalResult, setFinalResult] = useState(null);
  const [timer, setTimer] = useState(0);
  const inputRef = useRef(null);

  // Escutar eventos do jogo
  useEffect(() => {
    if (!socket) return;

    const onRound = (data) => {
      setRound(data);
      setRoundEnd(null);
      setGuess('');
      setWrongGuess(false);
      setTimer(data.timeLimit);
      setTimeout(() => inputRef.current?.focus(), 100);
    };

    const onRoundEnd = (data) => {
      setRoundEnd(data);
      setTimer(0);
    };

    const onWrong = () => {
      setWrongGuess(true);
      setTimeout(() => setWrongGuess(false), 1500);
    };

    const onResult = (data) => {
      setFinalResult(data);
    };

    socket.on('word_guesser_round', onRound);
    socket.on('word_guesser_round_end', onRoundEnd);
    socket.on('word_guesser_wrong', onWrong);
    socket.on('arsenal_result', onResult);

    return () => {
      socket.off('word_guesser_round', onRound);
      socket.off('word_guesser_round_end', onRoundEnd);
      socket.off('word_guesser_wrong', onWrong);
      socket.off('arsenal_result', onResult);
    };
  }, [socket]);

  // Contagem decrescente local
  useEffect(() => {
    if (!round || roundEnd || timer <= 0) return;
    const interval = setInterval(() => {
      setTimer((prev) => (prev <= 1 ? 0 : prev - 1));
    }, 1000);
    return () => clearInterval(interval);
  }, [round, roundEnd, timer]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!guess.trim() || roundEnd) return;
    socket.emit('submit_word_guess', {
      roomCode: roomData.roomCode,
      guess: guess.trim().toUpperCase(),
    });
    setGuess('');
  };

  // Ecrã final
  if (finalResult) {
    return (
      <div className="fixed inset-0 bg-black/90 flex items-center justify-center z-50">
        <div className="text-center max-w-md">
          <div className="text-7xl mb-6">🏆</div>
          <h1 className="font-display text-4xl text-[#E5C982] mb-4">Fim do Jogo!</h1>
          <p className="text-2xl text-white mb-8">
            {finalResult.winnerId === playerId
              ? 'Ganhaste 2 moedas de ouro!'
              : `Vencedor: ${finalResult.winnerName}`}
          </p>
          {finalResult.finalScores && (
            <div className="bg-[#291923] border border-[#D8B66C] rounded-lg p-4">
              <h3 className="font-display text-lg text-[#D8B66C] mb-3">Classificação</h3>
              {finalResult.finalScores.map((s, i) => (
                <p key={s.playerId} className="text-white">
                  {i + 1}. {s.playerName} — {s.score} acertos
                </p>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  }

  // Aguarda primeira ronda
  if (!round) {
    return (
      <div className="text-center">
        <h1 className="text-5xl font-bold text-[#E5C982] mb-8">O QUE VEM A SEGUIR?</h1>
        <p className="text-[#F3EBDD] animate-pulse">A preparar a primeira ronda...</p>
      </div>
    );
  }

  return (
    <div className="text-center">
      <h1 className="text-4xl font-display font-bold text-[#E5C982] mb-2">O QUE VEM A SEGUIR?</h1>
      <p className="text-[#F3EBDD]/60 text-sm mb-6">
        Ronda {round.roundNumber} de {round.totalRounds}
      </p>

      {/* Timer */}
      <div className="mb-6">
        <div className="inline-block w-20 h-20 rounded-full border-4 border-[#D8B66C] flex items-center justify-center bg-[#291923]">
          <span className="font-display text-3xl font-bold text-[#D8B66C]">{timer}</span>
        </div>
      </div>

      {/* Pistas */}
      <div className="bg-[#291923] border-2 border-[#D8B66C] rounded-lg p-8 mb-6">
        <p className="text-[#F3EBDD]/70 text-sm uppercase tracking-widest mb-4">Que palavra combina com:</p>
        <div className="flex justify-center gap-4 flex-wrap">
          {round.clues.map((clue, i) => (
            <div key={i} className="bg-[#412734] border border-[#D8B66C] px-6 py-3 rounded-lg">
              <span className="text-xl text-[#E5C982] font-display">{clue}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Resultado da ronda */}
      {roundEnd ? (
        <div className="mb-6 p-6 bg-[#291923] border-2 border-[#D8B66C] rounded-lg">
          {roundEnd.winnerId ? (
            <>
              <p className="text-2xl text-[#E5C982] mb-2">✅ {roundEnd.winnerName} acertou!</p>
              <p className="text-[#F3EBDD]">A resposta era: <strong className="text-[#D8B66C]">{roundEnd.answer}</strong></p>
            </>
          ) : (
            <>
              <p className="text-2xl text-[#F3EBDD] mb-2">Ninguém acertou!</p>
              <p className="text-[#F3EBDD]">A resposta era: <strong className="text-[#D8B66C]">{roundEnd.answer}</strong></p>
            </>
          )}
          <p className="text-sm text-[#F3EBDD]/50 mt-4 animate-pulse">Próxima ronda em 3s...</p>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="mb-6">
          <div className="flex justify-center gap-2 max-w-md mx-auto">
            <input
              ref={inputRef}
              type="text"
              value={guess}
              onChange={(e) => setGuess(e.target.value.toUpperCase())}
              placeholder="A TUA RESPOSTA"
              className={`flex-1 px-4 py-3 bg-[#291923] border-2 text-white text-center text-xl uppercase tracking-widest rounded-sm focus:outline-none ${
                wrongGuess ? 'border-red-500 animate-shake' : 'border-[#D8B66C] focus:border-[#E5C982]'
              }`}
              maxLength={20}
              autoComplete="off"
            />
            <button
              type="submit"
              className="px-6 py-3 bg-[#D8B66C] text-[#291923] font-bold text-xl rounded-sm hover:bg-[#E5C982] transition"
            >
              ✓
            </button>
          </div>
        </form>
      )}

      {/* Pontuações parciais */}
      <div className="max-w-md mx-auto">
        <h3 className="text-sm text-[#F3EBDD]/60 uppercase tracking-widest mb-2">Pontuações</h3>
        <div className="bg-[#291923]/80 border border-[#D8B66C]/30 rounded-lg p-3">
          {(roundEnd?.scores || []).length > 0 ? (
            roundEnd.scores.map((s) => (
              <div key={s.playerId} className="flex justify-between text-[#F3EBDD] py-1">
                <span>{s.playerName}</span>
                <span className="font-bold text-[#D8B66C]">{s.score}</span>
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