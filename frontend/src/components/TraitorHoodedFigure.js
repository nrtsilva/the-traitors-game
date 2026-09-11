import React from 'react';

export default function TraitorHoodedFigure({ size = 280 }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 300 400"
      xmlns="http://www.w3.org/2000/svg"
      className="mx-auto"
      style={{
        filter: 'drop-shadow(0 0 30px rgba(139, 30, 30, 0.6))',
        animation: 'hoodGlow 4s ease-in-out infinite',
      }}
    >
      {/* Fundo do capuz exterior (mais escuro) */}
      <path
        d="M 150 20
           C 90 20, 50 70, 50 130
           C 50 180, 40 210, 20 250
           C 0 290, 20 360, 50 380
           L 250 380
           C 280 360, 300 290, 280 250
           C 260 210, 250 180, 250 130
           C 250 70, 210 20, 150 20 Z"
        fill="#1a0f15"
      />

      {/* Capuz interior (mais claro) */}
      <path
        d="M 150 55
           C 105 55, 75 95, 75 140
           C 75 175, 70 200, 60 230
           C 90 220, 110 210, 130 210
           C 140 210, 145 220, 150 230
           C 155 220, 160 210, 170 210
           C 190 210, 210 220, 240 230
           C 230 200, 225 175, 225 140
           C 225 95, 195 55, 150 55 Z"
        fill="#2d1810"
      />

      {/* Rosto (sombra) */}
      <path
        d="M 150 110
           C 125 110, 110 130, 110 155
           C 110 180, 125 200, 150 200
           C 175 200, 190 180, 190 155
           C 190 130, 175 110, 150 110 Z"
        fill="#3d2517"
      />

      {/* Rosto (mais claro - zona iluminada) */}
      <path
        d="M 150 125
           C 132 125, 122 140, 122 158
           C 122 175, 132 190, 150 190
           C 168 190, 178 175, 178 158
           C 178 140, 168 125, 150 125 Z"
        fill="#8b6f47"
      />

      {/* Olhos (faixas escuras - sem expressão) */}
      <ellipse cx="135" cy="150" rx="10" ry="4" fill="#0a0505" />
      <ellipse cx="165" cy="150" rx="10" ry="4" fill="#0a0505" />

      {/* Nariz (sugestão) */}
      <path
        d="M 150 155 Q 148 170, 150 175 Q 152 170, 150 155"
        fill="#5a4025"
        opacity="0.6"
      />

      {/* Boca (linha sombria) */}
      <path
        d="M 140 182 Q 150 185, 160 182"
        stroke="#2d1810"
        strokeWidth="1.5"
        fill="none"
        opacity="0.7"
      />

      {/* Detalhes do capuz (dobras) */}
      <path
        d="M 100 130 C 110 160, 100 200, 85 240"
        stroke="#0a0505"
        strokeWidth="2"
        fill="none"
        opacity="0.5"
      />
      <path
        d="M 200 130 C 190 160, 200 200, 215 240"
        stroke="#0a0505"
        strokeWidth="2"
        fill="none"
        opacity="0.5"
      />

      {/* Sombra no fundo (profundidade) */}
      <path
        d="M 50 380 L 250 380 L 260 400 L 40 400 Z"
        fill="#0a0505"
        opacity="0.8"
      />

      <style>{`
        @keyframes hoodGlow {
          0%, 100% { filter: drop-shadow(0 0 30px rgba(139, 30, 30, 0.6)); }
          50%      { filter: drop-shadow(0 0 50px rgba(180, 40, 40, 0.9)); }
        }
      `}</style>
    </svg>
  );
}