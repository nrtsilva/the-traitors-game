import { useState, useRef, useEffect, useCallback } from 'react';

export function useAudio(initialMuted = false) {
  const [isMuted, setIsMuted] = useState(initialMuted);

  // Única instância de áudio ativa
  const audioRef = useRef(null);

  // Nome do último áudio que deve ser retomado
  const lastPlayedRef = useRef(null);

  // Evita problemas com closures antigas
  const isMutedRef = useRef(initialMuted);

  // Browser autoplay unlock
  const isUnlockedRef = useRef(false);

  /**
   * Desbloqueia o áudio no browser.
   */
  const unlockAudio = useCallback(() => {
    if (isUnlockedRef.current) return;

    const silentAudio = new Audio();
    silentAudio.volume = 0;

    silentAudio
      .play()
      .then(() => {
        isUnlockedRef.current = true;

        silentAudio.pause();
        silentAudio.src = '';
      })
      .catch(() => {
        // O browser pode bloquear o autoplay.
        // Tentaremos novamente através de uma interação do utilizador.
      });
  }, []);

  /**
   * Para completamente o áudio atual.
   *
   * IMPORTANTE:
   * Ao contrário do mute, stop() esquece qual era o áudio.
   */
  const stop = useCallback(() => {
    if (audioRef.current) {
      try {
        audioRef.current.pause();
        audioRef.current.currentTime = 0;
      } catch (error) {
        console.warn('[Áudio] Erro ao parar áudio:', error);
      }

      audioRef.current = null;
    }

    lastPlayedRef.current = null;

    console.log('[Áudio] Parado completamente');
  }, []);

  /**
   * Reproduz um ficheiro.
   *
   * Existe sempre apenas uma instância de Audio.
   */
  const play = useCallback(
    (filename, loop = true) => {
      if (!filename) return;

      // Se estiver mutado, não inicia nada.
      if (isMutedRef.current) {
        console.log(`[Áudio] Bloqueado por mute: ${filename}`);

        // Guardamos o ficheiro para poder retomá-lo no unmute.
        lastPlayedRef.current = filename;

        return;
      }

      // Se já é exatamente o mesmo áudio e ainda existe uma instância,
      // não criamos outra.
      if (
        lastPlayedRef.current === filename &&
        audioRef.current
      ) {
        console.log(`[Áudio] Já está a tocar: ${filename}`);
        return;
      }

      // Mata SEMPRE a instância anterior antes de criar outra.
      if (audioRef.current) {
        try {
          audioRef.current.pause();
          audioRef.current.currentTime = 0;
        } catch (error) {
          console.warn('[Áudio] Erro ao parar áudio anterior:', error);
        }

        audioRef.current = null;
      }

      try {
        const audio = new Audio(`/audio/${filename}`);

        audio.loop = loop;
        audio.volume = 0.5;
        audio.preload = 'auto';

        // Guardamos as refs ANTES de chamar play().
        // Isto evita condições de corrida.
        audioRef.current = audio;
        lastPlayedRef.current = filename;

        const playPromise = audio.play();

        if (playPromise !== undefined) {
          playPromise.catch(() => {
            // Se o browser bloqueou o autoplay, tentamos desbloquear.
            unlockAudio();

            // Nunca voltar a tocar se o utilizador já tiver feito mute.
            if (isMutedRef.current) {
              console.log(
                `[Áudio] Reprodução cancelada por mute: ${filename}`
              );
              return;
            }

            audio.play().catch((error) => {
              console.warn(
                `[Áudio] Não foi possível reproduzir ${filename}:`,
                error
              );
            });
          });
        }

        console.log(`[Áudio] A tocar: ${filename}`);
      } catch (error) {
        console.error('[Áudio] Erro ao criar áudio:', error);

        audioRef.current = null;
      }
    },
    [unlockAudio]
  );

  /**
   * Mute / Unmute.
   *
   * NÃO usamos stop() aqui.
   * Mute = pausa.
   * Stop = destrói o áudio.
   */
  const toggleMute = useCallback(() => {
    setIsMuted((previousMuted) => {
      const nextMuted = !previousMuted;

      // Atualizar imediatamente a ref evita stale closures.
      isMutedRef.current = nextMuted;

      console.log(
        `[Áudio] ${nextMuted ? 'Mutar' : 'Desmutar'}`
      );

      if (nextMuted) {
        // MUTE:
        // pausa mas mantém a referência e o filename.
        if (audioRef.current) {
          try {
            audioRef.current.pause();
          } catch (error) {
            console.warn(
              '[Áudio] Erro ao fazer mute:',
              error
            );
          }
        }
      } else {
        // UNMUTE:
        unlockAudio();

        if (audioRef.current) {
          // Temos o objeto original.
          audioRef.current.play().catch((error) => {
            console.warn(
              '[Áudio] Não foi possível retomar áudio:',
              error
            );
          });
        } else if (lastPlayedRef.current) {
          // Caso a instância tenha desaparecido,
          // reconstruímos o último áudio.
          const filename = lastPlayedRef.current;

          // play() vai verificar isMutedRef.current.
          play(filename);
        }
      }

      return nextMuted;
    });
  }, [play, unlockAudio]);

  /**
   * Mantém a ref sincronizada com o estado React.
   */
  useEffect(() => {
    isMutedRef.current = isMuted;
  }, [isMuted]);

  /**
   * Desbloqueia o áudio na primeira interação do utilizador.
   */
  useEffect(() => {
    const handleClick = () => {
      unlockAudio();
    };

    document.addEventListener('click', handleClick);

    return () => {
      document.removeEventListener('click', handleClick);
    };
  }, [unlockAudio]);

  /**
   * Cleanup completo.
   */
  useEffect(() => {
    return () => {
      if (audioRef.current) {
        try {
          audioRef.current.pause();
          audioRef.current.currentTime = 0;
        } catch (error) {
          // Ignorar erros durante unmount
        }

        audioRef.current = null;
      }

      lastPlayedRef.current = null;
    };
  }, []);

  return {
    isMuted,
    toggleMute,
    play,
    stop,
  };
}