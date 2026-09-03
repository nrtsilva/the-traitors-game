import React, { useState, useEffect } from 'react';

export default function GameBoard({ playerState, onOpenHelp, phaseIntro, isEvaluation, onReady, onEvaluation, onVote, onArsenalAction, banishmentReveal, arsenalResult, playerId, onEndMission }) {
  const isTraitor = playerState.role === 'traitor';
  const [selectedRating, setSelectedRating] = useState(0);
  const [selectedVote, setSelectedVote] = useState(null);
  const [useDagger, setUseDagger] = useState(false);
  const [arsenalNumber, setArsenalNumber] = useState(1);
  const [timer, setTimer] = useState(0);

  // Atualizar Timer
  useEffect(() => {
    if (playerState.timer && playerState.timer > 0) {
      setTimer(playerState.timer);
      const interval = setInterval(() => {
        setTimer(prev => {
          if (prev <= 1) { clearInterval(interval); return 0; }
          return prev - 1;
        });
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [playerState.timer]);

  // 1. REVELAÇÃO DA EXPULSÃO
  if (banishmentReveal) {
    return (
      <div className="text-center">
        <h1 className="text-5xl font-bold mb-8 text-white">{banishmentReveal.banishedName} foi expulso!</h1>
        <p className="text-xl">Perdeu {banishmentReveal.lostGold} moedas.</p>
      </div>
    );
  }

  // 1.5 RESULTADO DO ARSENAL
  if (arsenalResult) {
    return (
      <div className="text-center">
        <h1 className="text-5xl font-bold text-[#E5C982] mb-8">RESULTADO DO ARSENAL</h1>
        <p className="text-2xl mb-4">
          Vencedor: <span className="font-bold text-white">{arsenalResult.winnerName}</span>
        </p>
        <p className="text-xl mb-8">
          Prémio: <span className="font-bold text-[#D8B66C]">{arsenalResult.reward}</span>
        </p>
        <p className="text-white/60 text-sm">A preparar a noite...</p>
      </div>
    );
  }

  // 2. INTRODUÇÃO DE FASE
  if (phaseIntro) {
    return (
      // ... (manter como está, mas remover o timer daqui) ...
      <div className="text-center">
        <h1 className="text-4xl font-bold text-[#E5C982] mb-4">{phaseIntro.title}</h1>
        <p className="text-xl mb-8">{phaseIntro.description}</p>
        {isTraitor && phaseIntro.secretMission && <p className="text-red-400 mb-8">TAREFA SECRETA: {phaseIntro.secretMission}</p>}
        <button onClick={onReady} className="px-10 py-4 bg-[#D8B66C] text-[#291923] font-bold text-xl rounded-sm">INICIAR FASE</button>
      </div>
    );
  }

  // 3. ARSENAL (Mini-jogo Individual)
  if (playerState.phase === 'PHASE_3_ARMOURY') {
    return (
      <div className="text-center">
        <h1 className="text-5xl font-bold text-[#E5C982] mb-8">O ARSENAL</h1>
        <p className="text-xl mb-6">Escolhe um número de 1 a 6. O maior número único vence e ganha o prémio!</p>
        
        <div className="flex justify-center gap-4 mb-8">
          {[1, 2, 3, 4, 5, 6].map(num => (
            <button 
              key={num} 
              onClick={() => setArsenalNumber(num)}
              className={`w-16 h-16 rounded-full text-2xl font-bold border-2 ${arsenalNumber === num ? 'bg-[#D8B66C] text-[#291923] border-white' : 'bg-[#412734] text-white border-[#D8B66C]/30'}`}
            >
              {num}
            </button>
          ))}
        </div>

        <button onClick={() => onArsenalAction(arsenalNumber)} className="px-10 py-4 bg-[#D8B66C] text-[#291923] font-bold text-xl rounded-sm">
          CONFIRMAR NÚMERO
        </button>
      </div>
    );
  }

  // 4. FASE DE VOTAÇÃO (Expulsão com Dagger)
  if (playerState.phase === 'PHASE_2_BANISHMENT') {
    const votablePlayers = playerState.players.filter(p => p.id !== playerId && p.alive);
    const hasDagger = playerState.inventory && playerState.inventory.includes('dagger');

    return (
      <div className="text-center">
        <h1 className="text-4xl font-bold text-[#E5C982] mb-2">A EXPULSÃO</h1>
        <div className="text-6xl font-bold text-[#D8B66C] mb-4">{timer}</div>
        <p className="text-sm mb-8">Tempo restante para votar</p>

        <div className="space-y-4 mb-6">
          {votablePlayers.map(player => (
            <div 
              key={player.id} 
              onClick={() => setSelectedVote(player.id)}
              className={`bg-[#291923] border-2 p-4 cursor-pointer transition ${selectedVote === player.id ? 'border-[#D8B66C] bg-[#412734]' : 'border-[#D8B66C]/30'}`}
            >
              <span className="text-xl text-white font-bold">{player.name}</span>
            </div>
          ))}
        </div>

        {hasDagger && (
          <div className="mb-6">
            <label className="text-[#E5C982]">Usar Adaga (2 Votos): </label>
            <input type="checkbox" checked={useDagger} onChange={(e) => setUseDagger(e.target.checked)} className="w-5 h-5" />
          </div>
        )}

        <button 
          onClick={() => onVote(selectedVote, useDagger)}
          disabled={!selectedVote}
          className="px-10 py-4 bg-[#D8B66C] text-[#291923] font-bold text-xl rounded-sm disabled:opacity-50"
        >
          CONFIRMAR VOTO
        </button>
      </div>
    );
  }

  // 5. TABULEIRO NORMAL (Missão)
  return (
    <div className="relative">
      <button onClick={() => onOpenHelp(0)} className="absolute top-0 right-4 text-3xl text-[#E5C982]">?</button>

      {/* TIMER EM DESTAQUE */}
      <div className="text-center mb-8">
        <div className="inline-block bg-[#D8B66C] text-[#291923] font-display text-5xl font-bold px-10 py-4 rounded-lg shadow-soft">
          {timer}s
        </div>
        <p className="text-white mt-2">Tempo restante</p>
      </div>

      {/* Missão */}
      <div className="bg-[#291923] border border-[#D8B66C] p-8 rounded-md">
        <h2 className="font-display text-3xl font-bold text-[#E5C982] mb-4 text-center">{playerState.currentMission.title}</h2>
        <div className="space-y-4">
          {playerState.currentMission.items.map((item, index) => (
            <div key={item.id} className="bg-[#412734]/60 border border-[#D8B66C]/30 p-4 rounded-sm">
              <span className="text-white">{index + 1}. {item.name}</span>
            </div>
          ))}
        </div>
        <button onClick={onEndMission} className="mt-8 w-full py-4 bg-[#D8B66C] text-[#291923] font-display font-bold text-xl rounded-sm">
          CONCLUIR MISSÃO
        </button>
        <p className="text-xs text-white/60 mt-2 text-center">Todos os jogadores vivos têm de concordar.</p>
      </div>
    </div>
  );
}