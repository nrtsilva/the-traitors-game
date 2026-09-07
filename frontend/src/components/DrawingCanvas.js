import React, { useEffect, useRef, useState } from 'react';

export default function DrawingCanvas({ socket, roomCode }) {
  const canvasRef = useRef(null);
  const ctxRef = useRef(null);
  const [drawingState, setDrawingState] = useState({ type: 'waiting', isYourTurn: false });
  const [guess, setGuess] = useState('');
  const isDrawing = useRef(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    canvas.width = 600;
    canvas.height = 400;
    ctxRef.current = canvas.getContext('2d');
    ctxRef.current.fillStyle = "white";
    ctxRef.current.fillRect(0, 0, canvas.width, canvas.height);
    ctxRef.current.lineWidth = 3;
    ctxRef.current.strokeStyle = 'black';

    socket.on('drawing_update', ({ drawing }) => {
      const ctx = ctxRef.current;
      ctx.beginPath();
      ctx.moveTo(drawing.x0, drawing.y0);
      ctx.lineTo(drawing.x1, drawing.y1);
      ctx.stroke();
    });

    socket.on('drawing_status', (data) => {
      setDrawingState(data);
      if (data.type === 'turn_started' && !data.isYourTurn) {
        isDrawing.current = false;
      }
    });

    return () => {
      socket.off('drawing_update');
      socket.off('drawing_status');
    };
  }, [socket]);

  const getMousePos = (e) => {
    const rect = canvasRef.current.getBoundingClientRect();
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top
    };
  };

  const handleMouseDown = (e) => {
    if (!drawingState.isYourTurn) return;
    isDrawing.current = true;
    const pos = getMousePos(e);
    ctxRef.current.beginPath();
    ctxRef.current.moveTo(pos.x, pos.y);
  };

  const handleMouseMove = (e) => {
    if (!isDrawing.current) return;
    const pos = getMousePos(e);
    ctxRef.current.lineTo(pos.x, pos.y);
    ctxRef.current.stroke();
    
    // Enviar para o servidor (para os outros verem)
    socket.emit('drawing_update', { roomCode, drawing: { x0: pos.x, y0: pos.y, x1: pos.x, y1: pos.y } });
  };

  const handleMouseUp = () => {
    isDrawing.current = false;
  };

  const handleNext = () => {
    socket.emit('next_drawer', { roomCode });
    setDrawingState({ type: 'waiting', isYourTurn: false });
  };

  const handleGuess = () => {
    socket.emit('drawing_guess', { roomCode, guess });
    setGuess('');
  };

  return (
    <div className="fixed inset-0 bg-black/90 flex flex-col items-center justify-center z-50">
      <h2 className="text-4xl font-display text-[#E5C982] mb-4">Desenho Coletivo</h2>
      
      {drawingState.type === 'drawer' && (
        <p className="text-white mb-4">A tua palavra secreta é: <strong className="text-[#D8B66C]">{drawingState.secretWord}</strong></p>
      )}
      {drawingState.type === 'turn_started' && drawingState.isYourTurn && (
        <p className="text-[#F3EBDD] mb-4 font-bold">É A TUA VEZ! Desenha uma forma geométrica.</p>
      )}
      {drawingState.type === 'guessing' && drawingState.isYourTurn && (
        <p className="text-[#F3EBDD] mb-4 font-bold">Agora adivinha o objeto misterioso!</p>
      )}
      {drawingState.type === 'waiting' && (
        <p className="text-[#F3EBDD] mb-4">Aguarda a tua vez...</p>
      )}

      <canvas
        ref={canvasRef}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        className="border-2 border-[#D8B66C] bg-white mb-4 cursor-crosshair"
      />

      {drawingState.type === 'turn_started' && drawingState.isYourTurn && (
        <button onClick={handleNext} className="px-6 py-2 bg-[#D8B66C] text-[#291923] font-bold rounded-sm">Passar a Vez</button>
      )}
      
      {drawingState.type === 'guessing' && drawingState.isYourTurn && (
        <div className="flex gap-2">
          <input
            type="text"
            value={guess}
            onChange={(e) => setGuess(e.target.value)}
            className="px-4 py-2 bg-[#291923] border border-[#D8B66C] text-white rounded-sm"
            placeholder="Qual é o objeto?"
          />
          <button onClick={handleGuess} className="px-6 py-2 bg-[#D8B66C] text-[#291923] font-bold rounded-sm">Adivinhar</button>
        </div>
      )}
    </div>
  );
}