import React from 'react';
import traitorHoodedImg from '../images/traitor-hooded.png';

export default function TraitorHoodedFigure({ size = 220 }) {
  return (
    <img
      src={traitorHoodedImg}
      alt="Traidor"
      className="mx-auto"
      style={{
        width: size,
        height: 'auto',
        maxHeight: size * 1.4,
        objectFit: 'contain',
        filter: 'drop-shadow(0 0 25px rgba(120, 20, 40, 0.6))',
        animation: 'hoodGlow 4s ease-in-out infinite',
      }}
    />
  );
}