import React from 'react';

export default function MissionDescription({ description }) {
  // Divide a descrição por linhas e formata
  const lines = description.split('\n').filter(line => line.trim() !== '');
  return (
    <div className="text-[#F3EBDD] text-left space-y-3">
      {lines.map((line, index) => {
        // Detecta se a linha começa com número ou marcador
        const isListItem = /^\d+\./.test(line.trim()) || /^[•\-*]/.test(line.trim());
        if (isListItem) {
          return <div key={index} className="flex items-start gap-2"><span className="text-[#D8B66C]">•</span><span>{line.trim()}</span></div>;
        }
        // Se contém emoji, destaca
        const hasEmoji = /[\u{1F300}-\u{1FAFF}]/u.test(line);
        if (hasEmoji) {
          return <p key={index} className="text-lg font-medium text-[#E5C982]">{line}</p>;
        }
        return <p key={index} className="leading-relaxed">{line}</p>;
      })}
    </div>
  );
}