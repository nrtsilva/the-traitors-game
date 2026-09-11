
import React, { useState, useEffect } from 'react';

export default function MissionSilentMime({ playerState, socket, roomData, playerId }) {
  const [gameStarted, setGameStarted] = useState(false);
  const [themeLabel, setThemeLabel] = useState('');
  const [timer, setTimer] = useState(0);
  const [round, setRound] = useState(null);
  const [myTurnData, setMyTurnData] = useState(null);
  const [lastCorrect, setLastCorrect] = useState(null);
  const [lastPassed, setLastPassed] = useState(null);
  const [guessedCount, setGuessedCount] = useState(0);
  const [totalWords, setTotalWords] = useState(10);
  const [showWordHint, setShowWordHint] = useState(true);

  // Socket listeners
  useEffect(() => {
    if (!socket) return;

    const onStart = (data) => {
      setGameStarted(true);
      setTimer(data.timeLimit);
      setThemeLabel(data.themeLabel);
      setTotalWords(data.totalWords);
      setGuessedCount(0);
      setRound(null);
      setMyTurnData(null);
      setLastCorrect(null);
      setLastPassed(null);
    };

    const onRound = (data) => {
      setRound(data);
      setMyTurnData(null);
      setShowWordHint(true);
    };

    const onYourTurn = (data) => {
      setMyTurnData(data);
      setShowWordHint(true);
    };

    const onCorrect = (data) => {
      setLastCorrect(data);
      setGuessedCount(data.guessedCount);
      setLastPassed(null);
      setTimeout(() => setLastCorrect(null), 2500);
    };

    const onPassed = (data) => {
      setLastPassed(data);
      setLastCorrect(null);
      setTimeout(() => setLastPassed(null), 2000);
    };

    socket.on('silent_mime_start', onStart);
    socket.on('silent_mime_round', onRound);
    socket.on('silent_mime_your_turn', onYourTurn);
    socket.on('silent_mime_correct', onCorrect);
    socket.on('silent_mime_passed', onPassed);

    socket.emit('mission_client_ready', { roomCode: roomData.roomCode });

    return () => {
      socket.off('silent_mime_start', onStart);
      socket.off('silent_mime_round', onRound);
      socket.off('silent_mime_your_turn', onYourTurn);
      socket.off('silent_mime_correct', onCorrect);
      socket.off('silent_mime_passed', onPassed);
    };
  }, [socket, roomData?.roomCode]);

  // Countdown
  useEffect(() => {
    if (!gameStarted || timer <= 0) return;
    const interval = setInterval(() => {
      setTimer(prev => (prev <= 1 ? 0 : prev - 1));
    }, 1000);
    return () => clearInterval(interval);
  }, [gameStarted, timer]);

  const handleCorrect = () => {
    socket.emit('silent_mime_correct', { roomCode: roomData.roomCode });
  };

  const handlePass = () => {
    if (window.confirm('Passar esta palavra? O cronómetro continua!')) {
      socket.emit('silent_mime_pass', { roomCode: roomData.roomCode });
    }
  };

  const formatTime = (s) => `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, '0')}`;

  const isMyTurn = myTurnData !== null;

  if (!gameStarted) {
    return (
      <div className="text-center">
        <p className="text-[#F3EBDD] animate-pulse">A preparar o tema...</p>
      </div>
    );
  }

  return (
    <div className="text-center max-w-3xl mx-auto">
      <h1 className="text-4xl font-display font-bold text-[#E5C982] mb-2">🤐 MÍMICA SILENCIOSA</h1>
      <p className="text-[#F3EBDD]/60 text-sm mb-4">Tema: <strong className="text-[#E5C982]">{themeLabel}</strong></p>

      {/* Header: Timer + Progresso */}
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
            <span className="font-display text-2xl font-bold text-[#E5C982]">{guessedCount}/{totalWords}</span>
          </div>
          <p className="text-xs text-[#F3EBDD]/60 uppercase tracking-widest mt-1">Palavras</p>
        </div>
      </div>

      {/* Última palavra correta */}
      {lastCorrect && (
        <div className="mb-6 p-4 bg-green-900/30 border-2 border-green-500 rounded-lg animate-pulse">
          <p className="text-2xl text-green-300 font-bold">🎉 {lastCorrect.word}!</p>
        </div>
      )}

      {/* Última palavra passada */}
      {lastPassed && (
        <div className="mb-6 p-4 bg-yellow-900/30 border-2 border-yellow-500 rounded-lg">
          <p className="text-xl text-yellow-300">⏭️ Passou: <strong>{lastPassed.word}</strong></p>
        </div>
      )}

      {/* ECRÃ DO MÍMICO */}
      {isMyTurn && (
        <div className="bg-[#291923] border-2 border-[#D8B66C] rounded-lg p-6 mb-6">
          <p className="text-xs text-[#F3EBDD]/60 uppercase tracking-widest mb-4">🎭 É A TUA VEZ</p>

          {showWordHint && (
            <div className="bg-[#1a0f15] border-2 border-[#E5C982] rounded-lg p-6 mb-4 relative">
              <p className="text-xs text-[#F3EBDD]/60 mb-2">A tua palavra secreta é:</p>
              <p className="text-4xl font-display font-bold text-[#E5C982] mb-4">{myTurnData.word}</p>
              <div className="bg-[#D8B66C]/20 border border-[#D8B66C] rounded-lg p-3">
                <p className="text-xs text-[#F3EBDD]/60 mb-1">SOM PERMITIDO (repetir apenas este):</p>
                <p className="text-5xl font-display font-bold text-[#D8B66C]">"{myTurnData.allowedSound}"</p>
              </div>
              <p className="text-xs text-red-400 mt-3 font-bold">⚠️ NÃO MOSTRAR AOS OUTROS JOGADORES</p>
              <button
                onClick={() => setShowWordHint(false)}
                className="mt-4 px-4 py-2 bg-[#412734] text-[#F3EBDD] text-sm rounded-sm"
              >
                👁️ Esconder palavra
              </button>
            </div>
          )}

          {!showWordHint && (
            <div className="bg-[#1a0f15] border-2 border-[#D8B66C]/40 rounded-lg p-6 mb-4">
              <p className="text-2xl text-[#F3EBDD]/60">🤫 Palavra escondida</p>
              <p className="text-sm text-[#F3EBDD]/40 mt-2">
                Continua a fazer mímica e a repetir o som.
              </p>
              <button
                onClick={() => setShowWordHint(true)}
                className="mt-4 px-4 py-2 bg-[#D8B66C] text-[#291923] text-sm font-bold rounded-sm"
              >
                👁️ Ver palavra outra vez
              </button>
            </div>
          )}

          <p className="text-sm text-[#F3EBDD]/70">
            Faz mímica e repete "<strong className="text-[#E5C982]">{myTurnData.allowedSound}... {myTurnData.allowedSound}...</strong>"
          </p>
        </div>
      )}

      {/* ECRÃ DOS ADIVINHADORES */}
      {!isMyTurn && round && (
        <div className="bg-[#291923] border-2 border-[#D8B66C] rounded-lg p-6 mb-6">
          <p className="text-xs text-[#F3EBDD]/60 uppercase tracking-widest mb-2">🎭 Quem está a fazer mímica:</p>
          <p className="text-4xl font-display font-bold text-[#E5C982] mb-4">{round.mimerName}</p>
          <p className="text-sm text-[#F3EBDD]/70">
            Observa a mímica e ouve com atenção o som repetido. Grita a tua resposta!
          </p>
        </div>
      )}

      {/* REGRAS RESUMIDAS */}
      <div className="bg-[#291923]/70 border border-[#D8B66C]/30 rounded-lg p-4 mb-6 text-left">
        <h3 className="text-xs text-[#F3EBDD]/60 uppercase tracking-widest mb-2">📜 Regras</h3>
        <ul className="text-sm text-[#F3EBDD]/80 space-y-1">
          <li>• O mímicos faz gestos — <strong>NÃO PODE FALAR</strong></li>
          <li>• Só pode emitir o som da letra atribuída, repetidamente</li>
          <li>• Os outros adivinham <strong>em voz alta</strong></li>
          <li>• Quando acertarem, alguém clica em <strong>ACERTÁMOS</strong></li>
          <li>• Bloqueados? <strong>PASSAR</strong> (o tempo continua!)</li>
        </ul>
      </div>

      {/* BOTÕES DE AÇÃO */}
      {timer > 0 && (
        <div className="flex justify-center gap-4 flex-wrap">
          <button
            onClick={handleCorrect}
            className="px-10 py-5 bg-green-700 text-white font-display font-bold text-xl uppercase tracking-widest rounded-lg hover:bg-green-600 transition shadow-soft"
          >
            ✅ ACERTÁMOS
          </button>
          <button
            onClick={handlePass}
            className="px-10 py-5 bg-[#412734] border-2 border-[#D8B66C] text-[#E5C982] font-display font-bold text-xl uppercase tracking-widest rounded-lg hover:bg-[#291923] transition"
          >
            ⏭️ PASSAR
          </button>
        </div>
      )}

      {timer <= 0 && (
        <div className="mt-6 p-4 bg-red-900/40 border-2 border-red-500 rounded-lg">
          <p className="text-red-300 font-bold text-xl">⏰ Tempo esgotado!</p>
        </div>
      )}
    </div>
  );
}