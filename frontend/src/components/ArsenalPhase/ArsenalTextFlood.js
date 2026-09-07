import React, { useState } from 'react';

export default function ArsenalTextFlood({ task, onArsenalResultSubmit }) {
  const [resultItems, setResultItems] = useState([]);

  const handleAddItem = () => {
    setResultItems([...resultItems, '']);
  };

  const handleSubmitText = () => {
    const validItems = resultItems.filter(item => item.trim() !== '');
    onArsenalResultSubmit({ type: 'TEXT_FLOOD', items: validItems });
  };

  return (
    <div className="text-center">
      <h1 className="text-5xl font-bold text-[#E5C982] mb-8">O ARSENAL</h1>

      <div className="bg-[#291923] border-2 border-[#D8B66C] rounded-lg p-6 mb-6">
        <h2 className="text-2xl font-bold text-white mb-2">{task.title}</h2>
        <p className="text-[#F3EBDD] mb-4">{task.description}</p>
        {task.rule && <p className="text-sm text-[#F3EBDD]/70">Regra: {task.rule}</p>}
      </div>

      <div className="mb-6">
        <p className="text-white mb-4">Escreve as palavras/países (um por linha)</p>
        <div className="flex flex-col items-center gap-2 mb-4">
          {resultItems.map((item, idx) => (
            <input
              key={idx}
              type="text"
              value={item}
              onChange={(e) => {
                const newItems = [...resultItems];
                newItems[idx] = e.target.value;
                setResultItems(newItems);
              }}
              className="w-64 px-4 py-2 bg-[#291923] border border-[#D8B66C] text-white rounded-sm"
            />
          ))}
        </div>
        <button onClick={handleAddItem} className="px-4 py-2 bg-[#291923] text-white border border-[#D8B66C] rounded-sm mr-2">
          Adicionar Linha
        </button>
        <button onClick={handleSubmitText} className="px-8 py-2 bg-[#D8B66C] text-[#291923] font-bold rounded-sm">
          Submeter Lista
        </button>
      </div>
      <p className="text-xs text-white/60">Aguarda que todos os jogadores submetam os resultados...</p>
    </div>
  );
}