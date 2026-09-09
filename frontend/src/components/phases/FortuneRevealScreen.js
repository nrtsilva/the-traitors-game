import React, { useEffect } from 'react';

export default function FortuneRevealScreen({
  playerName,
  gold,
  bars,
  commonCoins,
  commonBars,
  onContinue,
}) {
  useEffect(() => {
    const timer = setTimeout(() => {
      onContinue();
    }, 6000);
    return () => clearTimeout(timer);
  }, [onContinue]);

  return (
    <div className="fixed inset-0 bg-[#291923] flex items-center justify-center z-40 animate-fadeIn">
      <div className="max-w-md w-full text-center">
        <div className="text-6xl mb-4">🏰</div>
        <h2 className="font-display text-3xl text-[#E5C982] mb-8">A tua Fortuna, {playerName}</h2>

        {/* Baú Individual */}
        <div className="bg-[#291923] border-2 border-[#D8B66C] rounded-lg p-6 mb-6 relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-0.5 bg-gradient-to-r from-transparent via-[#D8B66C] to-transparent opacity-70"></div>
          <div className="flex justify-center gap-8">
            <div>
              <span className="block text-5xl mb-2 animate-float">💰</span>
              <span className="text-2xl font-bold text-[#D8B66C]">{gold}</span>
              <span className="block text-xs text-[#F3EBDD]/60">Moedas</span>
            </div>
            <div>
              <span className="block text-5xl mb-2 animate-float" style={{ animationDelay: '0.2s' }}>🏆</span>
              <span className="text-2xl font-bold text-[#D8B66C]">{bars}</span>
              <span className="block text-xs text-[#F3EBDD]/60">Barras</span>
            </div>
          </div>
          <p className="text-xs text-[#F3EBDD]/40 mt-4">(1 Barra = 5 Moedas)</p>
        </div>

        {/* Baú Comunitário */}
        <h3 className="font-display text-xl text-[#E5C982] mb-4">⚜️ Baú Comunitário</h3>
        <div className="bg-[#291923] border-2 border-[#D8B66C] rounded-lg p-6 relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-0.5 bg-gradient-to-r from-transparent via-[#D8B66C] to-transparent opacity-70"></div>
          <div className="flex justify-center gap-8">
            <div>
              <span className="block text-5xl mb-2 animate-float" style={{ animationDelay: '0.4s' }}>💰</span>
              <span className="text-2xl font-bold text-[#D8B66C]">{commonCoins}</span>
              <span className="block text-xs text-[#F3EBDD]/60">Moedas</span>
            </div>
            <div>
              <span className="block text-5xl mb-2 animate-float" style={{ animationDelay: '0.6s' }}>🏆</span>
              <span className="text-2xl font-bold text-[#D8B66C]">{commonBars}</span>
              <span className="block text-xs text-[#F3EBDD]/60">Barras</span>
            </div>
          </div>
        </div>

        <div className="mt-8 text-[#F3EBDD]/40 text-sm animate-pulse">A preparar a missão...</div>
      </div>
    </div>
  );
}