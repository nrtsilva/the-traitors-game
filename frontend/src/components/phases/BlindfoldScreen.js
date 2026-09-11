import React from 'react';

export default function BlindfoldScreen() {
  return (
    <div className="fixed inset-0 bg-black flex items-center justify-center z-50">
      <div className="text-center">
        <div className="text-8xl mb-8 animate-pulse">🌙</div>
        <h1 className="text-4xl font-display font-bold text-[#E5C982] mb-6">O Conclave reúne-se...</h1>
        <p className="text-2xl text-white mb-4">Coloca o telemóvel virado para baixo.</p>
        <p className="text-xl text-white/60">Vendem os olhos e aguardem instruções.</p>
      </div>
    </div>
  );
}