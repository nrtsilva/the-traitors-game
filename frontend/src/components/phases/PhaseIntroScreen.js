import React from 'react';

export default function PhaseIntroScreen({ data, isTraitor, onReady }) {
  const { title, description, secretMission } = data;

  return (
    <div className="fixed inset-0 bg-[#291923] flex items-center justify-center z-50">
      <div className="max-w-3xl w-full mx-4 bg-[#291923] border-2 border-[#D8B66C] rounded-lg p-8 shadow-2xl relative overflow-hidden">
        {/* Linha decorativa superior */}
        <div className="absolute top-0 left-0 w-full h-0.5 bg-gradient-to-r from-transparent via-[#D8B66C] to-transparent opacity-70"></div>
        
        <div className="absolute inset-0 bg-gradient-to-b from-[#291923]/80 via-[#291923] to-[#291923]/80 pointer-events-none"></div>
        
        <div className="relative z-10">
          <div className="text-center mb-6">
            <span className="text-6xl font-display text-[#D8B66C]">⚜️</span>
          </div>

          {/* Título */}
          <h1 className="font-display text-5xl font-bold text-[#E5C982] text-center tracking-widest mb-4">
            {title}
          </h1>
          <div className="w-32 h-0.5 bg-[#D8B66C] mx-auto mb-6"></div>

          <div className="text-[#F3EBDD] text-lg text-center leading-relaxed mb-8">
            {description.split('\n').map((line, i) => (
              <p key={i} className={line.trim() === '' ? 'my-2' : ''}>{line}</p>
            ))}
          </div>

          {/* Tarefa secreta (apenas para o traidor) */}
          {isTraitor && secretMission && (
            <div className="mt-6 p-4 border-2 border-[#D8B66C] rounded-lg bg-[#291923]/80 shadow-inner relative">
              <div className="absolute -top-3 left-1/2 transform -translate-x-1/2 bg-[#291923] px-4">
                <span className="text-[#E5C982] font-display text-sm tracking-widest">🤫 TAREFA SECRETA</span>
              </div>
              <p className="text-[#F3EBDD] mt-2 text-center italic">
                {secretMission}
              </p>
            </div>
          )}

          {/* Botão para iniciar a fase */}
          <div className="text-center mt-8">
            <button
              onClick={onReady}
              className="px-12 py-4 bg-[#D8B66C] text-[#291923] font-display font-bold text-xl uppercase tracking-[0.2em] rounded-sm hover:bg-[#E5C982] transition shadow-soft"
            >
              Iniciar Fase
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}