import React, { useState, useEffect } from 'react';

export default function RoleReveal({ playerState, onContinue }) {
  const [step, setStep] = useState(0); 

  const isTraitor = playerState.role === 'traitor';

  useEffect(() => {
    const timers = [
      setTimeout(() => setStep(1), 1500),
      setTimeout(() => setStep(2), 3000),
      setTimeout(() => setStep(3), 4500),
      setTimeout(() => setStep(4), 6000)
    ];
    return () => timers.forEach(clearTimeout);
  }, []);

  return (
    <div className="min-h-screen bg-[#291923] flex flex-col items-center justify-center text-center p-8 relative overflow-hidden">
      <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-[#D8B66C]/10 rounded-full blur-3xl pointer-events-none"></div>

      <div className="relative z-10 flex flex-col items-center justify-center w-full max-w-lg">
        {/* PASSO 0,1,2,3,4: A Revelação (sem logo) */}
        <div className={`transition-opacity duration-1000 ${step >= 1 ? 'opacity-100' : 'opacity-0'}`}>
          {step >= 1 && (
            <h2 className="font-display text-3xl tracking-[0.3em] text-[#F3EBDD]/80 mb-4 uppercase">Tu és...</h2>
          )}

          {step >= 2 && (
            <h1 className={`font-display text-7xl font-bold tracking-widest mb-8 ${isTraitor ? 'text-red-500' : 'text-[#E5C982]'}`}>
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
            <button 
              onClick={onContinue}
              className="mt-10 py-4 px-10 bg-[#D8B66C] text-[#291923] font-ui font-bold text-lg uppercase tracking-[0.2em] rounded-sm hover:bg-[#E5C982] transition shadow-soft"
            >
              Entrar no Jogo
            </button>
          )}
        </div>
      </div>
    </div>
  );
}