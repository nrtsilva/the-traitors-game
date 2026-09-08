import React, { useState } from 'react';

export default function MissionCategoryChoice({ playerState, socket, roomData, onCategorySubmit }) {
  const [selectedOption, setSelectedOption] = useState(null);
  const [submitted, setSubmitted] = useState(false);
  const options = playerState.currentMission.options || [];

  const handleSubmit = () => {
    if (selectedOption !== null) {
      onCategorySubmit(selectedOption);
      setSubmitted(true);
    }
  };

  if (submitted) {
    return <p className="text-[#F3EBDD] text-center">✅ Escolha submetida! Aguarda os outros jogadores.</p>;
  }

  return (
    <div className="text-center">
      <p className="text-white mb-4">Escolhe uma das opções (1 a {options.length}):</p>
      <div className="grid grid-cols-2 gap-3 max-w-md mx-auto mb-6">
        {options.map((opt, idx) => (
          <button
            key={idx}
            onClick={() => setSelectedOption(idx)}
            className={`p-3 rounded-sm border-2 transition ${
              selectedOption === idx
                ? 'border-[#D8B66C] bg-[#D8B66C]/20 text-[#E5C982]'
                : 'border-[#D8B66C]/30 bg-[#291923] text-[#F3EBDD] hover:border-[#D8B66C]'
            }`}
          >
            <span className="block text-lg font-bold">{idx + 1}</span>
            <span className="text-sm">{opt}</span>
          </button>
        ))}
      </div>
      <button
        onClick={handleSubmit}
        disabled={selectedOption === null}
        className="px-8 py-3 bg-[#D8B66C] text-[#291923] font-bold rounded-sm disabled:opacity-50 disabled:cursor-not-allowed"
      >
        Submeter Escolha
      </button>
    </div>
  );
}