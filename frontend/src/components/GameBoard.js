import React, { useState } from 'react';

export default function GameBoard({ playerState, onOpenHelp, phaseIntro, isEvaluation, onReady, onEvaluation, onEndMission }) {
  const isTraitor = playerState.role === 'traitor';
  const [selectedRating, setSelectedRating] = useState(0);
  
  // Estado para controlar a abertura/fecho da barra lateral
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  // Cálculo do cofre pessoal (se não vierem barras do servidor, estimamos: 5 moedas = 1 barra)
  const personalBars = playerState.bars || Math.floor((playerState.gold || 0) / 5);
  const personalCoins = playerState.gold % 5;

  // Se estiver na avaliação (após o fim da missão)
  if (isEvaluation) {
    return (
      <div className="w-full max-w-6xl mx-auto p-4 text-center">
        <h2 className="font-display text-3xl text-[#E5C982] mb-6">MISSÃO TERMINADA</h2>
        <p className="text-[#F3EBDD] text-lg mb-10">A missão terminou. Todos devem avaliar esta missão.</p>
        
        {/* Avaliação para o Traidor */}
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
                <button
                  key={star}
                  onClick={() => setSelectedRating(star)}
                  className={`text-5xl transition ${selectedRating >= star ? 'text-[#D8B66C]' : 'text-[#F3EBDD]/30'}`}
                >
                  ★
                </button>
              ))}
            </div>
            <button
              onClick={() => onEvaluation({ type: 'faithful_rating', value: selectedRating })}
              disabled={selectedRating === 0}
              className="px-8 py-3 bg-[#D8B66C] text-[#291923] font-bold rounded-sm disabled:opacity-50"
            >
              Confirmar Avaliação
            </button>
          </div>
        )}
      </div>
    );
  }

  // Se houver uma Introdução de Fase (Ex: Missão I), mostrar o modal
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

        {/* Aviso secreto para o traidor APENAS na introdução da missão */}
        {isTraitor && phaseIntro.secretMission && (
          <div className="bg-red-900/30 border border-red-500 rounded p-4 mb-8">
            <p className="text-red-400 font-bold mb-2">🤫 TAREFA SECRETA DO TRAIDOR</p>
            <p className="text-[#F3EBDD]">{phaseIntro.secretMission}</p>
          </div>
        )}

        <button
          onClick={onReady}
          className="px-10 py-4 bg-[#D8B66C] text-[#291923] font-bold text-xl rounded-sm hover:bg-[#E5C982] transition shadow-soft"
        >
          INICIAR FASE
        </button>
        <p className="text-xs text-[#F3EBDD]/60 mt-4">Aguarda que todos os jogadores estejam prontos...</p>
        
        <button onClick={() => onOpenHelp(0)} className="absolute top-4 right-4 text-[#E5C982] font-bold">?</button>
      </div>
    );
  }

  // Caso normal: mostrar o tabuleiro
  return (
    <div className="w-full max-w-6xl mx-auto p-4 relative">
      
      <button onClick={() => onOpenHelp(0)} className="absolute top-0 right-4 text-3xl text-[#E5C982] hover:text-[#F3EBDD] font-display font-bold transition z-20" title="Ajuda">?</button>

      <div className="flex flex-col md:flex-row gap-8">
        
        {/* Área Principal (70%) - Missão */}
        <div className="flex-1 bg-[#291923] border border-[#D8B66C] p-8 rounded-md shadow-soft relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-[#D8B66C] to-transparent"></div>
          
          <div className="text-center mb-8">
            <h2 className="font-display text-3xl font-bold mb-2 text-[#E5C982] tracking-widest">
              {playerState.phase === 'PHASE_2_BANISHMENT' ? 'FASE II' : playerState.phase === 'PHASE_3_ARMOURY' ? 'FASE III' : playerState.phase === 'PHASE_4_MURDER' ? 'FASE IV' : 'FASE I'}
            </h2>
            <p className="text-[#F3EBDD] text-sm uppercase tracking-[0.2em]">
              {playerState.currentMission.title}
            </p>
            <div className="w-16 h-px bg-[#D8B66C] mx-auto my-4"></div>
            <p className="text-[#F3EBDD]/60 text-sm">Tempo restante: {playerState.timer || 0}s</p>
          </div>

          {/* Conteúdo da Missão */}
          <div className="space-y-4">
            <p className="text-[#F3EBDD] font-display text-lg">Ordena os países por população (do maior para o menor):</p>
            {playerState.currentMission.items.map((item, index) => (
              <div key={item.id} className="bg-[#412734]/60 border border-[#D8B66C]/30 p-4 rounded-sm flex justify-between items-center hover:border-[#D8B66C] transition cursor-grab">
                <div className="flex items-center gap-4">
                  <span className="text-[#D8B66C] font-bold w-6 text-center">{index + 1}.</span>
                  <span className="text-[#F3EBDD] font-medium">{item.name}</span>
                </div>
                <span className="text-xs text-[#F3EBDD]/50 tracking-widest">Mover</span>
              </div>
            ))}
            
            {/* Botão para terminar a missão */}
            <button 
              onClick={onEndMission}
              className="mt-8 w-full py-4 bg-[#D8B66C] text-[#291923] font-display font-bold text-xl rounded-sm hover:bg-[#E5C982] transition shadow-soft"
            >
              CONCLUIR MISSÃO
            </button>
          </div>
        </div>

        {/* Barra Lateral (30%) - Minimizável */}
        <div className="w-full md:w-1/3">
          
          <button 
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            className="w-full mb-4 py-2 bg-[#412734] border border-[#D8B66C]/50 text-[#F3EBDD] font-bold text-sm uppercase tracking-widest rounded-sm hover:bg-[#291923] transition"
          >
            {isSidebarOpen ? '► Recolher Painéis' : '◄ Expandir Painéis'}
          </button>

          {isSidebarOpen && (
            <div className="space-y-6">
              
              {/* O MEU COFRE (Individual) */}
              <div className="bg-[#291923] border border-[#D8B66C] p-6 rounded-md text-center relative">
                <h3 className="font-display text-xl font-bold text-[#E5C982] mb-4">O MEU COFRE</h3>
                <div className="flex justify-center items-center gap-6">
                  <div className="text-center">
                    <div className="text-3xl text-[#D8B66C] mb-1">◈</div>
                    <div className="text-2xl font-bold text-[#F3EBDD]">{personalCoins}</div>
                    <div className="text-xs text-[#F3EBDD]/60 uppercase tracking-widest">Moedas</div>
                  </div>
                  <div className="w-px h-12 bg-[#D8B66C]/30"></div>
                  <div className="text-center">
                    <div className="text-3xl text-[#D8B66C] mb-1">▣</div>
                    <div className="text-2xl font-bold text-[#F3EBDD]">{personalBars}</div>
                    <div className="text-xs text-[#F3EBDD]/60 uppercase tracking-widest">Barras</div>
                  </div>
                </div>
              </div>

              {/* OS JOGADORES (Com totais individuais) */}
              <div className="bg-[#291923] border border-[#D8B66C] p-6 rounded-md">
                <h3 className="font-display text-xl font-bold text-[#E5C982] mb-4">OS JOGADORES</h3>
                <ul className="space-y-3">
                  {playerState.players.map((player) => (
                    <li key={player.id} className="bg-[#412734]/60 border border-[#D8B66C]/20 p-3 rounded-sm flex justify-between items-center">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full border border-[#D8B66C] flex items-center justify-center text-[#D8B66C] font-display text-xs">
                          {player.name.charAt(0).toUpperCase()}
                        </div>
                        <span className="text-[#F3EBDD]">{player.name}</span>
                      </div>
                      <div className="flex flex-col items-end">
                        <span className="text-[#E5C982] text-xs font-bold tracking-widest">VIVO</span>
                        <span className="text-[#F3EBDD]/60 text-xs">💰 {player.gold} | ▣ {player.bars || 0}</span>
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