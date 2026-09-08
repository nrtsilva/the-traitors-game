import { useState, useRef, useEffect } from 'react';

export function useAudio(initialMuted = false) {
  const [isMuted, setIsMuted] = useState(initialMuted);
  const audioRef = useRef(null);
  const isUnlocked = useRef(false);

  // Função para desbloquear o áudio (chamada no primeiro clique)
  const unlockAudio = () => {
    if (isUnlocked.current) return;
    // Cria um áudio silencioso e toca para desbloquear
    const silentAudio = new Audio();
    silentAudio.volume = 0;
    silentAudio.play()
      .then(() => {
        isUnlocked.current = true;
        silentAudio.pause();
        silentAudio.src = '';
      })
      .catch(() => {});
  };

  const play = (filename, loop = true) => {
    if (isMuted || !filename) return;
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }
    try {
      const audio = new Audio(`/audio/${filename}`);
      audio.loop = loop;
      audio.volume = 0.5;
      // Tenta reproduzir; se falhar, pode ser devido ao autoplay
      const playPromise = audio.play();
      if (playPromise !== undefined) {
        playPromise.catch(() => {
          // Se falhar, tenta novamente após unlock
          unlockAudio();
          audio.play().catch(() => {});
        });
      }
      audioRef.current = audio;
    } catch (e) {
      console.error('Erro ao carregar áudio:', e);
    }
  };

  const stop = () => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }
  };

  const toggleMute = () => {
    setIsMuted(prev => {
      if (!prev) {
        // Ao desmutar, tenta desbloquear e recriar o áudio
        unlockAudio();
        // Se houver um áudio atual, recria-o para tocar
        // (opcional)
      }
      return !prev;
    });
  };

  // Limpeza ao desmontar
  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, []);

  // Tentar desbloquear no primeiro clique global
  useEffect(() => {
    const handleClick = () => unlockAudio();
    document.addEventListener('click', handleClick);
    return () => document.removeEventListener('click', handleClick);
  }, []);

  return { isMuted, toggleMute, play, stop };
}