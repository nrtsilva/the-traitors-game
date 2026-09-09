import { useState, useRef, useEffect, useCallback } from 'react';

export function useAudio(initialMuted = false) {
  const [isMuted, setIsMuted] = useState(initialMuted);

  const audioRef = useRef(null);
  const lastPlayedRef = useRef(null);
  const isMutedRef = useRef(initialMuted);
  const isUnlocked = useRef(false);

  const unlockAudio = useCallback(() => {
    if (isUnlocked.current) return;

    const silentAudio = new Audio();
    silentAudio.volume = 0;

    silentAudio.play()
      .then(() => {
        isUnlocked.current = true;
        silentAudio.pause();
        silentAudio.src = '';
      })
      .catch(() => {});
  }, []);

  const play = useCallback((filename, loop = true) => {
    if (isMutedRef.current || !filename) {
      console.log(`[Áudio] Bloqueado: ${filename}`);
      return;
    }

    // Se já existe este áudio a tocar, não fazer nada
    if (
      audioRef.current &&
      lastPlayedRef.current === filename
    ) {
      console.log(`[Áudio] Já está a tocar: ${filename}`);
      return;
    }

    // Parar áudio anterior
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }

    const audio = new Audio(`/audio/${filename}`);

    audio.loop = loop;
    audio.volume = 0.5;

    audioRef.current = audio;
    lastPlayedRef.current = filename;

    audio.play()
      .then(() => {
        console.log(`[Áudio] A tocar: ${filename}`);
      })
      .catch(async (error) => {
        console.warn('[Áudio] Autoplay bloqueado:', error);

        // Tentar desbloquear através da interação do utilizador
        unlockAudio();

        try {
          await audio.play();
        } catch {
          console.warn('[Áudio] Não foi possível iniciar o áudio.');
        }
      });
  }, [unlockAudio]);

  const stop = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      audioRef.current = null;

      console.log('[Áudio] Parado');
    }

    // Muito importante:
    lastPlayedRef.current = null;
  }, []);

  /**
   * Mute / unmute.
   * Não tentamos fazer play/resume dentro do setState.
   */
  const toggleMute = useCallback(() => {
    setIsMuted(prev => {
      const newMuted = !prev;

      isMutedRef.current = newMuted;

      console.log(
        `[Áudio] ${newMuted ? 'Mutar' : 'Desmutar'}`
      );

      return newMuted;
    });
  }, []);

  /**
   * Reage à alteração efetiva do estado de mute.
   */
  useEffect(() => {
    isMutedRef.current = isMuted;

    if (isMuted) {
      // Mute: apenas pausa.
      // Mantemos lastPlayedRef para poder retomar.
      if (audioRef.current) {
        audioRef.current.pause();
        console.log('[Áudio] Mutado / pausado');
      }

      return;
    }

    // Unmute
    if (lastPlayedRef.current) {
      unlockAudio();

      const filename = lastPlayedRef.current;

      // Se o elemento ainda existe, simplesmente retomar
      if (audioRef.current) {
        audioRef.current.play()
          .catch(error => {
            console.warn('[Áudio] Erro ao retomar:', error);
          });

        console.log(`[Áudio] Retomado: ${filename}`);
      } else {
        // Caso o elemento tenha sido destruído,
        // recriar o áudio.
        play(filename);
      }
    }
  }, [isMuted, play, unlockAudio]);

  /**
   * Unlock após interação do utilizador.
   */
  useEffect(() => {
    const handleClick = () => unlockAudio();

    document.addEventListener('click', handleClick);

    return () => {
      document.removeEventListener('click', handleClick);
    };
  }, [unlockAudio]);

  /**
   * Cleanup.
   */
  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, []);

  return {
    isMuted,
    toggleMute,
    play,
    stop
  };
}