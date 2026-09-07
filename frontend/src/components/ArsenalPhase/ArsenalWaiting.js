import React from 'react';

export default function ArsenalWaiting() {
  return (
    <div className="text-center">
      <h1 className="text-5xl font-bold text-[#E5C982] mb-8">O ARSENAL</h1>
      <div className="bg-[#291923] border-2 border-[#D8B66C] rounded-lg p-6 mb-6">
        <p className="text-[#F3EBDD] text-xl">A aguardar tarefa...</p>
        <p className="text-[#F3EBDD]/60 mt-4 text-sm animate-pulse">
          O anfitrião está a preparar o desafio.
        </p>
      </div>
    </div>
  );
}