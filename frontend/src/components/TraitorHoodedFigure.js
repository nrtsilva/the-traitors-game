import React from 'react';

export default function TraitorHoodedFigure({ size = 280 }) {
  const width = size;
  const height = Math.round(size * 1.15); // proporção da referência

  return (
    <svg
      width={width}
      height={height}
      viewBox="0 0 400 460"
      xmlns="http://www.w3.org/2000/svg"
      className="mx-auto"
      style={{
        filter: 'drop-shadow(0 0 25px rgba(120, 20, 40, 0.55))',
        animation: 'hoodGlow 4s ease-in-out infinite',
      }}
    >
      <defs>
        {/* Gradiente do capuz — topo mais claro, base mais escura */}
        <linearGradient id="hoodGrad" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#5a3a5a" />
          <stop offset="55%" stopColor="#3d1f3d" />
          <stop offset="100%" stopColor="#2a1229" />
        </linearGradient>

        {/* Gradiente do interior do capuz (mais escuro) */}
        <linearGradient id="hoodInnerGrad" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#1a0a1a" />
          <stop offset="100%" stopColor="#0d050d" />
        </linearGradient>

        {/* Gradiente do manto (ombros) */}
        <linearGradient id="cloakGrad" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#4a2a4a" />
          <stop offset="60%" stopColor="#3a1f3a" />
          <stop offset="100%" stopColor="#1f0f1f" />
        </linearGradient>

        {/* Gradiente da face (pele em sombra) */}
        <radialGradient id="faceGrad" cx="50%" cy="70%" r="60%">
          <stop offset="0%" stopColor="#a08258" />
          <stop offset="60%" stopColor="#7a5f3d" />
          <stop offset="100%" stopColor="#3d2a1a" />
        </radialGradient>

        {/* Glow de fundo */}
        <radialGradient id="backGlow" cx="50%" cy="45%" r="55%">
          <stop offset="0%" stopColor="#6b1a2a" stopOpacity="0.5" />
          <stop offset="100%" stopColor="#1a0505" stopOpacity="0" />
        </radialGradient>
      </defs>

      {/* Glow de fundo */}
      <ellipse cx="200" cy="200" rx="180" ry="220" fill="url(#backGlow)" />

      {/* ============ MANTO / OMBROS ============ */}
      <path
        d="
          M 200 200
          C 140 205, 80 235, 50 290
          C 30 330, 20 390, 25 440
          L 100 440
          L 130 300
          L 130 440
          L 270 440
          L 270 300
          L 300 440
          L 375 440
          C 380 390, 370 330, 350 290
          C 320 235, 260 205, 200 200
          Z"
        fill="url(#cloakGrad)"
      />

      {/* Dobras verticais do manto */}
      <path
        d="M 130 300 C 150 340, 160 390, 165 440"
        fill="none" stroke="#1a0a1a" strokeWidth="3" opacity="0.7"
      />
      <path
        d="M 270 300 C 250 340, 240 390, 235 440"
        fill="none" stroke="#1a0a1a" strokeWidth="3" opacity="0.7"
      />

      {/* Highlight nas dobras (mais claro) */}
      <path
        d="M 120 300 C 100 340, 90 390, 80 440"
        fill="none" stroke="#6a4a6a" strokeWidth="2" opacity="0.5"
      />
      <path
        d="M 280 300 C 300 340, 310 390, 320 440"
        fill="none" stroke="#6a4a6a" strokeWidth="2" opacity="0.5"
      />

      {/* ============ CAPUZ EXTERIOR ============ */}
      <path
        d="
          M 200 30
          C 130 30, 85 90, 80 170
          C 78 210, 70 250, 55 290
          C 90 275, 120 260, 145 255
          C 165 252, 185 245, 200 245
          C 215 245, 235 252, 255 255
          C 280 260, 310 275, 345 290
          C 330 250, 322 210, 320 170
          C 315 90, 270 30, 200 30
          Z"
        fill="url(#hoodGrad)"
      />

      {/* ============ INTERIOR DO CAPUZ (abertura escura) ============ */}
      <path
        d="
          M 200 65
          C 148 65, 118 108, 115 168
          C 113 198, 108 222, 100 245
          C 130 235, 155 228, 175 226
          C 185 225, 195 230, 200 240
          C 205 230, 215 225, 225 226
          C 245 228, 270 235, 300 245
          C 292 222, 287 198, 285 168
          C 282 108, 252 65, 200 65
          Z"
        fill="url(#hoodInnerGrad)"
      />

      {/* ============ FACE ============ */}
      {/* Contorno do rosto (cabelo em sombra no topo) */}
      <path
        d="
          M 200 105
          C 165 105, 145 130, 145 165
          C 145 200, 165 225, 200 225
          C 235 225, 255 200, 255 165
          C 255 130, 235 105, 200 105
          Z"
        fill="#2a1a10"
      />

      {/* Cabelo / sombra do topo */}
      <path
        d="
          M 200 105
          C 165 105, 145 130, 145 165
          C 160 145, 180 135, 200 135
          C 220 135, 240 145, 255 165
          C 255 130, 235 105, 200 105
          Z"
        fill="#3a2515"
      />

      {/* Zona iluminada (parte inferior do rosto - nariz/boca/queixo) */}
      <path
        d="
          M 200 145
          C 175 145, 158 165, 158 190
          C 158 210, 175 225, 200 225
          C 225 225, 242 210, 242 190
          C 242 165, 225 145, 200 145
          Z"
        fill="url(#faceGrad)"
      />

      {/* Sombra dos olhos (faixa escura) */}
      <ellipse cx="200" cy="150" rx="45" ry="10" fill="#2a1a10" opacity="0.85" />

      {/* ============ SOMBRA INTERNA DO CAPUZ SOBRE O ROSTO ============ */}
      {/* Sombra lateral esquerda */}
      <path
        d="
          M 145 165
          C 145 200, 155 220, 170 225
          C 155 215, 150 195, 152 170
          Z"
        fill="#0d050d" opacity="0.6"
      />
      {/* Sombra lateral direita */}
      <path
        d="
          M 255 165
          C 255 200, 245 220, 230 225
          C 245 215, 250 195, 248 170
          Z"
        fill="#0d050d" opacity="0.6"
      />

      {/* ============ HIGHLIGHTS NO CAPUZ ============ */}
      {/* Highlight superior esquerdo */}
      <path
        d="M 130 90 C 110 130, 105 170, 110 210"
        fill="none" stroke="#7a5a7a" strokeWidth="2.5" opacity="0.5" strokeLinecap="round"
      />
      {/* Highlight superior direito */}
      <path
        d="M 270 90 C 290 130, 295 170, 290 210"
        fill="none" stroke="#7a5a7a" strokeWidth="2.5" opacity="0.5" strokeLinecap="round"
      />

      {/* Abertura frontal do capuz (linha interna) */}
      <path
        d="
          M 115 168
          C 130 155, 155 148, 175 148
          C 185 148, 195 155, 200 165
          C 205 155, 215 148, 225 148
          C 245 148, 270 155, 285 168"
        fill="none" stroke="#0d050d" strokeWidth="3" opacity="0.8"
      />

      {/* ============ BASE / CHÃO (opcional) ============ */}
      <path
        d="
          M 40 460
          C 90 445, 150 440, 200 440
          C 250 440, 310 445, 360 460
          Z"
        fill="#0d050d" opacity="0.9"
      />

      <style>{`
        @keyframes hoodGlow {
          0%, 100% {
            filter: drop-shadow(0 0 22px rgba(120, 20, 40, 0.45));
          }
          50% {
            filter: drop-shadow(0 0 40px rgba(180, 30, 60, 0.75));
          }
        }
      `}</style>
    </svg>
  );
}