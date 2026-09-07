import { useState, useRef, useEffect } from 'react';

export function useAudio(initialMuted = false) {
  const [isMuted, setIsMuted] = useState(initialMuted);
  const audioRef = useRef(null);

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
      audio.play().catch(e => console.log("Áudio bloqueado:", e));
      audioRef.current = audio;
    } catch (e) {
      console.error("Erro áudio", e);
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
      if (!prev) stop();
      return !prev;
    });
  };

  // Limpar áudio ao desmontar
  useEffect(() => stop, []);

  return { isMuted, toggleMute, play, stop };
}