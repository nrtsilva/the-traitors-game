import React from 'react';

export default function Chalkboard({ name, isVisible }) {
  if (!isVisible) return null;

  return (
    <div className="relative w-full max-w-sm mx-auto mb-6">
      <div className="bg-[#2d2d2d] border-8 border-[#8B7D6B] rounded-lg p-6 shadow-2xl" style={{ background: 'radial-gradient(circle at 20% 30%, #3a3a3a, #1a1a1a)' }}>
        <div className="border-2 border-[#8B7D6B]/30 rounded p-4 min-h-[80px] flex items-center justify-center">
          <div className="text-center">
            <span className="font-chalk text-4xl text-white/90 tracking-wider" style={{ fontFamily: '"Comic Sans MS", "Chalkboard SE", cursive', textShadow: '2px 2px 4px rgba(0,0,0,0.5)' }}>
              {name}
            </span>
            <div className="w-full h-0.5 bg-white/10 mt-2"></div>
            <span className="text-xs text-white/40 font-mono tracking-widest">✧ VOTO ✧</span>
          </div>
        </div>
        {/* Moldura de giz */}
        <div className="absolute -top-2 -left-2 w-6 h-6 border-t-2 border-l-2 border-white/10 rounded-tl-lg"></div>
        <div className="absolute -top-2 -right-2 w-6 h-6 border-t-2 border-r-2 border-white/10 rounded-tr-lg"></div>
        <div className="absolute -bottom-2 -left-2 w-6 h-6 border-b-2 border-l-2 border-white/10 rounded-bl-lg"></div>
        <div className="absolute -bottom-2 -right-2 w-6 h-6 border-b-2 border-r-2 border-white/10 rounded-br-lg"></div>
      </div>
      <div className="absolute -bottom-3 left-1/2 transform -translate-x-1/2 w-12 h-1 bg-[#8B7D6B] rounded-full opacity-50"></div>
    </div>
  );
}