import React from 'react';

export default function TraitorChoicesScreen({ choices, onChoice }) {
  return (
    <div className="fixed inset-0 bg-black/95 flex items-center justify-center z-50">
      <div className="text-center">
        <h1 className="text-4xl font-display font-bold text-red-500 mb-8">Escolhe a tua Ação</h1>
        <div className="space-y-4">
          {choices.options.includes('kill') && (
            <button
              onClick={() => onChoice('kill')}
              className="block w-80 py-4 bg-red-900/40 border border-red-500 text-white font-bold text-xl rounded-lg hover:bg-red-900/80 transition"
            >
              🗡️ Assassinar
            </button>
          )}
          {choices.options.includes('recruit') && (
            <button
              onClick={() => onChoice('recruit')}
              className="block w-80 py-4 bg-[#291923] border border-[#D8B66C] text-[#E5C982] font-bold text-xl rounded-lg hover:bg-[#412734] transition"
            >
              🎭 Recrutar
            </button>
          )}
          {choices.options.includes('skip') && (
            <button
              onClick={() => onChoice('skip')}
              className="block w-80 py-4 bg-[#291923] border border-white/20 text-white/60 font-bold text-xl rounded-lg hover:bg-[#412734] transition"
            >
              Passar a Noite
            </button>
          )}
        </div>
      </div>
    </div>
  );
}