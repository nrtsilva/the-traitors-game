import React, { useState, useEffect, useCallback } from 'react';

const COLOR_MAP = {
  red:    { bg: '#dc2626', glow: '#ef4444', label: 'Vermelho' },
  green:  { bg: '#16a34a', glow: '#22c55e', label: 'Verde' },
  blue:   { bg: '#2563eb', glow: '#3b82f6', label: 'Azul' },
  yellow: { bg: '#ca8a04', glow: '#eab308', label: 'Amarelo' },
  purple: { bg: '#7c3aed', glow: '#a855f7', label: 'Roxo' },
};

export default function ArsenalColorReflex({ socket, roomData, playerId }) {
  const [grid, setGrid] = useState(
    Array(16).fill(null).map(() => ({ state: 'inactive', color: null }))
  );
  const [score, setScore] = useState(0);
  const [timer, setTimer] = useState(0);
  const [eliminated, setEliminated] = useState(false);
  const [gameStarted, setGameStarted] = useState(false);
  const [finalScores, setFinalScores] = useState(null);
  const [flashIndex, setFlashIndex] = useState(null);

  // --- Socket listeners ---
  useEffect(() => {
    if (!socket) return;

    const onStart = (data) => {
      setTimer(data.duration);
      setGameStarted(true);
      setGrid(Array(data.gridSize).fill(null).map(() => ({ state: 'inactive', color: null })));
      setScore(0);
      setEliminated(false);
      setFinalScores(null);
    };

    const onSquare = ({ index, state, color }) => {
      setGrid(prev => {
        const copy = [...prev];
        copy[index] = { state, color };
        return copy;
      });
    };

    const onScore = ({ score: newScore }) => {
      setScore(newScore);
    };

    const onEliminated = () => {
      setEliminated(true);
    };

    const onEnd = (data) => {
      setFinalScores(data);
    };

    socket.on('color_reflex_start', onStart);
    socket.on('color_reflex_square', onSquare);
    socket.on('color_reflex_score', onScore);
    socket.on('color_reflex_eliminated', onEliminated);
    socket.on('color_reflex_end', onEnd);

    return () => {
      socket.off('color_reflex_start', onStart);
      socket.off('color_reflex_square', onSquare);
      socket.off('color_reflex_score', onScore);
      socket.off('color_reflex_eliminated', onEliminated);
      socket.off('color_reflex_end', onEnd);
    };
  }, [socket]);

  // --- Countdown local ---
  useEffect(() => {
    if (!gameStarted || timer <= 0 || finalScores) return;
    const interval = setInterval(() => {
      setTimer(prev => (prev <= 1 ? 0 : prev - 1));
    }, 1000);
    return () => clearInterval(interval);
  }, [gameStarted, timer, finalScores]);

  // --- Clique num quadrado ---
  const handleClick = useCallback((index) => {
    if (eliminated || finalScores || !gameStarted) return;
    const square = grid[index];
    if (!square || square.state !== 'active') return;
    
    // Flash visual
    setFlashIndex(index);
    setTimeout(() => setFlashIndex(null), 200);
    
    socket.emit('color_reflex_click', {
      roomCode: roomData.roomCode,
      index,
    });
  }, [socket, roomData, grid, eliminated, finalScores, gameStarted]);

  // ============ ECRÃ FINAL ============
  if (finalScores) {
    const isWinner = finalScores.winnerId === playerId;
    return (
      <div className="fixed inset-0 bg-black/90 flex items-center justify-center z-50">
        <div className="max-w-md w-full bg-[#291923] border-2 border-[#D8B66C] rounded-lg p-8 text-center">
          <div className="text-7xl mb-4">{isWinner ? '🏆' : '🎮'}</div>
          <h1 className="font-display text-3xl text-[#E5C982] mb-6">
            {isWinner ? 'Venceste!' : 'Fim do Jogo'}
          </h1>
          <div className="bg-[#291923] border border-[#D8B66C]/40 rounded-lg p-4 mb-4">
            <h3 className="font-display text-lg text-[#D8B66C] mb-3">Classificação</h3>
            {finalScores.finalScores.map((s, i) => (
              <div
                key={s.playerId}
                className={`flex justify-between py-1 ${
                  i === 0 ? 'text-[#E5C982] font-bold' : 'text-[#F3EBDD]'
                }`}
              >
                <span>
                  {i + 1}.º {s.playerName}
                  {s.eliminated && <span className="text-red-400 text-xs ml-2">(eliminado)</span>}
                </span>
                <span>{s.score} pts {i === 0 && '🏆'}</span>
              </div>
            ))}
          </div>
          {isWinner && (
            <p className="text-lg text-[#D8B66C]">Ganhaste 2 moedas de ouro!</p>
          )}
        </div>
      </div>
    );
  }

  // ============ ECRÃ DE ESPERA ============
  if (!gameStarted) {
    return (
      <div className="text-center">
        <h1 className="text-5xl font-bold text-[#E5C982] mb-8">COLOR REFLEX</h1>
        <p className="text-[#F3EBDD] animate-pulse">A preparar o tabuleiro...</p>
      </div>
    );
  }

  // ============ ECRÃ DE JOGO ============
  return (
    <div className="text-center">
      <h1 className="text-4xl font-display font-bold text-[#E5C982] mb-2">COLOR REFLEX</h1>
      <p className="text-[#F3EBDD]/60 text-sm mb-4">
        Clica apenas nas cores válidas. Evita o roxo!
      </p>

      {/* Header: Timer + Pontuação */}
      <div className="flex justify-center items-center gap-8 mb-6">
        <div className="text-center">
          <div className="w-20 h-20 rounded-full border-4 border-[#D8B66C] flex items-center justify-center bg-[#291923]">
            <span className="font-display text-3xl font-bold text-[#D8B66C]">{timer}</span>
          </div>
          <p className="text-xs text-[#F3EBDD]/60 uppercase tracking-widest mt-1">Tempo</p>
        </div>
        <div className="text-center">
          <div className="w-20 h-20 rounded-full border-4 border-[#D8B66C] flex items-center justify-center bg-[#291923]">
            <span className="font-display text-3xl font-bold text-[#E5C982]">{score}</span>
          </div>
          <p className="text-xs text-[#F3EBDD]/60 uppercase tracking-widest mt-1">Pontos</p>
        </div>
      </div>

      {/* Aviso de eliminação */}
      {eliminated && (
        <div className="mb-4 p-3 bg-red-900/40 border border-red-500 rounded-lg text-center">
          <p className="text-red-300 font-bold">💀 Foste eliminado! Clicaste num quadrado roxo.</p>
        </div>
      )}

      {/* Tabuleiro 4x4 */}
      <div
        className={`grid grid-cols-4 gap-3 max-w-md mx-auto ${
          eliminated ? 'opacity-40 pointer-events-none' : ''
        }`}
      >
        {grid.map((square, i) => {
          const isActive = square.state === 'active';
          const isPurple = square.color === 'purple';
          const colorData = square.color ? COLOR_MAP[square.color] : null;
          
          return (
            <button
              key={i}
              onClick={() => handleClick(i)}
              disabled={!isActive}
              className={`aspect-square rounded-lg border-2 transition-all duration-150 ${
                flashIndex === i ? 'scale-95' : 'scale-100'
              }`}
              style={{
                backgroundColor: isActive ? colorData.bg : '#1a0f15',
                borderColor: isActive ? colorData.glow : '#D8B66C20',
                boxShadow: isActive ? `0 0 20px ${colorData.glow}80` : 'none',
              }}
            >
              {isPurple && isActive && (
                <span className="text-2xl select-none">⚠️</span>
              )}
            </button>
          );
        })}
      </div>

      {/* Legenda */}
      <div className="mt-6 flex justify-center gap-4 text-xs text-[#F3EBDD]/60">
        <span>🔴 🟢 🔵 🟡 = válidas (+1)</span>
        <span className="text-purple-400">🟣 = armadilha (elimina)</span>
      </div>
    </div>
  );
}