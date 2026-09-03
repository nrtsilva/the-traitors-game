import React, { useState, useEffect } from 'react';

export default function GameBoard({ playerState, onOpenHelp, phaseIntro, isEvaluation, onReady, onEvaluation, onVote, banishmentReveal, playerId, onEndMission }) {
  const isTraitor = playerState.role === 'traitor';
  const [selectedRating, setSelectedRating] = useState(0);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [selectedVote, setSelectedVote] = useState(null);
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

  // PRIORIDADE 1: REVELAÇÃO DA EXPULSÃO
  if (banishmentReveal) {
    return (
      <div className="w-full max-w-2xl mx-auto p-8 bg-[#291923] border-2 border-[#D8B66C] rounded-lg shadow-soft text-center relative">
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-[#D8B66C] to-transparent"></div>
        <h2 className="font-display text-4xl text-[#E5C982] mb-6">{banishmentReveal.title}</h2>
        
        {banishmentReveal.banishedName ? (
          <div className="mb-6">
            <p className="text-2xl text-white mb-2">O jogador <span className="font-bold text-red-400">{banishmentReveal.banishedName}</span> foi expulso!</p>
            <p className="text-[#F3EBDD]/70">Consequências: Perdeu <span className="font-bold text-[#D8B66C]">{banishmentReveal.lostGold} moedas</span></p>
          </div>
        ) : (
          <p className="text-2xl text-white mb-6">Ninguém foi expulso (Empate)</p>
        )}
        
        <button onClick={() => window.location.reload()} className="px-10 py-4 bg-[#D8B66C] text-[#291923] font-bold text-xl rounded-sm hover:bg-[#E5C982] transition shadow-soft">AVANÇAR PARA O ARSENAL</button>
      </div>
    );
  }

  // PRIORIDADE 2: INTRODUÇÃO DE FASE (Ex: "A Expulsão")
  if (phaseIntro) {
    return (
      <div className="w-full max-w-2xl mx-auto p-8 bg-[#291923] border-2 border-[#D8B66C] rounded-lg shadow-soft text-center relative">
        <div className="flex justify-center mb-4">
          <span className="bg-[#412734] border border-[#D8B66C]/30 text-[#F3EBDD] text-xs font-bold uppercase tracking-widest px-3 py-1 rounded-full">
            {phaseIntro.gameMode === 'in_person' ? '🏠 Missão Presencial' : '💻 Missão Remota'}
          </span>
        </div>
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-[#D8B66C] to-transparent"></div>
        
        <h2 className="font-display text-4xl text-[#E5C982] mb-4">{phaseIntro.title}</h2>
        <p className="text-[#F3EBDD] text-lg leading-relaxed mb-8">{phaseIntro.description}</p>

        {isTraitor && phaseIntro.secretMission && (
          <div className="bg-red-900/30 border border-red-500 rounded p-4 mb-8">
            <p className="text-red-400 font-bold mb-2">🤫 TAREFA SECRETA DO TRAIDOR</p>
            <ul className="list-disc pl-5 text-left text-[#F3EBDD]">
              <li className="mb-1">{phaseIntro.secretMission}</li>
              <li>Dizer 'Está difícil' 3 vezes</li>
            </ul>
          </div>
        )}

        <button onClick={onReady} className="px-10 py-4 bg-[#D8B66C] text-[#291923] font-bold text-xl rounded-sm hover:bg-[#E5C982] transition shadow-soft">INICIAR FASE</button>
        <p className="text-xs text-[#F3EBDD]/60 mt-4">Aguarda que todos os jogadores estejam prontos...</p>
        <button onClick={() => onOpenHelp(0)} className="absolute top-4 right-4 text-[#E5C982] font-bold">?</button>
      </div>
    );
  }

  // PRIORIDADE 3: AVALIAÇÃO (Só aparece se não houver intro nem revelação)
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

  // PRIORIDADE 4: FASE DE VOTAÇÃO (Expulsão)
  if (playerState.phase === 'PHASE_2_BANISHMENT') {
    const votablePlayers = playerState.players.filter(p => p.id !== playerId && p.alive);

    return (
      <div className="w-full max-w-3xl mx-auto p-6 text-center">
        <h2 className="font-display text-3xl text-[#E5C982] mb-2 tracking-widest">A EXPULSÃO</h2>
        <p className="text-[#F3EBDD] mb-6">Quem é o Traidor? Vota para expulsar!</p>
        
        <div className="mb-6 text-6xl font-bold text-[#D8B66C]">{timer}</div>
        <p className="text-sm text-[#F3EBDD]/60 mb-8">Tempo restante para votar</p>

        <div className="space-y-4">
          {votablePlayers.map((player) => (
            <div 
              key={player.id} 
              onClick={() => setSelectedVote(player.id)}
              className={`bg-[#291923] border-2 p-4 rounded-sm cursor-pointer transition ${selectedVote === player.id ? 'border-[#D8B66C] bg-[#412734]' : 'border-[#D8B66C]/30 hover:border-[#D8B66C]'}`}
            >
              <span className="text-xl text-[#F3EBDD] font-bold">{player.name}</span>
            </div>
          ))}
        </div>

        <button 
          onClick={() => onVote(selectedVote)}
          disabled={!selectedVote}
          className="mt-8 px-10 py-4 bg-[#D8B66C] text-[#291923] font-bold text-xl rounded-sm hover:bg-[#E5C982] transition shadow-soft disabled:opacity-50 disabled:cursor-not-allowed"
        >
          CONFIRMAR VOTO
        </button>
      </div>
    );
  }

  // PRIORIDADE 5: CASO NORMAL - TABULEIRO (Missão Ativa)
  return (
    <div className="w-full max-w-6xl mx-auto p-4 relative">
      <button onClick={() => onOpenHelp(0)} className="absolute top-0 right-4 text-3xl text-[#E5C982] hover:text-[#F3EBDD] font-display font-bold transition z-20" title="Ajuda">?</button>

      <div className="flex flex-col md:flex-row gap-8">
        <div className="flex-1 bg-[#291923] border border-[#D8B66C] p-8 rounded-md shadow-soft relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-[#D8B66C] to-transparent"></div>
          <div className="text-center mb-8">
            <h2 className="font-display text-3xl font-bold mb-2 text-[#E5C982] tracking-widest">FASE I</h2>
            <p className="text-[#F3EBDD] text-sm uppercase tracking-[0.2em]">{playerState.currentMission.title}</p>
            <div className="w-16 h-px bg-[#D8B66C] mx-auto my-4"></div>
            <p className="text-[#F3EBDD]/60 text-sm">Tempo restante: {playerState.timer || 0}s</p>
          </div>
          
          <div className="space-y-4">
            <p className="text-[#F3EBDD] font-display text-lg">Ordena os países por população (do maior para o menor):</p>
            {playerState.currentMission.items.map((item, index) => (
              <div key={item.id} className="bg-[#412734]/60 border border-[#D8B66C]/30 p-4 rounded-sm flex justify-between items-center">
                <span className="text-[#F3EBDD] font-medium">{index + 1}. {item.name}</span>
              </div>
            ))}
            <button onClick={onEndMission} className="mt-8 w-full py-4 bg-[#D8B66C] text-[#291923] font-display font-bold text-xl rounded-sm hover:bg-[#E5C982] transition shadow-soft">
              CONCLUIR MISSÃO
            </button>
            <p className="text-xs text-[#F3EBDD]/60 mt-2 text-center">Todos os jogadores vivos têm de concordar.</p>
          </div>
        </div>

        <div className="w-full md:w-1/3">
          <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} className="w-full mb-4 py-2 bg-[#412734] border border-[#D8B66C]/50 text-[#F3EBDD] font-bold text-sm uppercase tracking-widest rounded-sm hover:bg-[#291923] transition">
            {isSidebarOpen ? '► Recolher' : '◄ Expandir'}
          </button>
          {isSidebarOpen && (
            <div className="space-y-6">
              <div className="bg-[#291923] border border-[#D8B66C] p-6 rounded-md text-center">
                <h3 className="font-display text-xl font-bold text-[#E5C982] mb-4">O MEU COFRE</h3>
                <div className="flex justify-center gap-6">
                  <div className="text-center"><span className="text-3xl text-[#D8B66C]">◈</span><div className="text-2xl font-bold text-[#F3EBDD]">{playerState.gold || 0}</div><div className="text-xs text-[#F3EBDD]/60">Moedas</div></div>
                  <div className="text-center"><span className="text-3xl text-[#D8B66C]">▣</span><div className="text-2xl font-bold text-[#F3EBDD]">{playerState.bars || 0}</div><div className="text-xs text-[#F3EBDD]/60">Barras</div></div>
                </div>
              </div>
              <div className="bg-[#291923] border border-[#D8B66C] p-6 rounded-md">
                <h3 className="font-display text-xl font-bold text-[#E5C982] mb-4">OS JOGADORES</h3>
                <ul className="space-y-3">
                  {playerState.players.map((player) => (
                    <li key={player.id} className="bg-[#412734]/60 border border-[#D8B66C]/20 p-3 rounded-sm flex justify-between items-center">
                      <span className="text-[#F3EBDD]">{player.name}</span>
                      <div className="flex flex-col items-end">
                        <span className="text-[#E5C982] text-xs font-bold">VIVO</span>
                        <span className="text-[#F3EBDD]/60 text-xs">💰 {player.gold || 0} | ▣ {player.bars || 0}</span>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}