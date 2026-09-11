import React from 'react';

export default function TraitorHoodedFigure({ size = 220 }) {
  const width = size;
  const height = Math.round(size * 1.35); // aspect ratio 1:1.35

  return (
    <svg
      width={width}
      height={height}
      viewBox="0 0 300 405"
      xmlns="http://www.w3.org/2000/svg"
      className="mx-auto"
      style={{
        filter: 'drop-shadow(0 0 30px rgba(139, 30, 30, 0.7))',
        animation: 'hoodGlow 4s ease-in-out infinite',
      }}
    >
      <defs>
        {/* Gradiente do brilho de fundo */}
        <radialGradient id="hoodGlowGradient" cx="50%" cy="40%" r="60%">
          <stop offset="0%" stopColor="#8b1e1e" stopOpacity="0.55" />
          <stop offset="60%" stopColor="#4a1010" stopOpacity="0.25" />
          <stop offset="100%" stopColor="#1a0505" stopOpacity="0" />
        </radialGradient>

        {/* Gradiente do capuz (roxo/violeta como na referência) */}
        <linearGradient id="hoodOuterGradient" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#4a2d5c" />
          <stop offset="100%" stopColor="#2a1a35" />
        </linearGradient>

        <linearGradient id="hoodInnerGradient" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#3a1f4a" />
          <stop offset="100%" stopColor="#1e1028" />
        </linearGradient>

        {/* Gradiente do rosto */}
        <linearGradient id="faceGradient" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#a37a4a" />
          <stop offset="100%" stopColor="#6b4a2a" />
        </linearGradient>
      </defs>

      {/* ====== BRILHO DE FUNDO ====== */}
      <ellipse cx="150" cy="170" rx="180" ry="220" fill="url(#hoodGlowGradient)" />

      {/* ====== MOLDURA DOURADA (tipo carta) ====== */}
      <rect
        x="15" y="15" width="270" height="375" rx="14"
        fill="none"
        stroke="#D8B66C"
        strokeWidth="2.5"
        opacity="0.85"
      />
      <rect
        x="25" y="25" width="250" height="355" rx="10"
        fill="none"
        stroke="#D8B66C"
        strokeWidth="1"
        opacity="0.5"
      />

      {/* ====== CAPUZ EXTERIOR ====== */}
      <path
        d="M 150 50
           C 95 50, 60 95, 60 145
           C 60 185, 50 215, 35 250
           C 20 285, 35 340, 60 355
           L 240 355
           C 265 340, 280 285, 265 250
           C 250 215, 240 185, 240 145
           C 240 95, 205 50, 150 50 Z"
        fill="url(#hoodOuterGradient)"
        stroke="#0a0505"
        strokeWidth="1.5"
      />

      {/* ====== CAPUZ INTERIOR (abertura) ====== */}
      <path
        d="M 150 80
           C 110 80, 85 115, 85 155
           C 85 185, 80 205, 75 230
           C 100 220, 120 212, 135 210
           C 142 210, 146 218, 150 228
           C 154 218, 158 210, 165 210
           C 180 212, 200 220, 225 230
           C 220 205, 215 185, 215 155
           C 215 115, 190 80, 150 80 Z"
        fill="url(#hoodInnerGradient)"
      />

      {/* ====== ROSTO (sombra) ====== */}
      <path
        d="M 150 125
           C 128 125, 115 145, 115 168
           C 115 190, 128 208, 150 208
           C 172 208, 185 190, 185 168
           C 185 145, 172 125, 150 125 Z"
        fill="#3d2517"
      />

      {/* ====== ROSTO (zona iluminada) ====== */}
      <path
        d="M 150 135
           C 135 135, 125 150, 125 168
           C 125 185, 135 198, 150 198
           C 165 198, 175 185, 175 168
           C 175 150, 165 135, 150 135 Z"
        fill="url(#faceGradient)"
      />

      {/* ====== OLHOS (faixas escuras sem expressão) ====== */}
      <ellipse cx="137" cy="162" rx="9" ry="4" fill="#0a0505" />
      <ellipse cx="163" cy="162" rx="9" ry="4" fill="#0a0505" />

      {/* ====== NARIZ ====== */}
      <path
        d="M 150 168 Q 148 180, 150 184 Q 152 180, 150 168"
        fill="#5a3a1f"
        opacity="0.7"
      />

      {/* ====== BOCA ====== */}
      <path
        d="M 142 190 Q 150 193, 158 190"
        stroke="#2d1810"
        strokeWidth="1.5"
        fill="none"
        opacity="0.8"
      />

      {/* ====== DOBRAS DO CAPUZ ====== */}
      <path
        d="M 105 145 C 115 175, 105 215, 90 255"
        stroke="#0a0505"
        strokeWidth="2"
        fill="none"
        opacity="0.6"
      />
      <path
        d="M 195 145 C 185 175, 195 215, 210 255"
        stroke="#0a0505"
        strokeWidth="2"
        fill="none"
        opacity="0.6"
      />
      <path
        d="M 150 80 C 150 100, 150 110, 150 125"
        stroke="#0a0505"
        strokeWidth="1.5"
        fill="none"
        opacity="0.4"
      />

      {/* ====== SOMBRA INFERIOR ====== */}
      <path
        d="M 60 355 L 240 355 L 250 380 L 50 380 Z"
        fill="#0a0505"
        opacity="0.9"
      />

      {/* ====== ESTILO DE ANIMAÇÃO ====== */}
      <style>{`
        @keyframes hoodGlow {
          0%, 100% {
            filter: drop-shadow(0 0 25px rgba(139, 30, 30, 0.5));
          }
          50% {
            filter: drop-shadow(0 0 45px rgba(200, 50, 50, 0.85));
          }
        }
      `}</style>
    </svg>
  );
}