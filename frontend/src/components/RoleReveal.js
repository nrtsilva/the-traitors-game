import React, { useState, useEffect } from 'react';
import TraitorHoodedFigure from './TraitorHoodedFigure';

export default function RoleReveal({ playerState, onContinue, socket, roomData }) {
  const [step, setStep] = useState(0);
  const [readyCount, setReadyCount] = useState(0);
  const [totalPlayers, setTotalPlayers] = useState(1);
  const [allReady, setAllReady] = useState(false);
  const [hasClicked, setHasClicked] = useState(false);

  const isTraitor = playerState.role === 'traitor';

  useEffect(() => {
    const timers = [
      setTimeout(() => setStep(1), 1500),
      setTimeout(() => setStep(2), 3000),
      setTimeout(() => setStep(3), 4500),
    ];
    return () => timers.forEach(clearTimeout);
  }, []);

  useEffect(() => {
    if (!socket) return;
    const onProgress = (data) => {
      setReadyCount(data.readyCount);
      setTotalPlayers(data.totalPlayers);
      setAllReady(data.readyCount >= data.totalPlayers);
    };
    const onAllReady = () => {
      setTimeout(() => {
        if (typeof onContinue === 'function') onContinue();
      }, 800);
    };
    socket.on('role_reveal_ready_progress', onProgress);
    socket.on('role_reveal_all_ready', onAllReady);
    return () => {
      socket.off('role_reveal_ready_progress', onProgress);
      socket.off('role_reveal_all_ready', onAllReady);
    };
  }, [socket, onContinue]);

  const handleReady = () => {
    if (hasClicked || !socket || !roomData) return;
    setHasClicked(true);
    socket.emit('role_reveal_ready', { roomCode: roomData.roomCode });
  };

  return (
    <div className="min-h-screen bg-[#291923] flex flex-col items-center justify-center text-center p-8 relative overflow-hidden">
      {/* Vinheta subtil de fundo */}
      <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-[#D8B66C]/10 rounded-full blur-3xl pointer-events-none"></div>
      {isTraitor && (
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-red-900/20 rounded-full blur-3xl pointer-events-none animate-pulse"></div>
      )}

      <div className="relative z-10 flex flex-col items-center justify-center w-full max-w-lg">
        <div className={`transition-opacity duration-1000 ${step >= 1 ? 'opacity-100' : 'opacity-0'}`}>

          {step >= 1 && (
            <h2 className="font-display text-3xl tracking-[0.3em] text-[#F3EBDD]/80 mb-4 uppercase">
              Tu és...
            </h2>
          )}

          {/* SVG do capuz (apenas se Traidor) */}
          {isTraitor && step >= 2 && (
            <div className="mb-4 animate-fadeIn">
              <TraitorHoodedFigure size={220} />
            </div>
          )}

          {step >= 2 && (
            <h1 className={`font-display text-7xl font-bold tracking-widest mb-8 ${
              isTraitor ? 'text-red-500' : 'text-[#E5C982]'
            }`}>
              {isTraitor ? 'TRAIDOR' : 'FIEL'}
            </h1>
          )}

          {step >= 3 && (
            <div className="mt-4">
              {isTraitor ? (
                <p className="text-[#F3EBDD] text-lg leading-relaxed">
                  A tua missão é <span className="font-bold text-red-400">sabotar</span> as missões, eliminar os Fiéis e garantir que ninguém descobre a tua identidade. Mantém-te vivo até ao fim para reclamar todo o ouro!
                </p>
              ) : (
                <p className="text-[#F3EBDD] text-lg leading-relaxed">
                  A tua missão é <span className="font-bold text-[#D8B66C]">defender</span> o grupo, completar as missões para ganhar ouro e descobrir quem é o Traidor antes que seja demasiado tarde!
                </p>
              )}
            </div>
          )}

          {step >= 3 && (
            <div className="mt-10">
              {!allReady ? (
                <>
                  <button
                    onClick={handleReady}
                    disabled={hasClicked}
                    className={`py-4 px-10 font-ui font-bold text-lg uppercase tracking-[0.2em] rounded-sm transition shadow-soft ${
                      hasClicked
                        ? 'bg-[#412734] text-[#F3EBDD]/50 cursor-not-allowed'
                        : 'bg-[#D8B66C] text-[#291923] hover:bg-[#E5C982]'
                    }`}
                  >
                    {hasClicked ? 'Aguardando...' : 'Entrar no Jogo'}
                  </button>
                  <p className="text-sm text-[#F3EBDD]/60 mt-3">
                    {readyCount}/{totalPlayers} jogadores prontos
                  </p>
                </>
              ) : (
                <p className="text-[#E5C982] animate-pulse font-display text-xl">
                  Todos prontos! A entrar no jogo...
                </p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}