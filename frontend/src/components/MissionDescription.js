import React from 'react';

export default function MissionDescription({ description }) {
  // Divide a descrição por linhas e filtra linhas vazias
  const lines = description.split('\n').filter(line => line.trim() !== '');
  
  return (
    <div className="text-[#F3EBDD] text-left space-y-3">
      {lines.map((line, index) => {
        const trimmed = line.trim();
        
        // Detecta se a linha começa com número ou marcador (lista)
        const isListItem = /^\d+\./.test(trimmed) || /^[•\-*]/.test(trimmed);
        
        if (isListItem) {
          // Item de lista com bullet dourado
          return (
            <div key={index} className="flex items-start gap-3">
              <span className="text-[#D8B66C] text-xl mt-0.5">✦</span>
              <span className="leading-relaxed">{trimmed}</span>
            </div>
          );
        }
        
        // Se contém emoji, destaca como título ou subtítulo
        const hasEmoji = /[\u{1F300}-\u{1FAFF}]/u.test(trimmed);
        if (hasEmoji) {
          return (
            <p key={index} className="text-lg font-medium text-[#E5C982]">
              {trimmed}
            </p>
          );
        }
        
        // Parágrafo normal
        return (
          <p key={index} className="leading-relaxed">
            {trimmed}
          </p>
        );
      })}
    </div>
  );
}