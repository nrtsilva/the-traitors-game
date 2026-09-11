import React from 'react';
import sunMoonImg from '../images/round_logo.svg';

export default function SunMoonEmblem({ size = 80 }) {
  return (
    <img
      src={sunMoonImg}
      alt="Emblema Sol e Lua"
      style={{
        width: size,
        height: size,
        objectFit: 'contain',
        filter: 'drop-shadow(0 0 8px rgba(216, 182, 108, 0.5))',
        pointerEvents: 'none',
        userSelect: 'none',
      }}
    />
  );
}