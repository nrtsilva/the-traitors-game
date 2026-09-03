import React from 'react';

export default function WaitingRoom({ socket, roomData, onBack }) {
  return (
    <div className="w-full max-w-md bg-[#291923] p-8 rounded-md gold-border-2 shadow-soft slow-reveal">
      <div className="text-center mb-8 border-b border-[#D8B66C]/50 pb-6">
        <h2 className="font-display text-3xl tracking-widest text-[#E5C982]">A SALA REÚNE-SE</h2>
        <p className="text-sm text-[#F3EBDD]/70 mt-2">Código: <span className="font-bold text-[#D8B66C] tracking-widest">{roomData.roomCode}</span></p>
      </div>

      <div className="bg-[#291923]/80 p-4 rounded-sm border border-[#D8B66C]/30 mb-6">
        <h3 className="text-lg mb-3 font-display text-[#D8B66C]">Jogadores ({roomData.players.length})</h3>
        <ul className="space-y-2">
          {roomData.players.map((player) => (
            <li key={player.id} className="flex justify-between items-center border-b border-[#D8B66C]/10 pb-2">
              <span className="text-[#F3EBDD]">{player.name}</span>
              <span className="text-xs text-[#E5C982] tracking-widest">Conectado</span>
            </li>
          ))}
        </ul>
      </div>

      <div className="text-center">
        <p className="text-[#F3EBDD]/60 mb-4">A aguardar que o anfitrião convoque o primeiro ritual...</p>
        <button 
          onClick={onBack}
          className="py-2 px-6 bg-[#412734] border border-[#D8B66C]/50 text-[#F3EBDD] rounded-sm hover:bg-[#291923] transition"
        >
          Sair
        </button>
      </div>
    </div>
  );
}