import React, { useState } from 'react';
import DrawingCanvas from '../../DrawingCanvas';

export default function MissionCollaborativeDrawing({ playerState, onMissionOutcome, socket, roomData }) {
  const [openCanvas, setOpenCanvas] = useState(false);
  const [missionSecretWord, setMissionSecretWord] = useState('');

  if (playerState.gameMode === 'in_person') {
    return (
      <div className="bg-[#291923] border-2 border-[#D8B66C] rounded-lg p-6 mb-6 text-left">
        <h3 className="text-2xl font-bold text-white mb-4 text-center">🎨 Desenho nas Costas</h3>
        <ol className="list-decimal text-[#F3EBDD] space-y-2 mb-6">
          <li><strong>Formem uma fila</strong> e definam a ordem dos jogadores, do primeiro ao último.</li>
          <li>O <strong>primeiro jogador</strong> recebe secretamente uma palavra ou objeto que terá de transmitir.</li>
          <li>Sem falar, o primeiro jogador <strong>desenha a palavra com o dedo nas costas do segundo jogador</strong>.</li>
          <li>O segundo jogador tenta perceber o que sentiu e, <strong>sem fazer perguntas</strong>, desenha a mesma coisa nas costas do terceiro.</li>
          <li>O processo continua, passando o desenho de jogador para jogador, até chegar ao <strong>último jogador da fila</strong>.</li>
          <li>O último jogador deve dizer <strong>em voz alta o que acha que foi desenhado nas suas costas</strong>.</li>
          <li>🎉 <strong>Se a resposta for a palavra/objeto original, a equipa ganha!</strong></li>
        </ol>
        <p className="text-[#F3EBDD]/80 mb-6"><strong>Regra importante:</strong> ninguém pode falar, mostrar o desenho ou dar pistas durante a transmissão. A ideia é descobrir <strong>até que ponto a mensagem consegue chegar ao fim sem se perder pelo caminho!</strong></p>
        
        <div className="mb-6">
          <p className="text-white mb-2">Palavra/objeto secreto (apenas para o 1º jogador):</p>
          <input 
            type="text" 
            value={missionSecretWord}
            onChange={(e) => setMissionSecretWord(e.target.value)}
            className="w-64 px-4 py-2 bg-[#291923] border border-[#D8B66C] text-white rounded-sm mb-4"
            placeholder="Ex: Barco"
          />
        </div>

        <div className="text-center">
          <button 
            onClick={() => onMissionOutcome(true)}
            className="px-8 py-3 bg-[#D8B66C] text-[#291923] font-bold rounded-sm mr-2"
          >
            ✅ Concluir com Sucesso
          </button>
          <button 
            onClick={() => onMissionOutcome(false)}
            className="px-8 py-3 bg-[#291923] text-white border border-[#D8B66C] font-bold rounded-sm"
          >
            ❌ Falhar Missão
          </button>
        </div>
      </div>
    );
  }

  // Modo remoto
  return (
    <div className="text-center">
      <p className="text-white mb-4">Abram o quadro para desenharem em conjunto.</p>
      <button onClick={() => setOpenCanvas(true)} className="px-8 py-3 bg-[#D8B66C] text-[#291923] font-bold rounded-sm">Abrir Quadro</button>
      {openCanvas && <DrawingCanvas socket={socket} roomCode={roomData?.roomCode} />}
    </div>
  );
}