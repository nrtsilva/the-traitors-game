import React, { useState } from 'react';

export default function ArsenalTimeGuess({ playerState, socket, roomData, onArsenalResultSubmit }) {
  const [guessTime, setGuessTime] = useState('');
  const [plankSeconds, setPlankSeconds] = useState(0);
  const [isPlankRunning, setIsPlankRunning] = useState(false);
  const task = playerState.arsenalTask;

  // O useEffect para o cronómetro está agora no GameBoard (topo) ou pode ser movido para aqui,
  // mas como a regra dos hooks exige que esteja no topo do componente, e este componente é
  // condicional (só renderizado quando task.type === 'TIME_GUESS'), podemos colocar o useEffect
  // aqui, desde que seja chamado sempre que o componente é renderizado (e não dentro de condições).
  // Vou colocar aqui para manter a lógica local.

  React.useEffect(() => {
    if (isPlankRunning) {
      const interval = setInterval(() => {
        setPlankSeconds(prev => prev + 1);
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [isPlankRunning]);

  const handleStopPlank = () => {
    setIsPlankRunning(false);
    if (socket && roomData) {
      socket.emit('stop_plank', { roomCode: roomData.roomCode, elapsedTime: plankSeconds });
    }
  };

  const handleSubmitTime = () => {
    onArsenalResultSubmit({ type: 'TIME_GUESS', guessTime: parseInt(guessTime) });
  };

  return (
    <div className="text-center">
      <h1 className="text-5xl font-bold text-[#E5C982] mb-8">O ARSENAL</h1>

      <div className="bg-[#291923] border-2 border-[#D8B66C] rounded-lg p-6 mb-6">
        <h2 className="text-2xl font-bold text-white mb-2">{task.title}</h2>
        <p className="text-[#F3EBDD] mb-4">{task.description}</p>
      </div>

      <div className="mb-6">
        <p className="text-white mb-4">Quanto tempo (em segundos) achas que dura a prancha?</p>
        <input
          type="number"
          value={guessTime}
          onChange={(e) => setGuessTime(e.target.value)}
          className="w-32 px-4 py-2 bg-[#291923] border border-[#D8B66C] text-white text-center rounded-sm mb-4"
        />
        <br />
        <button onClick={handleSubmitTime} className="px-8 py-2 bg-[#D8B66C] text-[#291923] font-bold rounded-sm">
          Submeter Estimativa
        </button>
      </div>

      {/* Cronómetro */}
      <div className="mt-6 border-t border-[#D8B66C]/30 pt-6">
        <p className="text-white mb-4">⏱️ Cronómetro da Prancha</p>
        <div className="text-6xl font-display text-[#D8B66C] mb-4">{plankSeconds}s</div>
        <div className="flex justify-center gap-4">
          <button
            onClick={() => setIsPlankRunning(true)}
            disabled={isPlankRunning}
            className="px-8 py-2 bg-[#291923] text-white border border-[#D8B66C] rounded-sm disabled:opacity-50"
          >
            Iniciar Prancha
          </button>
          <button
            onClick={handleStopPlank}
            disabled={!isPlankRunning}
            className="px-8 py-2 bg-[#D8B66C] text-[#291923] font-bold rounded-sm disabled:opacity-50"
          >
            Parar Prancha
          </button>
        </div>
        <p className="text-xs text-white/60 mt-2">Qualquer jogador pode parar o cronómetro.</p>
      </div>

      <p className="text-xs text-white/60 mt-4">Aguarda que todos os jogadores submetam os resultados...</p>
    </div>
  );
}