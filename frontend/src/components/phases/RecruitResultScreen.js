import React from 'react';

export default function RecruitResultScreen({ result, onContinue }) {
  return (
    <div className="fixed inset-0 bg-black/90 flex items-center justify-center z-50">
      <div className="text-center">
        <h1 className="text-5xl font-display font-bold text-[#E5C982] mb-8">🤫 O Recrutamento</h1>
        <p className="text-2xl text-white mb-8">
          {result.accepted
            ? `${result.playerName} juntou-se aos Traidores!`
            : `${result.playerName} recusou o convite.`}
        </p>
        <p className="text-xl text-white/60 mb-8">Ninguém foi assassinado esta noite.</p>
        <button
          onClick={onContinue}
          className="px-10 py-4 bg-[#D8B66C] text-[#291923] font-bold text-xl rounded-lg hover:bg-[#E5C982] transition"
        >
          Continuar
        </button>
      </div>
    </div>
  );
}