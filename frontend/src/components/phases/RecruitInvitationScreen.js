import React from 'react';

export default function RecruitInvitationScreen({ onDecision }) {
  return (
    <div className="fixed inset-0 bg-black/95 flex items-center justify-center z-50">
      <div className="text-center">
        <h1 className="text-5xl font-display font-bold text-[#E5C982] mb-8">🤝 Uma Proposta</h1>
        <p className="text-2xl text-white mb-8">Foste escolhido para te juntares aos Traidores!</p>
        <div className="flex justify-center gap-6">
          <button
            onClick={() => onDecision(true)}
            className="px-10 py-4 bg-[#D8B66C] text-[#291923] font-bold text-xl rounded-lg hover:bg-[#E5C982] transition"
          >
            Aceitar
          </button>
          <button
            onClick={() => onDecision(false)}
            className="px-10 py-4 bg-[#291923] text-white border border-[#D8B66C] font-bold text-xl rounded-lg hover:border-[#E5C982] transition"
          >
            Recusar
          </button>
        </div>
      </div>
    </div>
  );
}