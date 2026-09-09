import React, { useState } from 'react';
import Chalkboard from '../Chalkboard';

export default function BanishmentVoteScreen({ playerState, onVote }) {
  const [selectedVote, setSelectedVote] = useState(null);
  const [useDagger, setUseDagger] = useState(false);
  const votablePlayers = playerState.players.filter(p => p.id !== playerState.playerId && p.alive);
  const hasDagger = playerState.inventory && playerState.inventory.includes('dagger');
  const timer = playerState.timer || 0;

  return (
    <div className="flex flex-col items-center justify-center min-h-[70vh] relative overflow-hidden">
      <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-[#D8B66C]/10 rounded-full blur-3xl pointer-events-none"></div>

      <div className="relative z-10 text-center">
        <h1 className="font-display text-5xl font-bold text-[#E5C982] mb-4 tracking-widest">MESA REDONDA</h1>
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
              className={`bg-[#291923] border-2 p-5 rounded-lg cursor-pointer transition-all duration-300 ${
                selectedVote === player.id
                  ? 'border-[#D8B66C] bg-[#412734] scale-105 shadow-lg'
                  : 'border-[#D8B66C]/30 hover:border-[#D8B66C] hover:bg-[#291923]/80'
              }`}
            >
              <span className="text-2xl text-white font-bold">{player.name}</span>
            </div>
          ))}
        </div>
        
        {selectedVote && (
          <Chalkboard 
            name={votablePlayers.find(p => p.id === selectedVote)?.name || ''} 
            isVisible={true} 
          />
        )}

        {hasDagger && (
          <div className="mb-6 flex items-center justify-center gap-3 text-[#E5C982]">
            <span className="text-lg">Usar Adaga (2 Votos):</span>
            <input
              type="checkbox"
              checked={useDagger}
              onChange={(e) => setUseDagger(e.target.checked)}
              className="w-6 h-6 accent-[#D8B66C] cursor-pointer"
            />
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