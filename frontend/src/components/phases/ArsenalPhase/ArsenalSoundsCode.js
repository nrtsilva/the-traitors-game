import React, { useState, useEffect } from 'react';

const SOUND_INFO = {
  1: { emoji: '🐷', label: 'Grunhido', color: '#dc2626' },
  2: { emoji: '😛', label: 'Som de língua', color: '#ca8a04' },
  3: { emoji: '🎵', label: 'Assobio', color: '#2563eb' },
};

export default function ArsenalSoundsCode({ socket, roomData, playerId }) {
  const [gameStarted, setGameStarted] = useState(false);
  const [phase, setPhase] = useState('waiting'); // 'waiting' | 'turn' | 'correct' | 'error' | 'choose_winner' | 'finished'
  const [roundNumber, setRoundNumber] = useState(0);
  const [currentPlayer, setCurrentPlayer] = useState(null);
  const [sequence, setSequence] = useState([]);
  const [playersLeft, setPlayersLeft] = useState(0);
  const [eliminatedNames, setEliminatedNames] = useState([]);
  const [lastResult, setLastResult] = useState(null);
  const [remainingPlayers, setRemainingPlayers] = useState([]);
  const [selectedWinnerId, setSelectedWinnerId] = useState(null);
  const [winnerInfo, setWinnerInfo] = useState(null);

  const isActivePlayer = currentPlayer?.id === playerId;

  // Socket listeners
  useEffect(() => {
    if (!socket) return;

    const onStart = (data) => {
      setGameStarted(true);
      setPlayersLeft(data.totalPlayers);
      setPhase('waiting');
      setEliminatedNames([]);
      setLastResult(null);
    };

    const onTurn = (data) => {
      setPhase('turn');
      setRoundNumber(data.roundNumber);
      setCurrentPlayer({ id: data.playerId, name: data.playerName });
      setSequence(data.sequence);
      setPlayersLeft(data.playersLeft);
      setEliminatedNames(data.eliminatedNames || []);
      setLastResult(null);
    };

    const onCorrect = (data) => {
      setPhase('correct');
      setLastResult({ type: 'correct', ...data });
      setTimeout(() => setLastResult(null), 2200);
    };

    const onError = (data) => {
      setPhase('error');
      setLastResult({ type: 'error', ...data });
      setPlayersLeft(data.playersLeft);
      setEliminatedNames(prev => [...prev, data.playerName]);
    };

    const onNeedWinner = (data) => {
      setPhase('choose_winner');
      setRemainingPlayers(data.remaining || []);
      setSelectedWinnerId(data.suggestedWinnerId || null);
    };

    const onWinner = (data) => {
      setPhase('finished');
      setWinnerInfo(data);
    };

    socket.on('sounds_code_start', onStart);
    socket.on('sounds_code_turn', onTurn);
    socket.on('sounds_code_correct', onCorrect);
    socket.on('sounds_code_error', onError);
    socket.on('sounds_code_need_winner', onNeedWinner);
    socket.on('sounds_code_winner', onWinner);

    return () => {
      socket.off('sounds_code_start', onStart);
      socket.off('sounds_code_turn', onTurn);
      socket.off('sounds_code_correct', onCorrect);
      socket.off('sounds_code_error', onError);
      socket.off('sounds_code_need_winner', onNeedWinner);
      socket.off('sounds_code_winner', onWinner);
    };
  }, [socket]);

  const handleDecision = (result) => {
    socket.emit('sounds_code_decision', {
      roomCode: roomData.roomCode,
      result,
    });
  };

  const handleConfirmWinner = () => {
    if (!selectedWinnerId) return;
    socket.emit('sounds_code_confirm_winner', {
      roomCode: roomData.roomCode,
      winnerId: selectedWinnerId,
    });
  };

  // ============ ECRÃ FINAL ============
  if (phase === 'finished' && winnerInfo) {
    return (
      <div className="fixed inset-0 bg-black/90 flex items-center justify-center z-50">
        <div className="max-w-md w-full bg-[#291923] border-2 border-[#D8B66C] rounded-lg p-8 text-center">
          <div className="text-7xl mb-4">🔊</div>
          <h1 className="font-display text-3xl text-[#E5C982] mb-2">VENCEDOR!</h1>
          <p className="text-4xl font-display font-bold text-[#D8B66C] my-6">
            🏆 {winnerInfo.winnerName}
          </p>
          <p className="text-lg text-[#F3EBDD]">
            Venceu os <strong>Sons em Código</strong>
          </p>
          <div className="mt-6 p-4 bg-[#D8B66C]/20 border border-[#D8B66C] rounded-lg">
            <p className="text-[#E5C982] text-lg font-bold">🪙 +2 Moedas de Ouro</p>
          </div>
        </div>
      </div>
    );
  }

  // ============ ESCOLHA DO VENCEDOR ============
  if (phase === 'choose_winner') {
    return (
      <div className="text-center max-w-2xl mx-auto">
        <h1 className="text-4xl font-display font-bold text-[#E5C982] mb-4">🔊 SONS EM CÓDIGO</h1>
        <p className="text-2xl text-[#F3EBDD] mb-8 animate-pulse">
          🎉 Restam apenas {remainingPlayers.length} jogador(es)!
        </p>

        <div className="bg-[#291923] border-2 border-[#D8B66C] rounded-lg p-6 mb-6">
          <p className="text-sm text-[#F3EBDD]/60 uppercase tracking-widest mb-4">
            Confirmem o vencedor
          </p>
          <div className="space-y-2">
            {remainingPlayers.map(p => (
              <button
                key={p.id}
                onClick={() => setSelectedWinnerId(p.id)}
                className={`w-full py-4 px-6 rounded-lg border-2 text-xl font-bold transition ${
                  selectedWinnerId === p.id
                    ? 'bg-[#D8B66C] text-[#291923] border-[#E5C982] scale-105'
                    : 'bg-[#291923] text-[#F3EBDD] border-[#D8B66C]/40 hover:border-[#D8B66C]'
                }`}
              >
                🏆 {p.name}
              </button>
            ))}
          </div>
        </div>

        <button
          onClick={handleConfirmWinner}
          disabled={!selectedWinnerId}
          className="px-12 py-4 bg-[#D8B66C] text-[#291923] font-display font-bold text-xl uppercase tracking-widest rounded-lg hover:bg-[#E5C982] transition shadow-soft disabled:opacity-40 disabled:cursor-not-allowed"
        >
          ✅ CONFIRMAR VENCEDOR
        </button>
      </div>
    );
  }

  // ============ ECRÃ DE ESPERA ============
  if (!gameStarted) {
    return (
      <div className="text-center">
        <h1 className="text-5xl font-bold text-[#E5C982] mb-8">🔊 SONS EM CÓDIGO</h1>
        <p className="text-[#F3EBDD] animate-pulse">A preparar o desafio...</p>
      </div>
    );
  }

  // ============ ECRÃ DE JOGO ============
  return (
    <div className="text-center max-w-3xl mx-auto">
      <h1 className="text-4xl font-display font-bold text-[#E5C982] mb-2">🔊 SONS EM CÓDIGO</h1>
      <p className="text-[#F3EBDD]/60 text-sm mb-4">
        Memoriza os sons e reproduz pela ordem correta!
      </p>

      {/* Contadores */}
      <div className="flex justify-center items-center gap-6 mb-6 flex-wrap">
        <div className="text-center">
          <div className="w-20 h-20 rounded-full border-4 border-[#D8B66C] flex items-center justify-center bg-[#291923]">
            <span className="font-display text-2xl font-bold text-[#E5C982]">{playersLeft}</span>
          </div>
          <p className="text-xs text-[#F3EBDD]/60 uppercase tracking-widest mt-1">Em Jogo</p>
        </div>
        <div className="text-center">
          <div className="w-20 h-20 rounded-full border-4 border-red-500/50 flex items-center justify-center bg-[#291923]">
            <span className="font-display text-2xl font-bold text-red-400">{eliminatedNames.length}</span>
          </div>
          <p className="text-xs text-[#F3EBDD]/60 uppercase tracking-widest mt-1">Eliminados</p>
        </div>
        <div className="text-center">
          <div className="w-20 h-20 rounded-full border-4 border-[#D8B66C] flex items-center justify-center bg-[#291923]">
            <span className="font-display text-2xl font-bold text-[#E5C982]">{roundNumber}</span>
          </div>
          <p className="text-xs text-[#F3EBDD]/60 uppercase tracking-widest mt-1">Ronda</p>
        </div>
      </div>

      {/* Legenda dos sons */}
      <div className="mb-6 bg-[#291923] border border-[#D8B66C]/30 rounded-lg p-4">
        <p className="text-xs text-[#F3EBDD]/60 uppercase tracking-widest mb-3">🎵 Código dos Sons</p>
        <div className="flex justify-center gap-6 flex-wrap">
          {Object.entries(SOUND_INFO).map(([n, info]) => (
            <div key={n} className="text-center">
              <div className="text-5xl">{info.emoji}</div>
              <p className="text-sm font-bold text-[#E5C982] mt-1">{n}</p>
              <p className="text-xs text-[#F3EBDD]/60">{info.label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Turno atual */}
      {phase === 'turn' && currentPlayer && (
        <div className={`bg-[#291923] border-2 rounded-lg p-8 mb-6 ${
          isActivePlayer ? 'border-[#D8B66C] animate-pulse' : 'border-[#D8B66C]/30'
        }`}>
          <p className="text-xs text-[#F3EBDD]/60 uppercase tracking-widest mb-3">
            🎤 É a vez de:
          </p>
          <p className={`text-5xl font-display font-bold mb-6 ${
            isActivePlayer ? 'text-[#E5C982]' : 'text-[#F3EBDD]'
          }`}>
            {currentPlayer.name} {isActivePlayer && '(TU)'}
          </p>
          
          <p className="text-xs text-[#F3EBDD]/60 uppercase tracking-widest mb-2">Sequência:</p>
          <div className="flex justify-center gap-3 flex-wrap mb-4">
            {sequence.map((n, i) => (
              <div
                key={i}
                className="w-16 h-16 rounded-lg border-2 flex items-center justify-center"
                style={{
                  borderColor: SOUND_INFO[n].color,
                  backgroundColor: `${SOUND_INFO[n].color}20`,
                }}
              >
                <span className="text-3xl font-display font-bold text-[#F3EBDD]">{n}</span>
              </div>
            ))}
          </div>

          <p className="text-sm text-[#F3EBDD]">
            {isActivePlayer 
              ? '🎤 Produz os sons correspondentes pela ordem correta!'
              : '👂 Ouve com atenção a execução do jogador.'}
          </p>
        </div>
      )}

      {/* Feedback correto */}
      {lastResult?.type === 'correct' && (
        <div className="mb-6 p-4 bg-green-900/30 border-2 border-green-500 rounded-lg">
          <p className="text-2xl text-green-300 font-bold">✅ CORRETO!</p>
          <p className="text-sm text-green-200/80 mt-1">
            {lastResult.playerName} — {lastResult.successCount} sucesso(s)
          </p>
        </div>
      )}

      {/* Feedback erro */}
      {lastResult?.type === 'error' && (
        <div className="mb-6 p-4 bg-red-900/30 border-2 border-red-500 rounded-lg">
          <p className="text-2xl text-red-300 font-bold">❌ ERRO</p>
          <p className="text-sm text-red-200/80 mt-1">
            {lastResult.playerName} foi eliminado.
          </p>
        </div>
      )}

      {/* Instruções para supervisores */}
      {phase === 'turn' && (
        <div className="bg-[#291923]/70 border border-[#D8B66C]/30 rounded-lg p-4 mb-6">
          <p className="text-xs text-[#F3EBDD]/60 uppercase tracking-widest mb-3">
            📋 Supervisores: validem a execução
          </p>
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() => handleDecision('correct')}
              className="py-3 bg-green-900/50 border-2 border-green-500 text-green-200 font-bold rounded-lg hover:bg-green-900 transition"
            >
              ✅ CORRETO
            </button>
            <button
              onClick={() => handleDecision('error')}
              className="py-3 bg-red-900/50 border-2 border-red-500 text-red-200 font-bold rounded-lg hover:bg-red-900 transition"
            >
              ❌ ERRO
            </button>
          </div>
          <p className="text-xs text-[#F3EBDD]/50 mt-3 text-center">
            Sons corretos, ordem correta e resposta rápida? → CORRETO
          </p>
        </div>
      )}

      {/* Eliminados */}
      {eliminatedNames.length > 0 && (
        <div className="bg-[#291923] border border-[#D8B66C]/30 rounded-lg p-4 mb-6">
          <h3 className="text-xs text-[#F3EBDD]/60 uppercase tracking-widest mb-2">💀 Eliminados</h3>
          <div className="flex flex-wrap gap-2 justify-center">
            {eliminatedNames.map((name, i) => (
              <span
                key={i}
                className="px-3 py-1 bg-red-900/30 border border-red-500/50 text-red-300 text-sm rounded-full line-through"
              >
                {name}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Regras */}
      <div className="bg-[#291923]/70 border border-[#D8B66C]/30 rounded-lg p-4 text-left">
        <h3 className="text-xs text-[#F3EBDD]/60 uppercase tracking-widest mb-2">📜 Regras</h3>
        <ul className="text-sm text-[#F3EBDD]/80 space-y-1">
          <li>• 1 → 🐷 Grunhido · 2 → 😛 Língua · 3 → 🎵 Assobio</li>
          <li>• Reproduz os sons pela ordem correta</li>
          <li>• Os supervisores validam com ✅ ou ❌</li>
          <li>• Primeiro erro = eliminação</li>
          <li>• As sequências aumentam a cada ronda</li>
        </ul>
      </div>
    </div>
  );
}