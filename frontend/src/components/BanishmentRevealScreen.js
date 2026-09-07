import React from 'react';

export default function BanishmentRevealScreen({ data }) {
  const { isTie, banishedName, lostGold } = data;

  return (
    <div className="fixed inset-0 bg-black/90 flex items-center justify-center z-50">
      <div className="text-center animate-pulse">
        <div className="w-40 h-40 mx-auto mb-8 rounded-full bg-[#D8B66C]/20 blur-3xl"></div>

        {isTie ? (
          <>
            <h1 className="text-6xl font-display font-bold mb-6 text-[#E5C982]">EMPATE</h1>
            <p className="text-3xl text-white mb-4">NINGUÉM FOI EXPULSO</p>
            <p className="text-xl text-white/70 mb-8">
              Todos os jogadores empatados perderam <span className="font-bold text-[#D8B66C]">1 moeda</span>.
            </p>
          </>
        ) : (
          <>
            <h1 className="text-6xl font-display font-bold mb-6 text-[#E5C982]">EXPULSÃO</h1>
            <p className="text-4xl text-red-400 font-bold mb-4">{banishedName} FOI EXPULSO</p>
            <p className="text-xl text-white/70 mb-8">
              Perdeu <span className="font-bold text-[#D8B66C]">{lostGold} moedas</span>.
            </p>
          </>
        )}

        <p className="text-lg text-[#D8B66C] mt-12 animate-bounce">A preparar o Arsenal...</p>
      </div>
    </div>
  );
}