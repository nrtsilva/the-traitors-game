import React, { useState } from 'react';

export default function DecoyScreen({ onDecoyAnswer }) {
  const [answered, setAnswered] = useState(false);

  if (answered) {
    return (
      <div className="fixed inset-0 bg-black flex items-center justify-center z-50">
        <p className="text-2xl text-white/60 animate-pulse">A aguardar os outros jogadores...</p>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black flex items-center justify-center z-50">
      <div className="text-center">
        <h1 className="text-4xl font-display font-bold text-[#E5C982] mb-6">Aguarda...</h1>
        <p className="text-2xl text-white mb-8">Estás a gostar do jogo até agora?</p>
        <div className="flex justify-center gap-6">
          <button
            onClick={() => { setAnswered(true); onDecoyAnswer(); }}
            className="px-10 py-4 bg-[#D8B66C] text-[#291923] font-bold text-2xl rounded-lg hover:bg-[#E5C982] transition"
          >
            Sim
          </button>
          <button
            onClick={() => { setAnswered(true); onDecoyAnswer(); }}
            className="px-10 py-4 bg-[#291923] text-white border border-[#D8B66C] font-bold text-2xl rounded-lg hover:border-[#E5C982] transition"
          >
            Não
          </button>
        </div>
      </div>
    </div>
  );
}