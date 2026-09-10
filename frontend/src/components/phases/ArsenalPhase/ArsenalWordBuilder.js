import React, { useState, useEffect } from 'react';

const GRID_SIZE = 15;
const CELL_SIZE = 24;

export default function ArsenalWordBuilder({ socket, roomData, playerId }) {
  const [gameStarted, setGameStarted] = useState(false);
  const [letters, setLetters] = useState([]);
  const [handCount, setHandCount] = useState({});
  const [grid, setGrid] = useState({});
  const [words, setWords] = useState([]);
  const [timer, setTimer] = useState(0);
  const [lettersUsed, setLettersUsed] = useState(0);
  const [wordCount, setWordCount] = useState(0);
  const [error, setError] = useState('');
  const [finished, setFinished] = useState(false);
  const [finalScores, setFinalScores] = useState(null);
  const [notifications, setNotifications] = useState([]);

  // Form
  const [newWord, setNewWord] = useState('');
  const [orientation, setOrientation] = useState('H');
  const [hoveredCell, setHoveredCell] = useState(null);
  const [selectedCell, setSelectedCell] = useState(null);

  // --- Socket listeners ---
  useEffect(() => {
    if (!socket) return;

    const onStart = (data) => {
      setGameStarted(true);
      setTimer(data.duration);
      setLetters(data.letters || []);
      setGrid({});
      setWords([]);
      setLettersUsed(0);
      setWordCount(0);
      setFinished(false);
      setFinalScores(null);
      setError('');
      setNotifications([]);
      // Contar mão
      const hc = {};
      (data.letters || []).forEach(l => { hc[l] = (hc[l] || 0) + 1; });
      setHandCount(hc);
    };

    const onWordAdded = (data) => {
      setGrid(data.newGrid || {});
      setHandCount(data.remainingHand || {});
      setLettersUsed(data.lettersUsed);
      setWordCount(data.wordCount);
      setWords(prev => [...prev, data.word]);
      setNewWord('');
      setError('');
    };

    const onWordRemoved = (data) => {
      setGrid(data.newGrid || {});
      setHandCount(data.remainingHand || {});
      setLettersUsed(data.lettersUsed);
      setWordCount(data.wordCount);
      setWords(prev => prev.slice(0, -1));
      setError('');
    };

    const onError = (data) => {
      setError(data.message || 'Erro');
      setTimeout(() => setError(''), 3000);
    };

    const onPlayerFinished = (data) => {
      if (data.playerId !== playerId) {
        setNotifications(prev => [...prev,
          `${data.playerName} terminou: ${data.wordCount} palavras, ${data.lettersUsed} letras, ${data.elapsedSeconds.toFixed(1)}s`
        ]);
      }
    };

    const onYouFinished = (data) => {
      setFinished(true);
    };

    const onEnd = (data) => {
      setFinalScores(data);
    };

    socket.on('word_builder_start', onStart);
    socket.on('word_builder_word_added', onWordAdded);
    socket.on('word_builder_word_removed', onWordRemoved);
    socket.on('word_builder_error', onError);
    socket.on('word_builder_player_finished', onPlayerFinished);
    socket.on('word_builder_you_finished', onYouFinished);
    socket.on('word_builder_end', onEnd);

    return () => {
      socket.off('word_builder_start', onStart);
      socket.off('word_builder_word_added', onWordAdded);
      socket.off('word_builder_word_removed', onWordRemoved);
      socket.off('word_builder_error', onError);
      socket.off('word_builder_player_finished', onPlayerFinished);
      socket.off('word_builder_you_finished', onYouFinished);
      socket.off('word_builder_end', onEnd);
    };
  }, [socket, playerId]);

  // Countdown
  useEffect(() => {
    if (!gameStarted || timer <= 0 || finished || finalScores) return;
    const interval = setInterval(() => {
      setTimer(prev => (prev <= 1 ? 0 : prev - 1));
    }, 1000);
    return () => clearInterval(interval);
  }, [gameStarted, timer, finished, finalScores]);

  // Auto-finish quando tempo acaba
  useEffect(() => {
    if (gameStarted && timer === 0 && !finished && !finalScores) {
      socket.emit('word_builder_finish', { roomCode: roomData.roomCode });
    }
  }, [timer, gameStarted, finished, finalScores, socket, roomData]);

  const handleCellClick = (r, c) => {
    if (finished || finalScores) return;
    setSelectedCell({ r, c });
  };

  const handleAdd = (e) => {
    e.preventDefault();
    if (!newWord.trim() || !selectedCell) {
      setError('Escreve uma palavra e clica numa célula.');
      return;
    }
    socket.emit('word_builder_add', {
      roomCode: roomData.roomCode,
      word: newWord.trim().toUpperCase(),
      row: selectedCell.r,
      col: selectedCell.c,
      orientation,
    });
  };

  const handleRemoveLast = () => {
    socket.emit('word_builder_remove_last', { roomCode: roomData.roomCode });
  };

  const handleFinish = () => {
    if (window.confirm('Terminar agora? Não poderás adicionar mais palavras.')) {
      socket.emit('word_builder_finish', { roomCode: roomData.roomCode });
    }
  };

  const formatTime = (s) => `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, '0')}`;

  // ============ ECRÃ FINAL ============
  if (finalScores) {
    const isWinner = finalScores.winnerId === playerId;
    return (
      <div className="fixed inset-0 bg-black/90 flex items-center justify-center z-50 overflow-auto">
        <div className="max-w-2xl w-full bg-[#291923] border-2 border-[#D8B66C] rounded-lg p-8 text-center my-8">
          <div className="text-7xl mb-4">{isWinner ? '🏆' : '📝'}</div>
          <h1 className="font-display text-3xl text-[#E5C982] mb-6">
            {isWinner ? 'Venceste!' : 'Fim do Jogo'}
          </h1>
          <div className="bg-[#291923] border border-[#D8B66C]/40 rounded-lg p-4 mb-4 text-left">
            <h3 className="font-display text-lg text-[#D8B66C] mb-3 text-center">Classificação</h3>
            {finalScores.finalScores.map((s, i) => (
              <div key={s.playerId} className={`py-2 border-b border-[#D8B66C]/10 ${i === 0 ? 'text-[#E5C982] font-bold' : 'text-[#F3EBDD]'}`}>
                <div className="flex justify-between">
                  <span>{i + 1}.º {s.playerName} {i === 0 && '🏆'}</span>
                  <span>{s.wordCount} palavras · {s.lettersUsed} letras · {s.elapsedSeconds.toFixed(1)}s</span>
                </div>
                {s.words && s.words.length > 0 && (
                  <p className="text-xs text-[#F3EBDD]/50 mt-1">{s.words.join(' · ')}</p>
                )}
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
        <h1 className="text-5xl font-bold text-[#E5C982] mb-8">WORD BUILDER</h1>
        <p className="text-[#F3EBDD] animate-pulse">A gerar as tuas letras...</p>
      </div>
    );
  }

  // ============ ECRÃ DE JOGO ============
  return (
    <div className="text-center">
      <h1 className="text-3xl font-display font-bold text-[#E5C982] mb-2">WORD BUILDER</h1>
      <p className="text-[#F3EBDD]/60 text-sm mb-4">
        Forma palavras com as tuas 12 letras. Clica numa célula e adiciona palavras.
      </p>

      {/* Header: timer + contadores */}
      <div className="flex justify-center items-center gap-6 mb-4">
        <div className="text-center">
          <div className={`w-16 h-16 rounded-full border-4 flex items-center justify-center bg-[#291923] ${timer <= 15 ? 'border-red-500' : 'border-[#D8B66C]'}`}>
            <span className="font-display text-xl font-bold text-[#D8B66C]">{formatTime(timer)}</span>
          </div>
        </div>
        <div className="text-center">
          <div className="w-16 h-16 rounded-full border-4 border-[#D8B66C] flex items-center justify-center bg-[#291923]">
            <span className="font-display text-xl font-bold text-[#E5C982]">{wordCount}</span>
          </div>
          <p className="text-xs text-[#F3EBDD]/60 uppercase tracking-widest mt-1">Palavras</p>
        </div>
        <div className="text-center">
          <div className="w-16 h-16 rounded-full border-4 border-[#D8B66C] flex items-center justify-center bg-[#291923]">
            <span className="font-display text-xl font-bold text-[#E5C982]">{lettersUsed}/12</span>
          </div>
          <p className="text-xs text-[#F3EBDD]/60 uppercase tracking-widest mt-1">Letras</p>
        </div>
      </div>

      {/* Notificações */}
      {notifications.slice(-2).map((n, i) => (
        <div key={i} className="mb-2 bg-[#D8B66C]/20 border border-[#D8B66C] rounded-lg px-4 py-2 text-sm text-[#E5C982]">
          📝 {n}
        </div>
      ))}

      {finished && !finalScores && (
        <div className="mb-4 p-3 bg-[#D8B66C]/20 border border-[#D8B66C] rounded-lg text-[#E5C982]">
          ✅ Terminaste! A aguardar os outros jogadores...
        </div>
      )}

      <div className="flex flex-col lg:flex-row gap-4 justify-center items-start">
        {/* TABULEIRO */}
        <div className="bg-[#1a0f15] border-2 border-[#D8B66C] rounded-lg p-2 overflow-auto max-h-[70vh]">
          <div
            className="grid"
            style={{
              gridTemplateColumns: `repeat(${GRID_SIZE}, ${CELL_SIZE}px)`,
              gridTemplateRows: `repeat(${GRID_SIZE}, ${CELL_SIZE}px)`,
            }}
          >
            {Array.from({ length: GRID_SIZE * GRID_SIZE }).map((_, i) => {
              const r = Math.floor(i / GRID_SIZE);
              const c = i % GRID_SIZE;
              const key = `${r},${c}`;
              const cell = grid[key];
              const isSelected = selectedCell?.r === r && selectedCell?.c === c;
              const isHovered = hoveredCell?.r === r && hoveredCell?.c === c;
              
              // Preview da palavra a colocar
              let previewLetter = null;
              if (selectedCell && newWord.trim()) {
                const w = newWord.trim().toUpperCase();
                for (let k = 0; k < w.length; k++) {
                  const pr = orientation === 'V' ? selectedCell.r + k : selectedCell.r;
                  const pc = orientation === 'H' ? selectedCell.c + k : selectedCell.c;
                  if (pr === r && pc === c && !cell) {
                    previewLetter = w[k];
                    break;
                  }
                }
              }
              
              return (
                <div
                  key={i}
                  onClick={() => handleCellClick(r, c)}
                  onMouseEnter={() => setHoveredCell({ r, c })}
                  onMouseLeave={() => setHoveredCell(null)}
                  style={{
                    width: CELL_SIZE,
                    height: CELL_SIZE,
                    backgroundColor: isSelected ? '#D8B66C40'
                      : previewLetter ? '#D8B66C20'
                      : isHovered ? '#412734' : 'transparent',
                    border: '1px solid #D8B66C20',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    fontSize: '14px',
                    fontWeight: 'bold',
                    color: cell ? '#F3EBDD' : previewLetter ? '#E5C982' : 'transparent',
                    userSelect: 'none',
                  }}
                >
                  {cell ? cell.letter : previewLetter || ''}
                </div>
              );
            })}
          </div>
        </div>

        {/* PAINEL LATERAL */}
        <div className="flex flex-col gap-3 w-full lg:w-72">
          {/* Mão */}
          <div className="bg-[#291923] border border-[#D8B66C]/40 rounded-lg p-3">
            <h3 className="text-xs text-[#F3EBDD]/60 uppercase tracking-widest mb-2">Letras disponíveis</h3>
            <div className="flex flex-wrap gap-1 justify-center">
              {letters.sort().map((l, i) => (
                <div
                  key={i}
                  className={`w-8 h-8 rounded flex items-center justify-center text-lg font-bold ${
                    (handCount[l] || 0) > 0
                      ? 'bg-[#D8B66C] text-[#291923]'
                      : 'bg-[#412734] text-[#F3EBDD]/20 line-through'
                  }`}
                  title={`${l}: ${handCount[l] || 0} restantes`}
                >
                  {l}
                </div>
              ))}
            </div>
          </div>

          {/* Form */}
          {!finished && (
            <form onSubmit={handleAdd} className="bg-[#291923] border border-[#D8B66C]/40 rounded-lg p-3 space-y-2">
              <input
                type="text"
                value={newWord}
                onChange={(e) => setNewWord(e.target.value.toUpperCase().replace(/[^A-ZÁÂÃÀÉÊÍÓÔÕÚÇ]/g, ''))}
                placeholder="PALAVRA"
                className="w-full px-3 py-2 bg-[#1a0f15] border border-[#D8B66C] text-white text-center uppercase rounded-sm focus:outline-none"
                maxLength={12}
              />
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setOrientation('H')}
                  className={`flex-1 py-2 rounded-sm font-bold ${orientation === 'H' ? 'bg-[#D8B66C] text-[#291923]' : 'bg-[#1a0f15] text-[#F3EBDD] border border-[#D8B66C]'}`}
                >
                  ↔ H
                </button>
                <button
                  type="button"
                  onClick={() => setOrientation('V')}
                  className={`flex-1 py-2 rounded-sm font-bold ${orientation === 'V' ? 'bg-[#D8B66C] text-[#291923]' : 'bg-[#1a0f15] text-[#F3EBDD] border border-[#D8B66C]'}`}
                >
                  ↕ V
                </button>
              </div>
              <p className="text-xs text-[#F3EBDD]/50 text-center">
                {selectedCell ? `Célula: L${selectedCell.r + 1}, C${selectedCell.c + 1}` : 'Clica numa célula'}
              </p>
              <button
                type="submit"
                disabled={!selectedCell || !newWord.trim()}
                className="w-full py-2 bg-[#D8B66C] text-[#291923] font-bold rounded-sm hover:bg-[#E5C982] disabled:opacity-40"
              >
                Adicionar
              </button>
              {error && <p className="text-xs text-red-400 text-center">{error}</p>}
            </form>
          )}

          {/* Lista de palavras */}
          <div className="bg-[#291923] border border-[#D8B66C]/40 rounded-lg p-3">
            <h3 className="text-xs text-[#F3EBDD]/60 uppercase tracking-widest mb-2">As tuas palavras</h3>
            <div className="flex flex-wrap gap-1">
              {words.map((w, i) => (
                <span key={i} className="text-xs px-2 py-1 bg-[#412734] text-[#E5C982] rounded">{w}</span>
              ))}
              {words.length === 0 && <p className="text-xs text-[#F3EBDD]/30">Nenhuma ainda.</p>}
            </div>
          </div>

          {/* Botões de ação */}
          {!finished && (
            <div className="space-y-2">
              <button
                onClick={handleRemoveLast}
                disabled={words.length === 0}
                className="w-full py-2 bg-[#412734] text-[#F3EBDD] border border-[#D8B66C]/50 rounded-sm hover:bg-[#291923] disabled:opacity-40"
              >
                ↩ Remover última
              </button>
              <button
                onClick={handleFinish}
                className="w-full py-2 bg-green-700 text-white font-bold rounded-sm hover:bg-green-600"
              >
                ✅ TERMINAR
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}