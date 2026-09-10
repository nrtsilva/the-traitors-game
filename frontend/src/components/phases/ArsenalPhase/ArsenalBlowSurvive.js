
import React, { useState, useEffect } from 'react';

export default function ArsenalBlowSurvive({ socket, roomData, playerState }) {
  const [gameStarted, setGameStarted] = useState(false);
  const [phase, setPhase] = useState('waiting'); // 'waiting' | 'turn' | 'result' | 'choose_winner' | 'finished'
  const [roundNumber, setRoundNumber] = useState(0);
  const [currentPlayer, setCurrentPlayer] = useState(null);
  const [playersLeft, setPlayersLeft] = useState(0);
  const [eliminatedNames, setEliminatedNames] = useState([]);
  const [lastResult, setLastResult] = useState(null);
  const [remainingPlayers, setRemainingPlayers] = useState([]);
  const [selectedWinnerId, setSelectedWinnerId] = useState(null);
  const [winnerInfo, setWinnerInfo] = useState(null);

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
      setPlayersLeft(data.playersLeft);
      setEliminatedNames(data.eliminatedNames || []);
      setLastResult(null);
    };

    const onResult = (data) => {
      setPhase('result');
      setLastResult(data);
      setPlayersLeft(data.playersLeft);
      if (data.eliminated) {
        setEliminatedNames(prev => [...prev, data.playerName]);
      }
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

    socket.on('blow_survive_start', onStart);
    socket.on('blow_survive_turn', onTurn);
    socket.on('blow_survive_result', onResult);
    socket.on('blow_survive_need_winner', onNeedWinner);
    socket.on('blow_survive_winner', onWinner);

    return () => {
      socket.off('blow_survive_start', onStart);
      socket.off('blow_survive_turn', onTurn);
      socket.off('blow_survive_result', onResult);
      socket.off('blow_survive_need_winner', onNeedWinner);
      socket.off('blow_survive_winner', onWinner);
    };
  }, [socket]);

  const handleDecision = (result) => {
    socket.emit('blow_survive_decision', {
      roomCode: roomData.roomCode,
      result,
    });
  };

  const handleConfirmWinner = () => {
    if (!selectedWinnerId) return;
    socket.emit('blow_survive_confirm_winner', {
      roomCode: roomData.roomCode,
      winnerId: selectedWinnerId,
    });
  };

  // ============ ECRÃ FINAL ============
  if (phase === 'finished' && winnerInfo) {
    return (
      <div className="fixed inset-0 bg-black/90 flex items-center justify-center z-50">
        <div className="max-w-md w-full bg-[#291923] border-2 border-[#D8B66C] rounded-lg p-8 text-center">
          <div className="text-7xl mb-4">💨</div>
          <h1 className="font-display text-3xl text-[#E5C982] mb-2">VENCEDOR!</h1>
          <p className="text-4xl font-display font-bold text-[#D8B66C] my-6">
            🏆 {winnerInfo.winnerName}
          </p>
          <p className="text-lg text-[#F3EBDD]">
            Venceu o <strong>Sopra e Sobrevive</strong>
          </p>
          <div className="mt-6 p-4 bg-[#D8B66C]/20 border border-[#D8B66C] rounded-lg">
            <p className="text-[#E5C982] text-lg font-bold">
              🪙 +2 Barras de Ouro
            </p>
            <p className="text-xs text-[#F3EBDD]/60 mt-1">adicionadas ao Cofre Comum</p>
          </div>
        </div>
      </div>
    );
  }

  // ============ ESCOLHA DO VENCEDOR ============
  if (phase === 'choose_winner') {
    return (
      <div className="text-center max-w-2xl mx-auto">
        <h1 className="text-4xl font-display font-bold text-[#E5C982] mb-4">💨 SOPRA E SOBREVIVE</h1>
        <p className="text-2xl text-[#F3EBDD] mb-8 animate-pulse">
          🎉 Restam apenas {remainingPlayers.length} jogador(es)!
        </p>

        <div className="bg-[#291923] border-2 border-[#D8B66C] rounded-lg p-6 mb-6">
          <p className="text-sm text-[#F3EBDD]/60 uppercase tracking-widest mb-4">
            Confirmem o vencedor da prova
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
        <h1 className="text-5xl font-bold text-[#E5C982] mb-8">💨 SOPRA E SOBREVIVE</h1>
        <p className="text-[#F3EBDD] animate-pulse">A preparar o desafio...</p>
      </div>
    );
  }

  // ============ ECRÃ DE JOGO ============
  return (
    <div className="text-center max-w-2xl mx-auto">
      <h1 className="text-4xl font-display font-bold text-[#E5C982] mb-2">💨 SOPRA E SOBREVIVE</h1>
      <p className="text-[#F3EBDD]/60 text-sm mb-6">
        Afasta alguns papéis, mas <strong className="text-[#E5C982]">NUNCA todos</strong>.
      </p>

      {/* Contador */}
      <div className="flex justify-center items-center gap-8 mb-6">
        <div className="text-center">
          <div className="w-24 h-24 rounded-full border-4 border-[#D8B66C] flex items-center justify-center bg-[#291923]">
            <span className="font-display text-3xl font-bold text-[#E5C982]">{playersLeft}</span>
          </div>
          <p className="text-xs text-[#F3EBDD]/60 uppercase tracking-widest mt-1">Em Jogo</p>
        </div>
        <div className="text-center">
          <div className="w-24 h-24 rounded-full border-4 border-red-500/50 flex items-center justify-center bg-[#291923]">
            <span className="font-display text-3xl font-bold text-red-400">
              {eliminatedNames.length}
            </span>
          </div>
          <p className="text-xs text-[#F3EBDD]/60 uppercase tracking-widest mt-1">Eliminados</p>
        </div>
      </div>

      {/* Ronda + Jogador atual */}
      {phase === 'turn' && currentPlayer && (
        <div className="bg-[#291923] border-2 border-[#D8B66C] rounded-lg p-8 mb-6 animate-pulse">
          <p className="text-xs text-[#F3EBDD]/60 uppercase tracking-widest mb-3">
            Ronda {roundNumber} · É a vez de soprar:
          </p>
          <p className="text-5xl font-display font-bold text-[#E5C982] mb-4">
            {currentPlayer.name}
          </p>
          <p className="text-sm text-[#F3EBDD]">
            Aproxima-te da mesa e sopra os papéis.<br />
            <span className="text-[#F3EBDD]/60">Não toques nos papéis!</span>
          </p>
        </div>
      )}

      {/* Última decisão */}
      {phase === 'result' && lastResult && (
        <div className={`mb-6 p-6 rounded-lg border-2 ${
          lastResult.eliminated
            ? 'bg-red-900/30 border-red-500'
            : 'bg-green-900/30 border-green-500'
        }`}>
          <p className="text-2xl font-bold mb-2">
            {lastResult.eliminated ? '❌ ELIMINADO' : '✅ SOBREVIVEU'}
          </p>
          <p className="text-xl text-[#E5C982] mb-2">{lastResult.playerName}</p>
          <p className="text-sm text-[#F3EBDD]/80">{lastResult.reason}</p>
        </div>
      )}

      {/* Instruções para os supervisores */}
      {phase === 'turn' && (
        <div className="bg-[#291923]/70 border border-[#D8B66C]/30 rounded-lg p-4 mb-6">
          <p className="text-xs text-[#F3EBDD]/60 uppercase tracking-widest mb-3">
            📋 Supervisores: registem o resultado após o sopro
          </p>
          <div className="grid grid-cols-1 gap-2">
            <button
              onClick={() => handleDecision('none')}
              className="w-full py-3 bg-red-900/50 border-2 border-red-500 text-red-200 font-bold rounded-lg hover:bg-red-900 transition"
            >
              🚫 Não moveu nenhum pedaço → Eliminado
            </button>
            <button
              onClick={() => handleDecision('some')}
              className="w-full py-3 bg-green-900/50 border-2 border-green-500 text-green-200 font-bold rounded-lg hover:bg-green-900 transition"
            >
              ✅ Moveu alguns (mas não todos) → Sobrevive
            </button>
            <button
              onClick={() => handleDecision('all')}
              className="w-full py-3 bg-red-900/50 border-2 border-red-500 text-red-200 font-bold rounded-lg hover:bg-red-900 transition"
            >
              ⚠️ Moveu TODOS os pedaços → Eliminado
            </button>
          </div>
        </div>
      )}

      {/* Lista de eliminados */}
      {eliminatedNames.length > 0 && (
        <div className="bg-[#291923] border border-[#D8B66C]/30 rounded-lg p-4">
          <h3 className="text-xs text-[#F3EBDD]/60 uppercase tracking-widest mb-2">
            💀 Eliminados
          </h3>
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
      <div className="mt-6 bg-[#291923]/70 border border-[#D8B66C]/30 rounded-lg p-4 text-left">
        <h3 className="text-xs text-[#F3EBDD]/60 uppercase tracking-widest mb-2">📜 Regras</h3>
        <ul className="text-sm text-[#F3EBDD]/80 space-y-1">
          <li>• Apenas com o <strong>sopro</strong>, sem tocar nos papéis</li>
          <li>• Deixar <strong>alguns</strong> papéis no centro → ✅ sobrevives</li>
          <li>• Não mover nenhum → ❌ eliminado</li>
          <li>• Mover todos (ou só o último) → ❌ eliminado</li>
          <li>• Vence o último jogador que ficar em jogo</li>
        </ul>
      </div>
    </div>
  );
}