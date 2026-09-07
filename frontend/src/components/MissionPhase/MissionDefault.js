import React from 'react';

export default function MissionDefault({ onEndMission }) {
  return (
    <div className="text-center">
      <p className="text-white mb-4">Sigam as instruções da missão e cliquem quando terminarem.</p>
      <button onClick={onEndMission} className="px-8 py-3 bg-[#D8B66C] text-[#291923] font-bold rounded-sm">
        Concluir Missão
      </button>
    </div>
  );
}