import React from 'react';
import RevealShell from '../RevealShell';

const VARIANTS = {
  murder: (data) => ({
    tone: 'danger',
    icon: '🗡️',
    title: 'Assassinato!',
    body: (
      <>
        <span className="block text-lg font-semibold">{data.playerName} foi assassinado</span>
        <span className="mt-1 block text-sm text-[#F3EBDD]/60">Perdeu {data.lostGold} moedas.</span>
      </>
    ),
  }),
  shield: () => ({
    tone: 'gold',
    icon: '🛡️',
    title: 'O Escudo Protegeu!',
    body: (
      <span className="block text-sm text-[#F3EBDD]/80">
        Ninguém foi assassinado esta noite. O alvo tinha um Escudo.
      </span>
    ),
  }),
  default: () => ({
    tone: 'calm',
    icon: '🌙',
    title: 'Ninguém Morreu',
    body: <span className="block text-sm text-[#F3EBDD]/80">Esta noite foi tranquila para todos.</span>,
  }),
};

export default function MurderRevealScreen({ data, onContinue }) {
  const build = VARIANTS[data.type] || VARIANTS.default;
  const { tone, icon, title, body } = build(data);

  return (
    <RevealShell
      tone={tone}
      icon={icon}
      title={title}
      footer={
        <button
          onClick={onContinue}
          className="min-h-[48px] w-full rounded-lg bg-[#D8B66C] px-8 py-3.5 text-base font-bold tracking-wide text-[#291923] transition hover:bg-[#E5C982] active:scale-95 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#E5C982] focus-visible:ring-offset-2 focus-visible:ring-offset-[#291923] sm:w-auto"
        >
          Continuar
        </button>
      }
    >
      {body}
    </RevealShell>
  );
}
