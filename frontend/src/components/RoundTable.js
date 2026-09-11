import React from 'react';
import SunMoonEmblem from './SunMoonEmblem';

const AVATAR_COLORS = [
  '#D8B66C', '#B8935A', '#8B6F47', '#C9A961', '#A6824A',
  '#E5C982', '#D4AF6A', '#9C7A4A', '#BF9A5A', '#E0BA7A',
];

function PlayerAvatar({ name, index, total, isHost }) {
  const angle = (index / total) * 2 * Math.PI - Math.PI / 2;
  const radius = 42;
  const x = 50 + radius * Math.cos(angle);
  const y = 50 + radius * Math.sin(angle);

  const color = AVATAR_COLORS[index % AVATAR_COLORS.length];
  const initial = (name || '?').charAt(0).toUpperCase();

  return (
    <div
      className="absolute transition-all duration-700 ease-out"
      style={{
        left: `${x}%`,
        top: `${y}%`,
        transform: 'translate(-50%, -50%)',
        animation: `popIn 0.6s ease-out ${index * 0.15}s both`,
      }}
    >
      <div className="flex flex-col items-center">
        <div
          className="w-12 h-12 md:w-14 md:h-14 rounded-full border-2 flex items-center justify-center shadow-lg relative"
          style={{
            backgroundColor: color,
            borderColor: isHost ? '#E5C982' : '#D8B66C',
            boxShadow: `0 0 16px ${color}80`,
          }}
          title={name}
        >
          <span className="text-[#291923] font-display font-bold text-xl">
            {initial}
          </span>
          {isHost && (
            <span className="absolute -top-1 -right-1 text-xs">👑</span>
          )}
        </div>
        <span className="text-[10px] md:text-xs text-[#F3EBDD] mt-1 font-ui font-semibold tracking-wide truncate max-w-[60px]">
          {name}
        </span>
      </div>
    </div>
  );
}

function EmptySeat({ index, total }) {
  const angle = (index / total) * 2 * Math.PI - Math.PI / 2;
  const radius = 42;
  const x = 50 + radius * Math.cos(angle);
  const y = 50 + radius * Math.sin(angle);

  return (
    <div
      className="absolute"
      style={{
        left: `${x}%`,
        top: `${y}%`,
        transform: 'translate(-50%, -50%)',
      }}
    >
      <div className="w-12 h-12 md:w-14 md:h-14 rounded-full border-2 border-dashed border-[#D8B66C]/30 flex items-center justify-center bg-[#291923]/50">
        <span className="text-[#D8B66C]/40 text-xl animate-pulse">⋯</span>
      </div>
    </div>
  );
}

export default function RoundTable({ players = [], maxPlayers = 6, hostId = null }) {
  const totalSeats = Math.max(maxPlayers, players.length);
  const seats = Array.from({ length: totalSeats });

  return (
    <div className="relative w-full max-w-md aspect-square mx-auto mb-6">
      {/* Mesa central */}
      <div
        className="absolute top-1/2 left-1/2 rounded-full border-4 border-[#D8B66C] shadow-2xl flex items-center justify-center"
        style={{
          width: '44%',
          height: '44%',
          transform: 'translate(-50%, -50%)',
          background: 'radial-gradient(circle, #412734 0%, #291923 70%)',
          boxShadow: '0 0 40px rgba(216, 182, 108, 0.3), inset 0 0 30px rgba(0,0,0,0.6)',
          animation: 'tablePulse 3s ease-in-out infinite',
        }}
      >
        {/* Emblema Sol & Lua no centro */}
        <div
          className="flex items-center justify-center"
          style={{
            animation: 'emblemRotate 60s linear infinite',
          }}
        >
          <SunMoonEmblem size={Math.round(180 * 0.44 * 1.1)} />
        </div>
      </div>

      {/* Cadeiras / jogadores */}
      {seats.map((_, i) => {
        const player = players[i];
        if (player) {
          return (
            <PlayerAvatar
              key={player.id}
              name={player.name}
              index={i}
              total={totalSeats}
              isHost={player.id === hostId}
            />
          );
        }
        return <EmptySeat key={`empty-${i}`} index={i} total={totalSeats} />;
      })}

      <style>{`
        @keyframes popIn {
          0% { opacity: 0; transform: translate(-50%, -50%) scale(0.4); }
          100% { opacity: 1; transform: translate(-50%, -50%) scale(1); }
        }
        @keyframes tablePulse {
          0%, 100% { box-shadow: 0 0 40px rgba(216, 182, 108, 0.3), inset 0 0 30px rgba(0,0,0,0.6); }
          50% { box-shadow: 0 0 60px rgba(216, 182, 108, 0.5), inset 0 0 30px rgba(0,0,0,0.6); }
        }
        @keyframes emblemRotate {
          from { transform: rotate(0deg); }
          to   { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}