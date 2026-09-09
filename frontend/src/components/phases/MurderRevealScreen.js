import React from 'react';

export default function MurderRevealScreen({ data, onContinue }) {
  const { type, playerName, lostGold } = data;

  let icon, title, description;

  if (type === 'murder') {
    icon = '🗡️';
    title = 'Assassinato!';
    description = (
      <>
        <p className="text-3xl text-white mb-4">{playerName} foi assassinado!</p>
        <p className="text-xl text-white/70">Perdeu {lostGold || 0} moedas.</p>
      </>
    );
  } else if (type === 'shield') {
    icon = '🛡️';
    title = 'O Escudo Protegeu!';
    description = (
      <p className="text-2xl text-white mb-4">Ninguém foi assassinado. O alvo tinha um Escudo.</p>
    );
  } else {
    icon = '🌙';
    title = 'Ninguém Morreu';
    description = (
      <p className="text-2xl text-white mb-4">Esta noite foi tranquila.</p>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/90 flex items-center justify-center z-50">
      <div className="text-center max-w-md w-full bg-[#291923] border-2 border-[#D8B66C] rounded-lg p-8 shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-0.5 bg-gradient-to-r from-transparent via-[#D8B66C] to-transparent opacity-70"></div>
        
        <div className="text-8xl mb-6">{icon}</div>
        <h1 className="font-display text-5xl font-bold text-[#E5C982] mb-6">{title}</h1>
        <div className="mb-8">{description}</div>
        
        <button
          onClick={onContinue}
          className="px-10 py-4 bg-[#D8B66C] text-[#291923] font-bold text-xl rounded-lg hover:bg-[#E5C982] transition"
        >
          Continuar
        </button>
      </div>
    </div>
  );
}