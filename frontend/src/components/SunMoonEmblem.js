import React from 'react';

export default function SunMoonEmblem({ size = 80, color = '#D8B66C' }) {
  // Raios do sol — 8 pontas (4 principais + 4 diagonais)
  const rays = [
    // Raios principais (vertical/horizontal)
    { rotate: 0,   length: 42, base: 12 },
    { rotate: 90,  length: 42, base: 12 },
    { rotate: 180, length: 42, base: 12 },
    { rotate: 270, length: 42, base: 12 },
    // Raios diagonais (mais pequenos)
    { rotate: 45,  length: 30, base: 9 },
    { rotate: 135, length: 30, base: 9 },
    { rotate: 225, length: 30, base: 9 },
    { rotate: 315, length: 30, base: 9 },
  ];

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 200 200"
      xmlns="http://www.w3.org/2000/svg"
      style={{ filter: 'drop-shadow(0 0 8px rgba(216, 182, 108, 0.4))' }}
    >
      {/* Anel exterior dourado (arcos entre os raios) */}
      <circle
        cx="100"
        cy="100"
        r="62"
        fill="none"
        stroke={color}
        strokeWidth="5"
        strokeDasharray="32 16"
        opacity="0.85"
      />

      {/* Raios do sol */}
      {rays.map((r, i) => (
        <polygon
          key={i}
          points={`100,${100 - r.length} ${100 - r.base / 2},${100 - r.base * 0.8} ${100 + r.base / 2},${100 - r.base * 0.8}`}
          fill="none"
          stroke={color}
          strokeWidth="1.5"
          transform={`rotate(${r.rotate} 100 100)`}
          opacity="0.9"
        />
      ))}

      {/* Círculo interior (contorno da lua) */}
      <circle
        cx="100"
        cy="100"
        r="34"
        fill="none"
        stroke={color}
        strokeWidth="1.5"
      />

      {/* Crescente da lua (dentro do círculo) */}
      <path
        d="
          M 112 78
          C 92 82, 82 100, 88 120
          C 94 138, 112 144, 122 136
          C 108 132, 100 118, 104 100
          C 106 92, 110 84, 112 78
          Z"
        fill="none"
        stroke={color}
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
    </svg>
  );
}