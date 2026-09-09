import { useState, useRef, useEffect, useCallback } from 'react';

export function useAudio(initialMuted = false) {
  const [isMuted, setIsMuted] = useState(initialMuted);

  // Única instância de Audio ativa
  const audioRef = useRef(null);

  // Ficheiro atualmente associado ao Audio
  const currentFilenameRef = useRef(null);

  // Evita problemas com closures antigas
  const isMutedRef = useRef(initialMuted);

  /**
   * Para completamente o áudio atual.
   *
   * IMPORTANTE:
   * stop() é diferente de mute.
   *
   * mute:
   *   - pausa
   *   - mantém a instância
   *   - permite retomar no unmute
   *
   * stop:
   *   - pausa
   *   - volta para o início
   *   - elimina a referência
   */
  const stop = useCallback(() => {
    const audio = audioRef.current;

    if (audio) {
      try {
        audio.pause();
        audio.currentTime = 0;
      } catch (error) {
        console.warn('[Áudio] Erro ao parar áudio:', error);
      }
    }

    audioRef.current = null;
    currentFilenameRef.current = null;

    console.log('[Áudio] Parado completamente');
  }, []);

  /**
   * Reproduz um ficheiro.
   *
   * Existe sempre apenas uma instância de Audio.
   */
  const play = useCallback((filename, loop = true) => {
    if (!filename) {
      return;
    }

    // Nunca iniciar áudio se estiver mutado.
    if (isMutedRef.current) {
      console.log(`[Áudio] Bloqueado por mute: ${filename}`);
      return;
    }

    // Se já é exatamente o mesmo áudio, não criar outra instância.
    if (
      audioRef.current &&
      currentFilenameRef.current === filename
    ) {
      console.log(`[Áudio] Já está a tocar: ${filename}`);
      return;
    }

    // Parar completamente o áudio anterior.
    if (audioRef.current) {
      try {
        audioRef.current.pause();
        audioRef.current.currentTime = 0;
      } catch (error) {
        console.warn(
          '[Áudio] Erro ao parar áudio anterior:',
          error
        );
      }

      audioRef.current = null;
    }

    try {
      const audio = new Audio(`/audio/${filename}`);

      audio.loop = loop;
      audio.volume = 0.5;
      audio.preload = 'auto';

      // Guardar as refs ANTES do play().
      audioRef.current = audio;
      currentFilenameRef.current = filename;

      const playPromise = audio.play();

      if (playPromise !== undefined) {
        playPromise.catch((error) => {
          /*
           * É normal o browser bloquear autoplay.
           *
           * NÃO fazemos retry automático aqui.
           * Um retry automático pode causar condições de corrida
           * com mute/unmute.
           */
          console.warn(
            `[Áudio] Não foi possível reproduzir ${filename}:`,
            error
          );
        });
      }

      console.log(`[Áudio] A tocar: ${filename}`);
    } catch (error) {
      console.error(
        '[Áudio] Erro ao criar áudio:',
        error
      );

      audioRef.current = null;
      currentFilenameRef.current = null;
    }
  }, []);

  /**
   * Mute / Unmute.
   *
   * Mute:
   *   pause(), mas NÃO destrói o Audio.
   *
   * Unmute:
   *   play() na mesma instância.
   */
  const toggleMute = useCallback(() => {
    setIsMuted((previousMuted) => {
      const nextMuted = !previousMuted;

      // Atualizar imediatamente a ref.
      // Isto é importante para play() não usar
      // um valor antigo de isMuted.
      isMutedRef.current = nextMuted;

      const audio = audioRef.current;

      if (!audio) {
        console.log(
          nextMuted
            ? '[Áudio] Mutado - nenhum áudio ativo'
            : '[Áudio] Som ativado - nenhum áudio para retomar'
        );

        return nextMuted;
      }

      if (nextMuted) {
        // =========================
        // MUTE
        // =========================

        try {
          audio.pause();

          console.log(
            `[Áudio] Mutado: ${currentFilenameRef.current}`
          );
        } catch (error) {
          console.warn(
            '[Áudio] Erro ao fazer mute:',
            error
          );
        }
      } else {
        // =========================
        // UNMUTE
        // =========================

        console.log(
          `[Áudio] Unmute: ${currentFilenameRef.current}`
        );

        audio.play().catch((error) => {
          console.warn(
            '[Áudio] Não foi possível retomar:',
            error
          );
        });
      }

      return nextMuted;
    });
  }, []);

  /**
   * Mantém a ref sincronizada com o state.
   */
  useEffect(() => {
    isMutedRef.current = isMuted;
  }, [isMuted]);

  /**
   * Cleanup completo.
   */
  useEffect(() => {
    return () => {
      const audio = audioRef.current;

      if (audio) {
        try {
          audio.pause();
          audio.currentTime = 0;
        } catch (error) {
          // Ignorar erros durante unmount
        }
      }

      audioRef.current = null;
      currentFilenameRef.current = null;
    };
  }, []);

  return {
    isMuted,
    toggleMute,
    play,
    stop,
  };
}