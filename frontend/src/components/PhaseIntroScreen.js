import React from 'react';

export default function PhaseIntroScreen({ data, isTraitor, onReady }) {
  return (
    <div className="text-center">
      <h1 className="text-4xl font-bold text-[#E5C982] mb-4">{data.title}</h1>
      <p className="text-xl mb-8">{data.description}</p>
      {isTraitor && data.secretMission && (
        <p className="text-red-400 mb-8">TAREFA SECRETA: {data.secretMission}</p>
      )}
      <button onClick={onReady} className="px-10 py-4 bg-[#D8B66C] text-[#291923] font-bold text-xl rounded-sm">
        INICIAR FASE
      </button>
    </div>
  );
}