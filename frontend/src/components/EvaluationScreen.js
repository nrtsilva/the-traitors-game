import React, { useState } from 'react';

export default function EvaluationScreen({ isTraitor, onEvaluation }) {
  const [selectedRating, setSelectedRating] = useState(0);
  const [traitorAnswer, setTraitorAnswer] = useState(null);

  return (
    <div className="w-full max-w-6xl mx-auto p-4 text-center">
      <h2 className="font-display text-3xl text-[#E5C982] mb-6">MISSÃO TERMINADA</h2>
      <p className="text-[#F3EBDD] text-lg mb-10">A missão terminou. Todos devem avaliar esta missão.</p>

      {isTraitor ? (
        <div className="mb-8">
          <h3 className="text-2xl text-red-400 mb-4">Completaste a tua missão secreta?</h3>
          <div className="flex justify-center gap-4 mb-6">
            <button
              onClick={() => setTraitorAnswer(true)}
              className={`px-8 py-4 font-bold rounded-sm transition ${
                traitorAnswer === true
                  ? 'bg-[#D8B66C] text-[#291923] scale-105'
                  : 'bg-[#291923] text-[#F3EBDD] border border-[#D8B66C]'
              }`}
            >
              Sim, completei
            </button>
            <button
              onClick={() => setTraitorAnswer(false)}
              className={`px-8 py-4 font-bold rounded-sm transition ${
                traitorAnswer === false
                  ? 'bg-[#D8B66C] text-[#291923] scale-105'
                  : 'bg-[#291923] text-[#F3EBDD] border border-[#D8B66C]'
              }`}
            >
              Não, falhei
            </button>
          </div>
          <button
            onClick={() => onEvaluation({ type: 'traitor_answer', value: traitorAnswer })}
            disabled={traitorAnswer === null}
            className="px-8 py-3 bg-[#D8B66C] text-[#291923] font-bold rounded-sm disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Confirmar
          </button>
        </div>
      ) : (
        <div className="mb-8">
          <h3 className="text-2xl text-[#F3EBDD] mb-4">Avalia a missão (1 a 5 estrelas)</h3>
          <div className="flex justify-center gap-2 mb-6">
            {[1, 2, 3, 4, 5].map((star) => (
              <button
                key={star}
                onClick={() => setSelectedRating(star)}
                className={`text-5xl transition ${selectedRating >= star ? 'text-[#D8B66C]' : 'text-[#F3EBDD]/30'}`}
              >
                ★
              </button>
            ))}
          </div>
          <button
            onClick={() => onEvaluation({ type: 'faithful_rating', value: selectedRating })}
            disabled={selectedRating === 0}
            className="px-8 py-3 bg-[#D8B66C] text-[#291923] font-bold rounded-sm disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Confirmar Avaliação
          </button>
        </div>
      )}
    </div>
  );
}