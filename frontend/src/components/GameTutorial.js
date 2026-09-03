import React, { useState } from 'react';

const steps = [
  {
    title: "Bem-vindo à Mansão",
    /*description: "Bem-vindo ao The Traitors! Um jogo de dedução social, traição e estratégia. O objetivo é simples: acumular ouro para o cofre comunitário e desvendar (ou esconder) a identidade do Traidor. Vamos descobrir como se joga?",*/
    description: "Bem-vindo ao The Traitors! Uma Aventura é composta por 1 a 4 fases. Cada fase inclui 4 etapas: Missão (equipa), Expulsão (votação), Arsenal (individual) e Assassinato (noite). O objetivo é acumular ouro e desvendar (ou esconder) a identidade do Traidor. Vamos descobrir como se joga?",
    icon: "🏰"
  },
  {
    title: "O Papel Secreto",
    description: "No início, o sistema atribui secretamente a cada jogador um papel: Fiel ou Traidor. Os Fiéis trabalham em equipa para ganhar ouro e identificar o Traidor. Os Traidores (1 ou 2) tentam sabotar as missões e eliminar os Fiéis sem serem descobertos.",
    icon: "🎭"
  },
  {
    title: "As Missões",
    description: "Nesta fase, todos os jogadores cooperam para completar desafios em equipa. O ouro ganho vai para o Cofre Comunitário. Se for o Traidor, terá uma tarefa secreta de sabotagem que deve tentar cumprir sem ser apanhado!",
    icon: "⚔️"
  },
  {
    title: "A Expulsão",
    description: "Após a missão, o grupo reúne-se para discutir. Quem será o Traidor? Chega a altura de votar. A pessoa com mais votos é Expulsa da mansão e perde 2 peças de ouro (se as tiver). Mas atenção: se expulsarem um Fiel inocente, estão a ajudar o Traidor!",
    icon: "🗳️"
  },
  {
    title: "O Arsenal",
    description: "É um mini-jogo competitivo individual! Quem vencer recebe cartas de recompensa especiais: um Escudo (protege de um assassinato), uma Adaga (dobra o ouro ganho se expulsarem um Traidor), ou mais ouro para o seu baú pessoal.",
    icon: "🛡️"
  },
  {
    title: "O Assassinato",
    description: "Durante a noite, o Traidor pode assassinar um jogador. A vítima é eliminada e perde ouro, a menos que tenha um Escudo. Os Fiéis ficam no escuro, com os olhos vendados, enquanto o Traidor escolhe a sua vítima.",
    icon: "🗡️"
  },
  {
    title: "Revelação Final",
    description: "No final do jogo, os 2 jogadores com mais ouro chegam à votação final. Um deles pode ser o Traidor. Se os Fiéis votarem corretamente no Traidor, vencem e dividem o ouro. Se errarem, o Traidor foge com tudo!",
    icon: "👑"
  }
];

export default function GameTutorial({ onClose, initialStep = 0 }) {
  const [currentStep, setCurrentStep] = useState(initialStep);

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      onClose();
    }
  };

  return (
    <div className="bg-[#291923] flex items-center justify-center p-6 z-50 relative">
      <div className="max-w-2xl w-full border-2 border-[#D8B66C] rounded-lg shadow-soft p-8 text-center relative bg-[#291923]">
        <div className="text-6xl mb-4">{steps[currentStep].icon}</div>
        <h2 className="font-display text-3xl text-[#E5C982] mb-6">{steps[currentStep].title}</h2>
        <p className="text-[#F3EBDD] text-lg leading-relaxed mb-8">
          {steps[currentStep].description}
        </p>
        
        <div className="flex justify-between items-center">
          <button
            onClick={() => setCurrentStep(Math.max(0, currentStep - 1))}
            disabled={currentStep === 0}
            className="px-4 py-2 border border-[#D8B66C] text-[#F3EBDD] rounded-sm disabled:opacity-30 disabled:cursor-not-allowed"
          >
            Anterior
          </button>
          
          <div className="flex gap-2">
            {steps.map((_, idx) => (
              <div key={idx} className={`w-2 h-2 rounded-full ${idx === currentStep ? 'bg-[#D8B66C]' : 'bg-[#F3EBDD]/30'}`}></div>
            ))}
          </div>
          
          <button
            onClick={handleNext}
            className="px-6 py-2 bg-[#D8B66C] text-[#291923] font-bold rounded-sm hover:bg-[#E5C982] transition"
          >
            {currentStep === steps.length - 1 ? 'Começar' : 'Seguinte'}
          </button>
        </div>

        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-[#F3EBDD]/60 hover:text-[#F3EBDD] text-sm font-bold uppercase tracking-widest"
        >
          Saltar
        </button>
      </div>
    </div>
  );
}