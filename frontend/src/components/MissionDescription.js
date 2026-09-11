// src/components/MissionDescription.js
import React from 'react';

/**
 * Converte **texto** em <strong> com destaque dourado,
 * mantendo o resto do texto normal.
 */
function applyMarkdownBold(text) {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((part, idx) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return (
        <strong key={idx} className="text-[#E5C982] font-bold">
          {part.slice(2, -2)}
        </strong>
      );
    }
    return <React.Fragment key={idx}>{part}</React.Fragment>;
  });
}

export default function MissionDescription({ description }) {
  if (!description) return null;

  // Divide por quebras de linha reais
  const lines = description.split('\n').filter((line) => line.trim() !== '');

  return (
    <div className="text-[#F3EBDD] text-left space-y-3">
      {lines.map((line, index) => {
        const trimmed = line.trim();

        // Item de lista (começa com número ou bullet)
        const isListItem = /^\d+\./.test(trimmed) || /^[•\-*]/.test(trimmed);

        if (isListItem) {
          return (
            <div key={index} className="flex items-start gap-3">
              <span className="text-[#D8B66C] text-xl mt-0.5">✦</span>
              <span className="leading-relaxed">
                {applyMarkdownBold(
                  trimmed.replace(/^\d+\.\s*/, '').replace(/^[•\-*]\s*/, '')
                )}
              </span>
            </div>
          );
        }

        // Linha só com emoji/título curto → destacar
        const isEmojiHeader = /^[\p{Emoji}\s]+$/u.test(trimmed) && trimmed.length < 40;

        if (isEmojiHeader) {
          return (
            <p key={index} className="text-lg font-medium text-[#E5C982]">
              {applyMarkdownBold(trimmed)}
            </p>
          );
        }

        // Parágrafo normal — suporta **markdown** e <b>
        return (
          <p key={index} className="leading-relaxed">
            {applyMarkdownBold(trimmed)}
          </p>
        );
      })}
    </div>
  );
}