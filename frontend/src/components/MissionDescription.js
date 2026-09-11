import React from 'react';

// Converte tags HTML simples (<b>, <i>, <em>, <strong>) em elementos React
function parseHtmlInline(text) {
  // Divide por tags e mantém as tags como separadores
  const parts = text.split(/(<\/?[a-z][^>]*>)/gi);
  
  const elements = [];
  let boldDepth = 0;
  let italicDepth = 0;
  
  parts.forEach((part, idx) => {
    if (!part) return;
    
    const lower = part.toLowerCase();
    
    if (lower === '<b>' || lower === '<strong>') {
      boldDepth++;
      return;
    }
    if (lower === '</b>' || lower === '</strong>') {
      boldDepth = Math.max(0, boldDepth - 1);
      return;
    }
    if (lower === '<i>' || lower === '<em>') {
      italicDepth++;
      return;
    }
    if (lower === '</i>' || lower === '</em>') {
      italicDepth = Math.max(0, italicDepth - 1);
      return;
    }
    
    // É texto normal
    let node = part;
    
    if (boldDepth > 0 && italicDepth > 0) {
      elements.push(<strong key={idx} className="text-[#E5C982] italic">{node}</strong>);
    } else if (boldDepth > 0) {
      elements.push(<strong key={idx} className="text-[#E5C982] font-bold">{node}</strong>);
    } else if (italicDepth > 0) {
      elements.push(<em key={idx} className="italic">{node}</em>);
    } else {
      elements.push(<React.Fragment key={idx}>{node}</React.Fragment>);
    }
  });
  
  return elements;
}

// Converte **texto** em negrito também
function applyMarkdownBold(text) {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((part, idx) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return <strong key={idx} className="text-[#E5C982] font-bold">{part.slice(2, -2)}</strong>;
    }
    return <React.Fragment key={idx}>{part}</React.Fragment>;
  });
}

export default function MissionDescription({ description }) {
  if (!description) return null;

  // Divide por quebras de linha reais
  const lines = description.split('\n').filter(line => line.trim() !== '');

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

        // Linha com emoji (destacada)
        const hasEmoji = /[\u{1F300}-\u{1FAFF}]/u.test(trimmed);
        if (hasEmoji && trimmed.length < 60) {
          return (
            <p key={index} className="text-lg font-medium text-[#E5C982]">
              {applyMarkdownBold(trimmed)}
            </p>
          );
        }

        // Parágrafo normal — parseia tags HTML inline
        return (
          <p key={index} className="leading-relaxed">
            {parseHtmlInline(trimmed)}
          </p>
        );
      })}
    </div>
  );
}