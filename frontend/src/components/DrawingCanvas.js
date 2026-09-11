import React, { useEffect, useRef, useState } from 'react';

export default function DrawingCanvas({ socket, roomCode }) {
  const canvasRef = useRef(null);
  const containerRef = useRef(null);
  const ctxRef = useRef(null);
  const [drawingState, setDrawingState] = useState({ type: 'waiting', isYourTurn: false });
  const [guess, setGuess] = useState('');
  const [isFullscreen, setIsFullscreen] = useState(false);
  const isDrawing = useRef(false);

  // ====== INICIALIZAÇÃO DO CANVAS ======
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    canvas.width = 600;
    canvas.height = 400;
    ctxRef.current = canvas.getContext('2d');
    ctxRef.current.fillStyle = 'white';
    ctxRef.current.fillRect(0, 0, canvas.width, canvas.height);
    ctxRef.current.lineWidth = 3;
    ctxRef.current.strokeStyle = 'black';
    ctxRef.current.lineCap = 'round';
    ctxRef.current.lineJoin = 'round';

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

  // ====== FULLSCREEN + ORIENTAÇÃO ======
  const toggleFullscreen = async () => {
    const el = containerRef.current;
    if (!el) return;

    try {
      if (!document.fullscreenElement) {
        const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
        if (isIOS) {
          alert('Roda o teu telemóvel para a horizontal para mostrar o desenho aos outros.');
        }
        // Entrar em fullscreen
        if (el.requestFullscreen) {
          await el.requestFullscreen();
        } else if (el.webkitRequestFullscreen) {
          await el.webkitRequestFullscreen();
        } else if (el.msRequestFullscreen) {
          await el.msRequestFullscreen();
        }

        // Tentar bloquear orientação em landscape (funciona em Android)
        const screenOrientation = window.screen?.orientation;
        if (screenOrientation && screenOrientation.lock) {
          try {
            await screenOrientation.lock('landscape');
          } catch (err) {
            console.log('Bloqueio de orientação não suportado neste dispositivo.');
          }
        }
      } else {
        // Sair do fullscreen
        if (document.exitFullscreen) {
          await document.exitFullscreen();
        } else if (document.webkitExitFullscreen) {
          await document.webkitExitFullscreen();
        } else if (document.msExitFullscreen) {
          await document.msExitFullscreen();
        }

        const screenOrientation = window.screen?.orientation;
        if (screenOrientation && screenOrientation.unlock) {
          try { screenOrientation.unlock(); } catch (err) {}
        }
      }
    } catch (err) {
      console.error('Erro ao alternar fullscreen:', err);
    }
  };

  // Sincronizar estado com o browser
  useEffect(() => {
    const onFsChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', onFsChange);
    document.addEventListener('webkitfullscreenchange', onFsChange);
    return () => {
      document.removeEventListener('fullscreenchange', onFsChange);
      document.removeEventListener('webkitfullscreenchange', onFsChange);
    };
  }, []);

  // ====== COORDENADAS (mouse + touch) ======
  const getPointerPos = (e, canvas) => {
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;

    let clientX, clientY;
    if (e.touches && e.touches.length > 0) {
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else {
      clientX = e.clientX;
      clientY = e.clientY;
    }

    return {
      x: (clientX - rect.left) * scaleX,
      y: (clientY - rect.top) * scaleY,
    };
  };

  // ====== HANDLERS DE DESENHO ======
  const handleDown = (e) => {
    if (!drawingState.isYourTurn) return;
    e.preventDefault();
    isDrawing.current = true;
    const canvas = canvasRef.current;
    const pos = getPointerPos(e, canvas);
    ctxRef.current.beginPath();
    ctxRef.current.moveTo(pos.x, pos.y);
  };

  const handleMove = (e) => {
    if (!isDrawing.current) return;
    e.preventDefault();
    const canvas = canvasRef.current;
    const pos = getPointerPos(e, canvas);

    ctxRef.current.lineTo(pos.x, pos.y);
    ctxRef.current.stroke();

    // Enviar para o servidor (os outros veem em tempo real)
    socket.emit('drawing_update', {
      roomCode,
      drawing: { x0: pos.x, y0: pos.y, x1: pos.x, y1: pos.y },
    });
  };

  const handleUp = () => {
    isDrawing.current = false;
  };

  // ====== LÓGICA DE TURNO ======
  const handleNext = () => {
    socket.emit('next_drawer', { roomCode });
    setDrawingState({ type: 'waiting', isYourTurn: false });
  };

  const handleGuess = () => {
    socket.emit('drawing_guess', { roomCode, guess });
    setGuess('');
  };

  // ====== RENDER ======
  return (
    <div
      ref={containerRef}
      className={`${
        isFullscreen
          ? 'fixed inset-0 z-[200] bg-black flex flex-col items-center justify-center p-2'
          : 'fixed inset-0 bg-black/90 flex flex-col items-center justify-center z-50 p-4'
      }`}
    >
      {!isFullscreen && (
        <h2 className="text-3xl font-display text-[#E5C982] mb-4">Desenho Coletivo</h2>
      )}

      {/* Instruções conforme o turno */}
      {!isFullscreen && (
        <>
          {drawingState.type === 'drawer' && (
            <p className="text-white mb-2 text-sm">
              A tua palavra secreta é: <strong className="text-[#D8B66C]">{drawingState.secretWord}</strong>
            </p>
          )}
          {drawingState.type === 'turn_started' && drawingState.isYourTurn && (
            <p className="text-[#F3EBDD] mb-2 font-bold text-sm">É A TUA VEZ! Desenha uma forma geométrica.</p>
          )}
          {drawingState.type === 'guessing' && drawingState.isYourTurn && (
            <p className="text-[#F3EBDD] mb-2 font-bold text-sm">Agora adivinha o objeto misterioso!</p>
          )}
          {drawingState.type === 'waiting' && (
            <p className="text-[#F3EBDD] mb-2 text-sm">Aguarda a tua vez...</p>
          )}
        </>
      )}

      {/* WRAPPER do canvas + botão fullscreen */}
      <div className="relative w-full max-w-4xl">
        <canvas
          ref={canvasRef}
          onMouseDown={handleDown}
          onMouseMove={handleMove}
          onMouseUp={handleUp}
          onMouseLeave={handleUp}
          onTouchStart={handleDown}
          onTouchMove={handleMove}
          onTouchEnd={handleUp}
          className="border-2 border-[#D8B66C] bg-white w-full h-auto cursor-crosshair touch-none"
          style={{
            maxHeight: isFullscreen ? '90vh' : '60vh',
            objectFit: 'contain',
          }}
        />

        {/* Botão de fullscreen (canto superior direito do canvas) */}
        <button
          onClick={toggleFullscreen}
          className="absolute top-2 right-2 z-10 px-3 py-2 bg-[#291923]/90 border border-[#D8B66C] text-[#E5C982] rounded-sm hover:bg-[#412734] transition text-sm font-bold flex items-center gap-1"
          title={isFullscreen ? 'Sair do Fullscreen' : 'Mostrar aos outros (Fullscreen)'}
        >
          {isFullscreen ? '⤢ Sair' : '⤢ Fullscreen'}
        </button>
      </div>

      {/* Botões (só fora do fullscreen, para não poluir) */}
      {!isFullscreen && (
        <div className="mt-4 flex flex-wrap gap-2 justify-center">
          {drawingState.type === 'turn_started' && drawingState.isYourTurn && (
            <button onClick={handleNext} className="px-6 py-2 bg-[#D8B66C] text-[#291923] font-bold rounded-sm">
              Passar a Vez
            </button>
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
              <button onClick={handleGuess} className="px-6 py-2 bg-[#D8B66C] text-[#291923] font-bold rounded-sm">
                Adivinhar
              </button>
            </div>
          )}

          {/* Fechar o quadro (só se não estiver em fullscreen) */}
          <button
            onClick={() => {
              if (socket) socket.emit('close_canvas', { roomCode });
            }}
            className="px-6 py-2 bg-[#412734] text-[#F3EBDD] border border-[#D8B66C]/50 rounded-sm"
          >
            Fechar Quadro
          </button>
        </div>
      )}

      {isFullscreen && (
        <p className="mt-2 text-[#F3EBDD]/60 text-xs">
          Mostra o teu voto aos outros jogadores. Toca no botão "Sair" para voltar.
        </p>
      )}
    </div>
  );
}