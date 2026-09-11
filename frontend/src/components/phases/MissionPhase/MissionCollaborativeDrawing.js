import React, { useState, useEffect } from 'react';
import DrawingCanvas from '../../DrawingCanvas';

export default function MissionCollaborativeDrawing({ 
  playerState, 
  onMissionOutcome, 
  socket, 
  roomData,
  playerId
}) {
  const [openCanvas, setOpenCanvas] = useState(false);
  const [drawingStatus, setDrawingStatus] = useState(null);

  useEffect(() => {
    if (!socket) return;

    const onDrawingStatus = (data) => {
      setDrawingStatus(data);
    };

    socket.on('drawing_status', onDrawingStatus);
    return () => socket.off('drawing_status', onDrawingStatus);
  }, [socket]);

  if (playerState.gameMode === 'in_person') {
    return (
      <div className="text-center">
        {/* Instrução conforme o papel */}
        {drawingStatus?.type === 'drawer' && (
          <div className="mb-6 p-4 bg-[#D8B66C]/20 border-2 border-[#D8B66C] rounded-lg">
            <p className="text-white text-sm uppercase tracking-wider">🔒 A tua palavra secreta:</p>
            <p className="text-4xl font-display font-bold text-[#D8B66C] mt-2">
              {drawingStatus.secretWord}
            </p>
            <p className="text-[#F3EBDD]/80 mt-3 text-sm">
              Desenha-a com o dedo nas costas do jogador seguinte. Não mostres a palavra a ninguém!
            </p>
          </div>
        )}

        {drawingStatus?.type === 'guesser' && (
          <div className="mb-6 p-4 bg-[#291923] border border-[#D8B66C]/40 rounded-lg">
            <p className="text-[#F3EBDD]">
              És o último da fila. Diz em voz alta o que achas que foi desenhado nas tuas costas!
            </p>
          </div>
        )}

        {!drawingStatus && (
          <div className="mb-6 p-4 bg-[#291923] border border-[#D8B66C]/30 rounded-lg">
            <p className="text-[#F3EBDD]/60">Aguarda a tua vez na fila...</p>
          </div>
        )}

        <div className="flex justify-center gap-4 flex-wrap">
          <button 
            onClick={() => onMissionOutcome(true)}
            className="px-8 py-3 bg-[#D8B66C] text-[#291923] font-bold rounded-sm"
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

  return (
    <div className="text-center">
      <p className="text-white mb-4">Abram o quadro para desenharem em conjunto.</p>
      <button onClick={() => setOpenCanvas(true)} className="px-8 py-3 bg-[#D8B66C] text-[#291923] font-bold rounded-sm">
        Abrir Quadro
      </button>
      {openCanvas && <DrawingCanvas socket={socket} roomCode={roomData?.roomCode} />}
    </div>
  );
}