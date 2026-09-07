import React from 'react';

export default function TraitorPlayerListScreen({ players, playerId, type, onSelect }) {
  const playersToShow = players.filter(p => p.id !== playerId && p.alive);

  return (
    <div className="fixed inset-0 bg-black/95 flex items-center justify-center z-50">
      <div className="text-center">
        <h1 className="text-4xl font-display font-bold text-[#E5C982] mb-8">
          {type === 'recruit' ? 'Quem queres recrutar?' : 'Quem queres assassinar?'}
        </h1>
        <div className="space-y-4">
          {playersToShow.map(player => (
            <button
              key={player.id}
              onClick={() => onSelect(player.id)}
              className="block w-80 py-4 bg-[#291923] border border-[#D8B66C]/30 text-white font-bold text-xl rounded-lg hover:border-[#D8B66C] transition"
            >
              {player.name}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}