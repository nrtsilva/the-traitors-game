import React from 'react';

export default function GameBoard({ playerState }) {
  const isTraitor = playerState.role === 'traitor';
  const isRoundEnd = playerState.phase === 'END_GAME';

  return (
    <div className="w-full max-w-6xl mx-auto p-4">
      <div className="flex flex-col md:flex-row gap-8">
        
        {/* Área Principal (70%) */}
        <div className="flex-1 bg-[#291923] border border-[#D8B66C] p-8 rounded-md shadow-soft relative overflow-hidden">
          
          {/* Ornamento Superior */}
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-[#D8B66C] to-transparent"></div>

          <div className="text-center mb-8">
            <h2 className="font-display text-3xl font-bold mb-2 text-[#E5C982] tracking-widest">FASE I</h2>
            <p className="text-[#F3EBDD] text-sm uppercase tracking-[0.2em]">
              {playerState.currentMission.title}
            </p>
            <div className="w-16 h-px bg-[#D8B66C] mx-auto my-4"></div>
            <p className="text-[#F3EBDD]/60 text-sm">Tempo: {playerState.currentMission.timeLimit} segundos</p>
          </div>

          {/* Exemplo de Mini-Jogo: Ranking (Lista de Países) */}
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
          </div>

          {/* Botão para confirmar */}
          <button className="mt-8 w-full py-4 bg-[#D8B66C] text-[#291923] font-display font-bold text-xl rounded-sm hover:bg-[#E5C982] transition shadow-soft">
            CONFIRMAR DECISÃO
          </button>

        </div>

        {/* Barra Lateral (30%) */}
        <div className="w-full md:w-1/3 space-y-6">
          
          {/* Cofre */}
          <div className="bg-[#291923] border border-[#D8B66C] p-6 rounded-md text-center relative">
            <h3 className="font-display text-xl font-bold text-[#E5C982] mb-4">O COFRE</h3>
            <div className="flex justify-center items-center gap-6">
              <div className="text-center">
                <div className="text-3xl text-[#D8B66C] mb-1">◈</div>
                <div className="text-2xl font-bold text-[#F3EBDD]">{playerState.prizeFund.coins}</div>
                <div className="text-xs text-[#F3EBDD]/60 uppercase tracking-widest">Moedas</div>
              </div>
              <div className="w-px h-12 bg-[#D8B66C]/30"></div>
              <div className="text-center">
                <div className="text-3xl text-[#D8B66C] mb-1">▣</div>
                <div className="text-2xl font-bold text-[#F3EBDD]">{playerState.prizeFund.bars}</div>
                <div className="text-xs text-[#F3EBDD]/60 uppercase tracking-widest">Barras</div>
              </div>
            </div>
          </div>

          {/* Jogadores Vivos (Dossiers) */}
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
                  {player.alive ? (
                    <span className="text-[#E5C982] text-xs font-bold tracking-widest">VIVO</span>
                  ) : (
                    <span className="text-[#F3EBDD]/40 text-xs font-bold tracking-widest">ELIMINADO</span>
                  )}
                </li>
              ))}
            </ul>
          </div>

          {/* Painel Secreto do Traidor */}
          {isTraitor && (
            <div className="bg-[#291923] border-2 border-[#D8B66C] p-6 rounded-md relative overflow-hidden shadow-soft">
              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-[#D8B66C] to-transparent"></div>
              <h3 className="font-display text-xl font-bold text-[#E5C982] mb-4 flex items-center gap-2">
                <span className="w-2 h-2 bg-[#E5C982] rounded-full"></span> MISSÃO SECRETA
              </h3>
              <ul className="space-y-3">
                {playerState.secretMissions.map((mission, index) => (
                  <li key={index} className="flex items-start gap-3">
                    <input type="checkbox" className="mt-1 w-4 h-4 accent-[#D8B66C]" />
                    <span className="text-[#F3EBDD] text-sm italic">{mission}</span>
                  </li>
                ))}
              </ul>
              <p className="text-xs text-[#F3EBDD]/50 mt-4 font-mono tracking-widest">CLASSIFICADO</p>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}