import React, { useEffect, useState } from 'react';

export default function MissionOutcomeScreen({
  success,
  reward,
  barsAdded,
  coinsAdded,
  title,
  gold,
  bars,
  commonCoins,
  commonBars,
  playerName
}) {
  const [showFortune, setShowFortune] = useState(false);

  useEffect(() => {
    // Mostra a mensagem principal durante 2 segundos, depois mostra a fortuna
    const timer1 = setTimeout(() => setShowFortune(true), 2000);
    return () => clearTimeout(timer1);
  }, []);

  return (
    <div className="fixed inset-0 bg-black/90 flex items-center justify-center z-50 animate-fadeIn">
      <div className="max-w-md w-full bg-[#291923] border-2 border-[#D8B66C] rounded-lg p-8 text-center shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-0.5 bg-gradient-to-r from-transparent via-[#D8B66C] to-transparent opacity-70"></div>

        <div className="text-6xl mb-4">
          {success ? '🎉' : '😔'}
        </div>
        <h2 className="font-display text-3xl font-bold text-[#E5C982] mb-2">
          {success ? 'Missão Concluída!' : 'Missão Falhou!'}
        </h2>
        <p className="text-[#F3EBDD] text-sm uppercase tracking-widest mb-4">{title}</p>

        {!showFortune ? (
          // Mensagem principal
          <div className="bg-[#291923]/80 border border-[#D8B66C]/50 rounded-lg p-4 mb-6">
            <p className="text-[#F3EBDD] text-lg">
              {success ? (
                <>
                  <span className="block text-3xl font-bold text-[#D8B66C]">+{reward} Moedas</span>
                  <span className="text-xs text-[#F3EBDD]/60">para o Baú Comunitário</span>
                </>
              ) : (
                <span className="text-[#F3EBDD]/70">Nenhum prémio foi adicionado.</span>
              )}
            </p>
          </div>
        ) : (
          // Fortuna atualizada
          <>
            <h3 className="font-display text-xl text-[#E5C982] mb-4">🏰 A tua Fortuna, {playerName}</h3>

            {/* Baú Individual */}
            <div className="bg-[#291923] border-2 border-[#D8B66C] rounded-lg p-4 mb-4 relative overflow-hidden">
              <div className="absolute top-0 left-0 w-full h-0.5 bg-gradient-to-r from-transparent via-[#D8B66C] to-transparent opacity-70"></div>
              <div className="flex justify-center gap-8">
                <div>
                  <span className="block text-4xl mb-1 animate-float">💰</span>
                  <span className="text-xl font-bold text-[#D8B66C]">{gold}</span>
                  <span className="block text-xs text-[#F3EBDD]/60">Moedas</span>
                </div>
                <div>
                  <span className="block text-4xl mb-1 animate-float" style={{ animationDelay: '0.2s' }}>🏆</span>
                  <span className="text-xl font-bold text-[#D8B66C]">{bars}</span>
                  <span className="block text-xs text-[#F3EBDD]/60">Barras</span>
                </div>
              </div>
            </div>

            {/* Baú Comunitário */}
            <h4 className="font-display text-sm text-[#E5C982] mb-2">⚜️ Baú Comunitário</h4>
            <div className="bg-[#291923] border-2 border-[#D8B66C] rounded-lg p-4 relative overflow-hidden">
              <div className="absolute top-0 left-0 w-full h-0.5 bg-gradient-to-r from-transparent via-[#D8B66C] to-transparent opacity-70"></div>
              <div className="flex justify-center gap-8">
                <div>
                  <span className="block text-4xl mb-1 animate-float" style={{ animationDelay: '0.4s' }}>💰</span>
                  <span className="text-xl font-bold text-[#D8B66C]">{commonCoins}</span>
                  <span className="block text-xs text-[#F3EBDD]/60">Moedas</span>
                </div>
                <div>
                  <span className="block text-4xl mb-1 animate-float" style={{ animationDelay: '0.6s' }}>🏆</span>
                  <span className="text-xl font-bold text-[#D8B66C]">{commonBars}</span>
                  <span className="block text-xs text-[#F3EBDD]/60">Barras</span>
                </div>
              </div>
            </div>
          </>
        )}

        <div className="mt-6 text-[#F3EBDD]/40 text-xs animate-pulse">
          {!showFortune ? 'A preparar o próximo desafio...' : 'A avançar para a Expulsão...'}
        </div>
      </div>
    </div>
  );
}