import React from 'react';
import RoundTable from './RoundTable';

export default function WaitingRoom({ socket, roomData, onBack }) {
  const maxPlayers = roomData?.settings?.maxPlayers || 6;
  const playersCount = roomData?.players?.length || 0;

  return (
    <div className="w-full max-w-lg bg-[#291923] p-6 rounded-md gold-border-2 shadow-soft slow-reveal">
      {/* ====== CABEÇALHO ====== */}
      <div className="text-center mb-6 border-b border-[#D8B66C]/50 pb-4">
        <h2 className="font-display text-3xl tracking-widest text-[#E5C982]">
          A SALA REÚNE-SE
        </h2>
        <p className="text-sm text-[#F3EBDD]/70 mt-2 font-ui tracking-widest">
          Código:{' '}
          <span className="font-bold text-[#D8B66C] tracking-[0.3em]">
            {roomData?.roomCode}
          </span>
        </p>
      </div>

      {/* ====== MESA REDONDA ANIMADA ====== */}
      <RoundTable
        players={roomData?.players || []}
        maxPlayers={maxPlayers}
        hostId={roomData?.hostId || roomData?.players?.[0]?.id}
      />

      {/* ====== ESTADO DOS JOGADORES ====== */}
      <div className="text-center mb-4">
        <p className="text-[#F3EBDD]/70 text-sm font-ui">
          <span className="text-[#D8B66C] font-bold text-lg">{playersCount}</span>
          {' / '}
          <span className="text-[#F3EBDD]">{maxPlayers}</span>
          {' '}jogadores na sala
        </p>
        {playersCount < maxPlayers && (
          <p className="text-[#D8B66C]/70 text-xs mt-1 animate-pulse">
            A aguardar mais jogadores...
          </p>
        )}
        {playersCount >= maxPlayers && (
          <p className="text-[#E5C982] text-xs mt-1 font-bold">
            ✅ Sala cheia!
          </p>
        )}
      </div>

      {/* ====== MENSAGEM DE ESPERA ====== */}
      <div className="text-center">
        <p className="text-[#F3EBDD]/60 mb-4 text-sm">
          A aguardar que o anfitrião convoque o primeiro ritual...
        </p>
        <button
          onClick={onBack}
          className="py-2 px-6 bg-[#412734] border border-[#D8B66C]/50 text-[#F3EBDD] rounded-sm hover:bg-[#291923] transition font-ui uppercase tracking-widest text-sm"
        >
          Sair
        </button>
      </div>
    </div>
  );
}