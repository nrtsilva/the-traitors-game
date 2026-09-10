import React, { useState, useEffect, useRef, useCallback } from 'react';

export default function ArsenalTimeStop({ socket, roomData, playerId }) {
  const [gameStarted, setGameStarted] = useState(false);
  const [targets, setTargets] = useState([0.5, 1.0, 1.5]);
  const [tolerance, setTolerance] = useState(0.01);
  const [globalTimer, setGlobalTimer] = useState(0);
  const [currentTargetIndex, setCurrentTargetIndex] = useState(0);
  const [completedTargets, setCompletedTargets] = useState(0);
  const [attempts, setAttempts] = useState(0);
  const [lastResult, setLastResult] = useState(null);
  const [running, setRunning] = useState(false);
  const [displayTime, setDisplayTime] = useState(0);
  const [totalElapsedTime, setTotalElapsedTime] = useState(null);
  const [finalScores, setFinalScores] = useState(null);
  const [notifications, setNotifications] = useState([]);

  const attemptStartRef = useRef(null);
  const rafRef = useRef(null);
  const startedAtRef = useRef(null);

  // --- Socket listeners ---
  useEffect(() => {
    if (!socket) return;

    const onStart = (data) => {
      setTargets(data.targets);
      setTolerance(data.tolerance);
      setGlobalTimer(data.duration);
      setGameStarted(true);
      setCurrentTargetIndex(0);
      setCompletedTargets(0);
      setAttempts(0);
      setLastResult(null);
      setRunning(false);
      setDisplayTime(0);
      setTotalElapsedTime(null);
      setFinalScores(null);
      setNotifications([]);
      startedAtRef.current = Date.now();
    };

    const onResult = (data) => {
      setLastResult(data);
      if (data.success) {
        setCompletedTargets(data.completedTargets);
        if (data.completed) {
          setTotalElapsedTime(data.totalElapsedTime);
        } else {
          setCurrentTargetIndex(prev => prev + 1);
        }
      }
    };

    const onPlayerCompleted = (data) => {
      if (data.playerId !== playerId) {
        setNotifications(prev => [
          ...prev,
          `${data.playerName} completou as 3 metas em ${data.totalElapsedTime.toFixed(3)}s!`
        ]);
      }
    };

    const onEnd = (data) => {
      setFinalScores(data);
    };

    socket.on('time_stop_start', onStart);
    socket.on('time_stop_result', onResult);
    socket.on('time_stop_player_completed', onPlayerCompleted);
    socket.on('time_stop_end', onEnd);

    return () => {
      socket.off('time_stop_start', onStart);
      socket.off('time_stop_result', onResult);
      socket.off('time_stop_player_completed', onPlayerCompleted);
      socket.off('time_stop_end', onEnd);
    };
  }, [socket, playerId]);

  // --- Global countdown ---
  useEffect(() => {
    if (!gameStarted || globalTimer <= 0 || finalScores || totalElapsedTime) return;
    const interval = setInterval(() => {
      setGlobalTimer(prev => (prev <= 1 ? 0 : prev - 1));
    }, 1000);
    return () => clearInterval(interval);
  }, [gameStarted, globalTimer, finalScores, totalElapsedTime]);

  // --- Update loop (requestAnimationFrame) ---
  useEffect(() => {
    if (!running) return;
    
    const tick = () => {
      if (attemptStartRef.current) {
        const elapsed = (performance.now() - attemptStartRef.current) / 1000;
        setDisplayTime(elapsed);
        rafRef.current = requestAnimationFrame(tick);
      }
    };
    
    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [running]);

  // --- Handlers ---
  const handleStart = useCallback(() => {
    if (running || totalElapsedTime || finalScores || globalTimer <= 0) return;
    setLastResult(null);
    attemptStartRef.current = performance.now();
    setRunning(true);
  }, [running, totalElapsedTime, finalScores, globalTimer]);

  const handleStop = useCallback(() => {
    if (!running || !attemptStartRef.current) return;
    const elapsed = (performance.now() - attemptStartRef.current) / 1000;
    setRunning(false);
    setDisplayTime(elapsed);
    
    socket.emit('time_stop_attempt', {
      roomCode: roomData.roomCode,
      elapsedSeconds: elapsed,
    });
  }, [running, socket, roomData]);

  // Atalho: barra de espaço
  useEffect(() => {
    const handleKey = (e) => {
      if (e.code === 'Space') {
        e.preventDefault();
        if (running) handleStop();
        else handleStart();
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [running, handleStart, handleStop]);

  const formatTime = (t) => (t ? t.toFixed(3) : '0.000');

  // ============ ECRÃ FINAL ============
  if (finalScores) {
    const isWinner = finalScores.winnerId === playerId;
    return (
      <div className="fixed inset-0 bg-black/90 flex items-center justify-center z-50">
        <div className="max-w-lg w-full bg-[#291923] border-2 border-[#D8B66C] rounded-lg p-8 text-center">
          <div className="text-7xl mb-4">{isWinner ? '🏆' : '⏱️'}</div>
          <h1 className="font-display text-3xl text-[#E5C982] mb-6">
            {isWinner ? 'Venceste!' : 'Fim do Jogo'}
          </h1>
          <div className="bg-[#291923] border border-[#D8B66C]/40 rounded-lg p-4 mb-4 text-left">
            <h3 className="font-display text-lg text-[#D8B66C] mb-3 text-center">Classificação</h3>
            {finalScores.finalScores.map((s, i) => (
              <div
                key={s.playerId}
                className={`flex justify-between py-1 ${
                  i === 0 ? 'text-[#E5C982] font-bold' : 'text-[#F3EBDD]'
                }`}
              >
                <span>
                  {i + 1}.º {s.playerName}
                </span>
                <span>
                  {s.completedTargets}/{targets.length} metas
                  {s.totalElapsedTime != null && ` — ${s.totalElapsedTime.toFixed(3)}s`}
                  {i === 0 && ' 🏆'}
                </span>
              </div>
            ))}
          </div>
          {isWinner && (
            <p className="text-lg text-[#D8B66C]">Ganhaste 2 moedas de ouro!</p>
          )}
        </div>
      </div>
    );
  }

  // ============ ECRÃ DE ESPERA ============
  if (!gameStarted) {
    return (
      <div className="text-center">
        <h1 className="text-5xl font-bold text-[#E5C982] mb-8">TIME STOP</h1>
        <p className="text-[#F3EBDD] animate-pulse">A preparar o cronómetro...</p>
      </div>
    );
  }

  // ============ ECRÃ DE JOGO ============
  const currentTarget = targets[currentTargetIndex];
  const isCompleted = totalElapsedTime !== null;

  return (
    <div className="text-center">
      <h1 className="text-4xl font-display font-bold text-[#E5C982] mb-2">TIME STOP</h1>
      <p className="text-[#F3EBDD]/60 text-sm mb-4">
        Para o cronómetro exatamente na meta. Quanto mais rápido, melhor!
      </p>

      {/* Header: Timer Global + Metas Concluídas */}
      <div className="flex justify-center items-center gap-8 mb-6">
        <div className="text-center">
          <div className={`w-20 h-20 rounded-full border-4 flex items-center justify-center bg-[#291923] ${
            globalTimer <= 10 ? 'border-red-500' : 'border-[#D8B66C]'
          }`}>
            <span className="font-display text-3xl font-bold text-[#D8B66C]">{globalTimer}</span>
          </div>
          <p className="text-xs text-[#F3EBDD]/60 uppercase tracking-widest mt-1">Tempo</p>
        </div>
        <div className="text-center">
          <div className="w-20 h-20 rounded-full border-4 border-[#D8B66C] flex items-center justify-center bg-[#291923]">
            <span className="font-display text-3xl font-bold text-[#E5C982]">{completedTargets}/3</span>
          </div>
          <p className="text-xs text-[#F3EBDD]/60 uppercase tracking-widest mt-1">Metas</p>
        </div>
      </div>

      {/* Notificações */}
      {notifications.length > 0 && (
        <div className="mb-4 space-y-2">
          {notifications.slice(-3).map((n, i) => (
            <div key={i} className="bg-[#D8B66C]/20 border border-[#D8B66C] rounded-lg px-4 py-2 text-sm text-[#E5C982]">
              🎉 {n}
            </div>
          ))}
        </div>
      )}

      {/* Metas */}
      <div className="flex justify-center gap-4 mb-6">
        {targets.map((t, i) => {
          const done = i < completedTargets;
          const current = i === currentTargetIndex && !isCompleted;
          return (
            <div
              key={i}
              className={`px-4 py-2 rounded-lg border-2 transition-all ${
                done ? 'border-green-500 bg-green-900/20 text-green-400'
                : current ? 'border-[#D8B66C] bg-[#D8B66C]/10 text-[#E5C982] animate-pulse'
                : 'border-[#D8B66C]/30 text-[#F3EBDD]/50'
              }`}
            >
              <span className="text-sm font-bold">{done ? '✓ ' : current ? '🎯 ' : ''}{t.toFixed(3)}s</span>
            </div>
          );
        })}
      </div>

      {/* Cronómetro */}
      <div className="mb-6">
        <div className="text-7xl font-display font-bold text-[#E5C982] tracking-widest tabular-nums">
          {formatTime(displayTime)}
        </div>
        {!isCompleted && !running && !lastResult && (
          <p className="text-sm text-[#F3EBDD]/60 mt-2">
            Meta atual: {currentTarget?.toFixed(3)}s (±{tolerance.toFixed(3)}s)
          </p>
        )}
      </div>

      {/* Resultado da última tentativa */}
      {lastResult && !running && (
        <div className={`mb-6 p-4 rounded-lg border-2 ${
          lastResult.success
            ? 'bg-green-900/20 border-green-500 text-green-400'
            : 'bg-red-900/20 border-red-500 text-red-400'
        }`}>
          {lastResult.success ? (
            <>
              <p className="text-xl font-bold">✅ ACERTO!</p>
              <p className="text-sm mt-1">
                Paraste em {lastResult.elapsed.toFixed(3)}s
                {lastResult.completed
                  ? ` — Completaste as 3 metas! (${lastResult.totalElapsedTime.toFixed(3)}s total)`
                  : ` — Próxima meta: ${lastResult.nextTarget.toFixed(3)}s`}
              </p>
            </>
          ) : (
            <>
              <p className="text-xl font-bold">❌ FALHASTE</p>
              <p className="text-sm mt-1">
                Paraste em {lastResult.elapsed.toFixed(3)}s — Meta: {lastResult.target.toFixed(3)}s
                (diferença: {(lastResult.diff * 1000).toFixed(1)}ms)
              </p>
            </>
          )}
        </div>
      )}

      {/* Concluído */}
      {isCompleted && !finalScores && (
        <div className="mb-6 p-4 rounded-lg border-2 bg-[#D8B66C]/20 border-[#D8B66C] text-[#E5C982]">
          <p className="text-2xl font-bold">🏆 CONCLUÍDO!</p>
          <p className="text-sm mt-1">
            Tempo total: {totalElapsedTime.toFixed(3)}s — Tentativas: {attempts}
          </p>
          <p className="text-xs text-[#F3EBDD]/60 mt-2 animate-pulse">
            A aguardar os outros jogadores...
          </p>
        </div>
      )}

      {/* Botões */}
      {!isCompleted && !finalScores && globalTimer > 0 && (
        <div className="text-center">
          {!running && (
            <button
              onClick={handleStart}
              className="px-16 py-6 bg-[#D8B66C] text-[#291923] font-display font-bold text-2xl uppercase tracking-widest rounded-lg hover:bg-[#E5C982] transition shadow-soft"
            >
              {attempts === 0 ? 'INICIAR' : 'TENTAR NOVAMENTE'}
            </button>
          )}
          {running && (
            <button
              onClick={handleStop}
              className="px-16 py-6 bg-red-600 text-white font-display font-bold text-2xl uppercase tracking-widest rounded-lg hover:bg-red-500 transition shadow-soft animate-pulse"
            >
              PARAR
            </button>
          )}
          <p className="text-xs text-[#F3EBDD]/40 mt-4">
            Dica: usa a barra de espaço
          </p>
        </div>
      )}

      {/* Tempo esgotado */}
      {globalTimer <= 0 && !isCompleted && !finalScores && (
        <div className="mt-6 p-4 rounded-lg border-2 bg-red-900/20 border-red-500 text-red-400">
          <p className="text-xl font-bold">⏰ Tempo esgotado!</p>
        </div>
      )}
    </div>
  );
}