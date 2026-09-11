import React, { useState } from 'react';

export default function MissionNumberInput({ 
  onMissionValueSubmit,
  playerState,
  socket,
  roomData 
}) {
  const [missionValue, setMissionValue] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');

  const mission = playerState?.currentMission;

  const handleSubmit = () => {
    // Validação
    if (missionValue === '' || missionValue === null || missionValue === undefined) {
      setError('Introduz um número antes de submeter.');
      setTimeout(() => setError(''), 2500);
      return;
    }

    const numericValue = parseInt(missionValue, 10);
    if (isNaN(numericValue) || numericValue < 0) {
      setError('Introduz um número válido (0 ou maior).');
      setTimeout(() => setError(''), 2500);
      return;
    }

    // Tentar usar o handler passado por prop
    if (typeof onMissionValueSubmit === 'function') {
      onMissionValueSubmit(numericValue);
      setSubmitted(true);
      return;
    }

    // Fallback: emitir diretamente via socket
    if (socket && roomData?.roomCode) {
      socket.emit('submit_mission_value', {
        roomCode: roomData.roomCode,
        value: numericValue,
      });
      setSubmitted(true);
      return;
    }

    setError('Erro de comunicação. Tenta novamente.');
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSubmit();
    }
  };

  if (submitted) {
    return (
      <div className="text-center">
        <div className="bg-[#291923] border-2 border-[#D8B66C] rounded-lg p-6">
          <p className="text-2xl text-[#E5C982] mb-2">✅ Valor submetido!</p>
          <p className="text-sm text-[#F3EBDD]/60">
            A aguardar os outros jogadores...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="text-center">
      <p className="text-white mb-4 text-lg">
        {mission?.prompt || 'Quantos passes conseguiram?'}
      </p>

      <input
        type="number"
        min="0"
        value={missionValue}
        onChange={(e) => setMissionValue(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="0"
        autoFocus
        className="
          w-32 px-4 py-3
          bg-[#291923]
          border-2 border-[#D8B66C]
          text-white text-center text-2xl font-bold
          rounded-sm
          focus:outline-none focus:border-[#E5C982]
        "
      />

      <br />

      <button
        onClick={handleSubmit}
        disabled={missionValue === ''}
        className="
          mt-4 px-8 py-3
          bg-[#D8B66C] text-[#291923]
          font-bold text-lg
          rounded-sm
          hover:bg-[#E5C982]
          transition
          disabled:opacity-40 disabled:cursor-not-allowed
        "
      >
        Submeter Valor e Terminar
      </button>

      {error && (
        <p className="mt-3 text-red-400 text-sm font-bold">{error}</p>
      )}

      <p className="mt-4 text-xs text-[#F3EBDD]/50">
        Dica: prime <kbd className="px-1 bg-[#412734] rounded">Enter</kbd> para submeter
      </p>
    </div>
  );
}