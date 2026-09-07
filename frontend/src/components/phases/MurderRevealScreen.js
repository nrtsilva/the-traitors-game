import React from 'react';

export default function MurderRevealScreen({ data, onContinue }) {
  let content;
  if (data.type === 'murder') {
    content = (
      <>
        <div className="text-8xl mb-6">🗡️</div>
        <h1 className="text-5xl font-display font-bold text-red-500 mb-6">Assassinato!</h1>
        <p className="text-3xl text-white mb-4">{data.playerName} foi assassinado!</p>
        <p className="text-xl text-white/70">Perdeu {data.lostGold} moedas.</p>
      </>
    );
  } else if (data.type === 'shield') {
    content = (
      <>
        <div className="text-8xl mb-6">🛡️</div>
        <h1 className="text-5xl font-display font-bold text-[#E5C982] mb-6">O Escudo Protegeu!</h1>
        <p className="text-2xl text-white mb-4">Ninguém foi assassinado. O alvo tinha um Escudo.</p>
      </>
    );
  } else {
    content = (
      <>
        <div className="text-8xl mb-6">🌙</div>
        <h1 className="text-5xl font-display font-bold text-[#E5C982] mb-6">Ninguém Morreu</h1>
        <p className="text-2xl text-white mb-4">Esta noite foi tranquila.</p>
      </>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/90 flex items-center justify-center z-50">
      <div className="text-center">
        {content}
        <button
          onClick={onContinue}
          className="mt-8 px-10 py-4 bg-[#D8B66C] text-[#291923] font-bold text-xl rounded-lg hover:bg-[#E5C982] transition"
        >
          Continuar
        </button>
      </div>
    </div>
  );
}