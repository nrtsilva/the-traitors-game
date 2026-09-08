import React from 'react';

export default function MissionOutcomeScreen({ success, reward, barsAdded, coinsAdded, title }) {
    return (
        <div className="fixed inset-0 bg-black/90 flex items-center justify-center z-50 animate-fadeIn">
            <div className="max-w-md w-full bg-[#291923] border-2 border-[#D8B66C] rounded-lg p-8 text-center shadow-2xl relative overflow-hidden">
                {/* Linha decorativa */}
                <div className="absolute top-0 left-0 w-full h-0.5 bg-gradient-to-r from-transparent via-[#D8B66C] to-transparent opacity-70"></div>
                
                <div className="text-6xl mb-4">
                    {success ? '🎉' : '😔'}
                </div>
                <h2 className="font-display text-3xl font-bold text-[#E5C982] mb-2">
                    {success ? 'Missão Concluída!' : 'Missão Falhou!'}
                </h2>
                <p className="text-[#F3EBDD] text-sm uppercase tracking-widest mb-4">{title}</p>
                
                <div className="bg-[#291923]/80 border border-[#D8B66C]/50 rounded-lg p-4 mb-6">
                    <p className="text-[#F3EBDD] text-sm">
                        {success ? (
                            <>
                                <span className="block text-2xl font-bold text-[#D8B66C]">+{reward} Moedas</span>
                                <span className="text-xs text-[#F3EBDD]/60">
                                    Total no Cofre: {barsAdded} Barras e {coinsAdded} Moedas
                                </span>
                            </>
                        ) : (
                            <span className="text-[#F3EBDD]/70">Nenhum prémio adicionado.</span>
                        )}
                    </p>
                </div>

                <div className="text-center text-[#F3EBDD]/40 text-xs animate-pulse">
                    A preparar a próxima fase...
                </div>
            </div>
        </div>
    );
}