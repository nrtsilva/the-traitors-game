import React from 'react';

export default function ArsenalResultScreen({ result, playerId }) {
  const isWinner = result.winnerId === playerId;
  const reward = result.reward;
  let icon, title, description;

  if (isWinner) {
    if (reward === '2_coins' || reward === '1_coin') {
      icon = <div className="text-9xl text-[#D8B66C] drop-shadow-lg">◉</div>;
      title = `Ganhaste ${reward === '2_coins' ? '2' : '1'} moeda${reward === '2_coins' ? 's' : ''}!`;
      description = 'O ouro foi adicionado ao teu cofre.';
    } else if (reward === 'shield') {
      icon = <div className="text-9xl drop-shadow-lg">🛡️</div>;
      title = 'Ganhaste um Escudo!';
      description = 'Este escudo protege-te de um assassinato na próxima noite.';
    } else if (reward === 'dagger') {
      icon = <div className="text-9xl drop-shadow-lg">🗡️</div>;
      title = 'Ganhaste um Punhal!';
      description = 'Este punhal dá-te direito a 2 votos em QUALQUER votação para expulsão. Usa-o quando quiseres!';
    } else {
      icon = <div className="text-9xl text-[#D8B66C]">✖</div>;
      title = 'Ninguém venceu!';
      description = 'Não foi atribuído nenhum prémio.';
    }
  } else {
    icon = <div className="text-9xl text-[#F3EBDD]/40">😔</div>;
    title = 'Não foste o vencedor!';
    description = `O vencedor foi ${result.winnerName}. Prepara-te para a noite.`;
  }

  return (
    <div className="fixed inset-0 bg-black/90 flex items-center justify-center z-50">
      <div className="text-center animate-pulse">
        <div className="w-48 h-48 mx-auto mb-8 rounded-full bg-[#D8B66C]/20 blur-3xl"></div>
        {icon}
        <h1 className="text-5xl font-display font-bold text-[#E5C982] mt-6 mb-4">{title}</h1>
        <p className="text-2xl text-white/80 mb-8">{description}</p>
        <p className="text-lg text-[#D8B66C] animate-bounce">A preparar a noite...</p>
      </div>
    </div>
  );
}