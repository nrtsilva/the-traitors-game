// src/components/phases/MissionPhase/MissionDefault.js
import React, { useState } from 'react';

export default function MissionDefault({ 
  onEndMission, 
  playerState 
}) {
  const [outcome, setOutcome] = useState(null);
  const mission = playerState.currentMission;

  // Se a missão requer input do utilizador, mostrar os botões
  const requiresUserOutcome = mission.requiresUserOutcome === true;

  const handleConfirm = () => {
    if (outcome !== null) {
      onEndMission(outcome);
    }
  };

  return (
    <div className="text-center">
      {requiresUserOutcome ? (
        <>
          <p className="text-white mb-4">A missão foi concluída com sucesso?</p>
          <div className="flex justify-center gap-4 mb-6">
            <button
              onClick={() => setOutcome(true)}
              className={`px-8 py-3 font-bold rounded-sm transition ${
                outcome === true ? 'bg-[#D8B66C] text-[#291923] scale-105' : 'bg-[#291923] text-white border border-[#D8B66C]'
              }`}
            >
              ✅ Sim, sucesso!
            </button>
            <button
              onClick={() => setOutcome(false)}
              className={`px-8 py-3 font-bold rounded-sm transition ${
                outcome === false ? 'bg-[#D8B66C] text-[#291923] scale-105' : 'bg-[#291923] text-white border border-[#D8B66C]'
              }`}
            >
              ❌ Não, falhámos
            </button>
          </div>
          <button
            onClick={handleConfirm}
            disabled={outcome === null}
            className="px-8 py-3 bg-[#D8B66C] text-[#291923] font-bold rounded-sm disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Confirmar
          </button>
        </>
      ) : (
        <>
          <p className="text-white mb-4">Sigam as instruções da missão e cliquem quando terminarem.</p>
          <button onClick={() => onEndMission(true)} className="px-8 py-3 bg-[#D8B66C] text-[#291923] font-bold rounded-sm">
            Concluir Missão
          </button>
        </>
      )}
    </div>
  );
}