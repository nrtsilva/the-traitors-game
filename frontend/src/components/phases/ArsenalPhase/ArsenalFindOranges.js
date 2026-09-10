import React, { useState, useEffect } from 'react';

const CARD_EMOJI = { orange: '🍊', apple: '🍎', lemon: '🍋' };

export default function ArsenalFindOranges({ socket, roomData, playerId }) {
  const [gameStarted, setGameStarted] = useState(false);
  const [cards, setCards] = useState([]);
  const [target, setTarget] = useState(4);
  const [order, setOrder] = useState([]);
  const [direction, setDirection] = useState(1);
  const [currentPlayerId, setCurrentPlayerId] = useState(null);
  const [currentPlayerName, setCurrentPlayerName] = useState('');
  const [orangeCount, setOrangeCount] = useState(0);
  const [feedback, setFeedback] = useState(null);
  const [error, setError] = useState('');
  const [winnerInfo, setWinnerInfo] = useState(null);

  const isMyTurn = currentPlayerId === playerId;

  // Socket listeners
  useEffect(() => {
    if (!socket) return;

    const onStart = (data) => {
      setGameStarted(true);
      setTarget(data.target);
      setOrder(data.order);
      setCards(data.cards.map(c => ({ id: c.id, type: null, revealed: false })));
      setDirection(1);
      setCurrentPlayerId(null);
      setOrangeCount(0);
      setFeedback(null);
      setWinnerInfo(null);
    };

    const onTurn = (data) => {
      setCurrentPlayerId(data.currentPlayerId);
      setCurrentPlayerName(data.currentPlayerName);
      setDirection(data.direction);
      setOrangeCount(0);
      // Esconder todas as cartas
      setCards(prev => prev.map(c => ({ ...c, revealed: false })));
    };

    const onFlip = ({ cardId, type, orangeCount: newCount }) => {
      setCards(prev => prev.map(c => c.id === cardId ? { ...c, type, revealed: true } : c));
      setOrangeCount(newCount);
    };

    const onContinue = (data) => {
      setOrangeCount(data.orangeCount);
    };

    const onApple = (data) => {
      setFeedback({
        type: 'apple',
        message: `🍎 ${data.playerName} encontrou uma maçã! Perde a próxima vez.`,
      });
      setTimeout(() => setFeedback(null), 2500);
    };

    const onLemon = (data) => {
      setDirection(data.direction);
      setFeedback({
        type: 'lemon',
        message: `🍋 ${data.direction === 1 ? 'A ordem voltou ao normal!' : 'A ordem foi invertida!'}`,
      });
      setTimeout(() => setFeedback(null), 2500);
    };

    const onInvalid = (data) => {
      setError(data.message || 'Jogada inválida.');
      setTimeout(() => setError(''), 2500);
    };

    const onEnd = (data) => {
      setWinnerInfo(data);
    };

    socket.on('find_oranges_start', onStart);
    socket.on('find_oranges_turn', onTurn);
    socket.on('find_oranges_card_flipped', onFlip);
    socket.on('find_oranges_continue', onContinue);
    socket.on('find_oranges_apple', onApple);
    socket.on('find_oranges_lemon', onLemon);
    socket.on('find_oranges_invalid', onInvalid);
    socket.on('find_oranges_end', onEnd);

    return () => {
      socket.off('find_oranges_start', onStart);
      socket.off('find_oranges_turn', onTurn);
      socket.off('find_oranges_card_flipped', onFlip);
      socket.off('find_oranges_continue', onContinue);
      socket.off('find_oranges_apple', onApple);
      socket.off('find_oranges_lemon', onLemon);
      socket.off('find_oranges_invalid', onInvalid);
      socket.off('find_oranges_end', onEnd);
    };
  }, [socket]);

  const handleFlip = (cardId) => {
    if (!isMyTurn || !gameStarted) return;
    if (cards.find(c => c.id === cardId)?.revealed) return;
    socket.emit('find_oranges_flip', { roomCode: roomData.roomCode, cardId });
  };

  // ============ ECRÃ FINAL ============
  if (winnerInfo) {
    const isWinner = winnerInfo.winnerId === playerId;
    return (
      <div className="fixed inset-0 bg-black/90 flex items-center justify-center z-50">
        <div className="max-w-md w-full bg-[#291923] border-2 border-[#D8B66C] rounded-lg p-8 text-center">
          <div className="text-7xl mb-4">{isWinner ? '🏆' : '🍊'}</div>
          <h1 className="font-display text-3xl text-[#E5C982] mb-4">
            {isWinner ? 'Venceste!' : 'Fim do Jogo'}
          </h1>
          <p className="text-3xl text-[#D8B66C] font-bold my-6">
            🍊🍊🍊🍊
          </p>
          <p className="text-xl text-white mb-4">
            <strong>{winnerInfo.winnerName}</strong> encontrou 4 laranjas!
          </p>
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
        <h1 className="text-5xl font-bold text-[#E5C982] mb-8">ENCONTRA AS LARANJAS</h1>
        <p className="text-[#F3EBDD] animate-pulse">A embaralhar as cartas...</p>
      </div>
    );
  }

  // ============ ECRÃ DE JOGO ============
  // Determinar layout do grid (60 cartas → 10 colunas × 6 linhas)
  const cols = 10;

  return (
    <div className="text-center max-w-6xl mx-auto">
      <h1 className="text-3xl font-display font-bold text-[#E5C982] mb-2">🍊 ENCONTRA AS LARANJAS</h1>
      <p className="text-[#F3EBDD]/60 text-sm mb-4">
        Vira cartas até encontrares 4 laranjas na mesma jogada!
      </p>

      {/* Header: Jogador atual + Progresso + Direção */}
      <div className="flex justify-center items-center gap-6 mb-4 flex-wrap">
        <div className={`px-4 py-2 rounded-lg border-2 ${
          isMyTurn ? 'bg-[#D8B66C]/20 border-[#D8B66C] animate-pulse' : 'bg-[#291923] border-[#D8B66C]/30'
        }`}>
          <p className="text-xs text-[#F3EBDD]/60 uppercase tracking-widest">A jogar</p>
          <p className={`text-xl font-display font-bold ${isMyTurn ? 'text-[#E5C982]' : 'text-[#F3EBDD]'}`}>
            {currentPlayerName} {isMyTurn && '(TU)'}
          </p>
        </div>
        <div className="px-4 py-2 rounded-lg border-2 bg-[#291923] border-[#D8B66C]/30">
          <p className="text-xs text-[#F3EBDD]/60 uppercase tracking-widest">Direção</p>
          <p className="text-xl font-display font-bold text-[#E5C982]">
            {direction === 1 ? '→ Normal' : '← Invertida'}
          </p>
        </div>
        <div className="px-4 py-2 rounded-lg border-2 bg-[#291923] border-[#D8B66C]/30">
          <p className="text-xs text-[#F3EBDD]/60 uppercase tracking-widest">Laranjas</p>
          <div className="flex gap-1 justify-center items-center">
            {Array.from({ length: target }).map((_, i) => (
              <span key={i} className={`text-2xl ${i < orangeCount ? '' : 'opacity-20'}`}>
                🍊
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Ordem dos jogadores */}
      <div className="mb-4 flex justify-center flex-wrap gap-1">
        {order.map((p, i) => {
          const isCurrent = p.id === currentPlayerId;
          return (
            <span
              key={p.id}
              className={`px-2 py-1 rounded text-xs ${
                isCurrent
                  ? 'bg-[#D8B66C] text-[#291923] font-bold'
                  : 'bg-[#291923] text-[#F3EBDD]/60'
              }`}
            >
              {p.name}
            </span>
          );
        })}
      </div>

      {/* Feedback */}
      {feedback && (
        <div className={`mb-4 p-3 rounded-lg border-2 ${
          feedback.type === 'apple'
            ? 'bg-red-900/30 border-red-500 text-red-300'
            : 'bg-yellow-900/30 border-yellow-500 text-yellow-300'
        }`}>
          <p className="font-bold">{feedback.message}</p>
        </div>
      )}

      {error && (
        <div className="mb-4 p-3 bg-red-900/30 border-2 border-red-500 rounded-lg text-red-300">
          {error}
        </div>
      )}

      {/* Tabuleiro */}
      <div
        className="grid gap-1.5 mb-6 mx-auto"
        style={{
          gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))`,
          maxWidth: '800px',
        }}
      >
        {cards.map((card) => {
          const revealed = card.revealed;
          const canClick = isMyTurn && !revealed;
          return (
            <button
              key={card.id}
              onClick={() => handleFlip(card.id)}
              disabled={!canClick}
              className={`aspect-square rounded-md border-2 transition-all duration-200 text-2xl sm:text-3xl ${
                canClick ? 'hover:scale-105 cursor-pointer' : 'cursor-not-allowed'
              }`}
              style={{
                backgroundColor: revealed
                  ? card.type === 'orange' ? '#f59e0b30'
                  : card.type === 'apple' ? '#dc262630'
                  : '#ca8a0430'
                  : '#1a0f15',
                borderColor: revealed
                  ? card.type === 'orange' ? '#f59e0b'
                  : card.type === 'apple' ? '#dc2626'
                  : '#ca8a04'
                  : '#D8B66C40',
              }}
            >
              {revealed ? CARD_EMOJI[card.type] : '🎴'}
            </button>
          );
        })}
      </div>

      {/* Regras */}
      <div className="bg-[#291923]/70 border border-[#D8B66C]/30 rounded-lg p-4 text-left max-w-2xl mx-auto">
        <h3 className="text-xs text-[#F3EBDD]/60 uppercase tracking-widest mb-2">📜 Regras</h3>
        <ul className="text-sm text-[#F3EBDD]/80 space-y-1">
          <li>• 🍊 <strong>Laranja</strong> → continuas a jogar (4 = vitória)</li>
          <li>• 🍎 <strong>Maçã</strong> → terminas a jogada e perdes a próxima vez</li>
          <li>• 🍋 <strong>Limão</strong> → terminas a jogada e inverte a ordem</li>
          <li>• Só podes virar cartas no teu turno</li>
          <li>• As cartas ficam no mesmo sítio — usa a memória!</li>
        </ul>
      </div>
    </div>
  );
}