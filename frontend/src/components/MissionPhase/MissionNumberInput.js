import React, { useState } from 'react';

export default function MissionNumberInput({ onMissionValueSubmit }) {
  const [missionValue, setMissionValue] = useState('');

  return (
    <div className="text-center">
      <p className="text-white mb-4">Quantos passes conseguiram?</p>
      <input
        type="number"
        min="0"
        value={missionValue}
        onChange={(e) => setMissionValue(e.target.value)}
        className="w-32 px-4 py-2 bg-[#291923] border border-[#D8B66C] text-white text-center text-xl rounded-sm mb-4"
      />
      <br />
      <button
        onClick={() => onMissionValueSubmit(missionValue)}
        className="px-8 py-3 bg-[#D8B66C] text-[#291923] font-bold rounded-sm"
      >
        Submeter Valor e Terminar
      </button>
    </div>
  );
}