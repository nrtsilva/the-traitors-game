import React, { useState, useEffect } from 'react';

export default function GameBoard({ playerState, onOpenHelp, phaseIntro, isEvaluation, onReady, onEvaluation, onVote, onArsenalAction, banishmentReveal, arsenalResult, playerId, onEndMission }) {
  const isTraitor = playerState.role === 'traitor';
  const [selectedRating, setSelectedRating] = useState(0);
  const [selectedVote, setSelectedVote] = useState(null);
  const [useDagger, setUseDagger] = useState(false);
  const [arsenalNumber, setArsenalNumber] = useState(1);
  const [timer, setTimer] = useState(0);

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
    const { isTie, banishedName, lostGold } = banishmentReveal;

    return (
      <div className="fixed inset-0 bg-black/90 flex items-center justify-center z-50">
        <div className="text-center animate-pulse">
          {/* Efeito de "tocha" ou brilho */}
          <div className="w-40 h-40 mx-auto mb-8 rounded-full bg-[#D8B66C]/20 blur-3xl"></div>
          
          {isTie ? (
            <>
              <h1 className="text-6xl font-display font-bold mb-6 text-[#E5C982]">EMPATE</h1>
              <p className="text-3xl text-white mb-4">NINGUÉM FOI EXPULSO</p>
              <p className="text-xl text-white/70 mb-8">Todos os jogadores empatados perderam <span className="font-bold text-[#D8B66C]">1 moeda</span>.</p>
            </>
          ) : (
            <>
              <h1 className="text-6xl font-display font-bold mb-6 text-[#E5C982]">EXPULSÃO</h1>
              <p className="text-4xl text-red-400 font-bold mb-4">{banishedName} FOI EXPULSO</p>
              <p className="text-xl text-white/70 mb-8">Perdeu <span className="font-bold text-[#D8B66C]">{lostGold} moedas</span>.</p>
            </>
          )}

          {/* Indicador de progresso para o Arsenal */}
          <p className="text-lg text-[#D8B66C] mt-12 animate-bounce">A preparar o Arsenal...</p>
        </div>
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
      <div className="text-center">
        <h1 className="text-4xl font-bold text-[#E5C982] mb-4">{phaseIntro.title}</h1>
        <p className="text-xl mb-8">{phaseIntro.description}</p>
        {isTraitor && phaseIntro.secretMission && <p className="text-red-400 mb-8">TAREFA SECRETA: {phaseIntro.secretMission}</p>}
        <button onClick={onReady} className="px-10 py-4 bg-[#D8B66C] text-[#291923] font-bold text-xl rounded-sm">INICIAR FASE</button>
      </div>
    );
  }

  // 3. AVALIAÇÃO DA MISSÃO (Fiéis dão estrelas, Traidor confirma)
  if (isEvaluation) {
    return (
      <div className="w-full max-w-6xl mx-auto p-4 text-center">
        <h2 className="font-display text-3xl text-[#E5C982] mb-6">MISSÃO TERMINADA</h2>
        <p className="text-[#F3EBDD] text-lg mb-10">A missão terminou. Todos devem avaliar esta missão.</p>
        
        {isTraitor ? (
          <div className="mb-8">
            <h3 className="text-2xl text-red-400 mb-4">Completaste a tua missão secreta?</h3>
            <div className="flex justify-center gap-4">
              <button onClick={() => onEvaluation({ type: 'traitor_answer', value: true })} className="px-8 py-4 bg-[#D8B66C] text-[#291923] font-bold rounded-sm">Sim, completei</button>
              <button onClick={() => onEvaluation({ type: 'traitor_answer', value: false })} className="px-8 py-4 bg-[#291923] text-[#F3EBDD] border border-[#D8B66C] rounded-sm">Não, falhei</button>
            </div>
          </div>
        ) : (
          <div className="mb-8">
            <h3 className="text-2xl text-[#F3EBDD] mb-4">Avalia a missão (1 a 5 estrelas)</h3>
            <div className="flex justify-center gap-2 mb-6">
              {[1, 2, 3, 4, 5].map((star) => (
                <button key={star} onClick={() => setSelectedRating(star)} className={`text-5xl transition ${selectedRating >= star ? 'text-[#D8B66C]' : 'text-[#F3EBDD]/30'}`}>★</button>
              ))}
            </div>
            <button onClick={() => onEvaluation({ type: 'faithful_rating', value: selectedRating })} disabled={selectedRating === 0} className="px-8 py-3 bg-[#D8B66C] text-[#291923] font-bold rounded-sm disabled:opacity-50">Confirmar Avaliação</button>
          </div>
        )}
      </div>
    );
  }

  // 4. ARSENAL (Mini-jogo Individual)
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

  // 5. FASE DE VOTAÇÃO (Expulsão com Dagger)
  if (playerState.phase === 'PHASE_2_BANISHMENT') {
    const votablePlayers = playerState.players.filter(p => p.id !== playerId && p.alive);
    const hasDagger = playerState.inventory && playerState.inventory.includes('dagger');

    return (
      <div className="flex flex-col items-center justify-center min-h-[70vh] relative overflow-hidden">
        {/* Efeito de fundo místico */}
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-[#D8B66C]/10 rounded-full blur-3xl pointer-events-none"></div>
        
        <div className="relative z-10 text-center">
          <h1 className="font-display text-5xl font-bold text-[#E5C982] mb-4 tracking-widest">A EXPULSÃO</h1>
          <p className="text-[#F3EBDD] text-xl mb-8">Quem será o traidor? A decisão está nas tuas mãos.</p>
          
          <div className="mb-8">
            <div className="text-7xl font-bold text-[#D8B66C] font-display drop-shadow-lg">{timer}</div>
            <p className="text-sm text-[#F3EBDD]/60 uppercase tracking-widest mt-2">Tempo restante</p>
          </div>

          <div className="space-y-4 mb-8 max-w-md mx-auto">
            {votablePlayers.map(player => (
              <div 
                key={player.id} 
                onClick={() => setSelectedVote(player.id)}
                className={`bg-[#291923] border-2 p-5 rounded-lg cursor-pointer transition-all duration-300 ${selectedVote === player.id ? 'border-[#D8B66C] bg-[#412734] scale-105 shadow-lg' : 'border-[#D8B66C]/30 hover:border-[#D8B66C] hover:bg-[#291923]/80'}`}
              >
                <span className="text-2xl text-white font-bold">{player.name}</span>
              </div>
            ))}
          </div>

          {hasDagger && (
            <div className="mb-6 flex items-center justify-center gap-3 text-[#E5C982]">
              <span className="text-lg">Usar Adaga (2 Votos):</span>
              <input type="checkbox" checked={useDagger} onChange={(e) => setUseDagger(e.target.checked)} className="w-6 h-6 accent-[#D8B66C] cursor-pointer" />
            </div>
          )}

          <button 
            onClick={() => onVote(selectedVote, useDagger)}
            disabled={!selectedVote}
            className="px-12 py-4 bg-[#D8B66C] text-[#291923] font-bold text-2xl rounded-lg shadow-soft hover:bg-[#E5C982] transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            CONFIRMAR VOTO
          </button>
        </div>
      </div>
    );
  }

  // 6. TABULEIRO NORMAL (Missão)
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