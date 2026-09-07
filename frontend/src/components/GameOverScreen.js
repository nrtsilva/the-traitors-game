import React from 'react';

export default function GameOverScreen({ gameOver }) {
  return (
    <div className="fixed inset-0 bg-black/95 flex items-center justify-center z-50">
      <div className="text-center">
        <h1 className="text-6xl font-display font-bold text-[#E5C982] mb-6">FIM DO JOGO</h1>
        <p className="text-2xl text-white mb-8">{gameOver.message}</p>

        <div className="bg-[#291923] border-2 border-[#D8B66C] rounded-lg p-6 mb-8">
          <h2 className="text-xl font-bold text-[#D8B66C] mb-4">TESOURO COMUM</h2>
          <p className="text-3xl text-white mb-2">{gameOver.prizeFund?.bars || 0} Barras</p>
          <p className="text-2xl text-[#F3EBDD]">{gameOver.prizeFund?.coins || 0} Moedas</p>
        </div>

        <h3 className="text-xl text-white mb-4">Classificação Final</h3>
        {gameOver.players.map((p, idx) => (
          <p key={idx} className="text-lg text-[#F3EBDD]">
            {idx + 1}. {p.name} - {p.gold + p.bars * 5} Ouro
            {!p.alive && <span className="text-red-400"> (Eliminado)</span>}
          </p>
        ))}
      </div>
    </div>
  );
}