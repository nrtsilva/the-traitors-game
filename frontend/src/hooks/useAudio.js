import { useState, useRef, useEffect, useCallback } from 'react';

export function useAudio(initialMuted = false) {
  const [isMuted, setIsMuted] = useState(initialMuted);
  const audioRef = useRef(null);
  const isUnlocked = useRef(false);
  const lastPlayedRef = useRef(null);

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
    if (isMuted || !filename) return;
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }
    try {
      const audio = new Audio(`/audio/${filename}`);
      audio.loop = loop;
      audio.volume = 0.5;
      const playPromise = audio.play();
      if (playPromise !== undefined) {
        playPromise.catch(() => {
          unlockAudio();
          audio.play().catch(() => {});
        });
      }
      audioRef.current = audio;
      lastPlayedRef.current = filename;
    } catch (e) {
      console.error('Erro ao carregar áudio:', e);
    }
  }, [isMuted, unlockAudio]);

  const stop = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }
  }, []);

  const resume = useCallback(() => {
    if (!isMuted && lastPlayedRef.current) {
      play(lastPlayedRef.current);
      return true;
    }
    return false;
  }, [isMuted, play]);

  const toggleMute = useCallback(() => {
    setIsMuted(prev => {
      const newMuted = !prev;
      if (newMuted) {
        stop();
      } else {
        unlockAudio();
        setTimeout(() => resume(), 50);
      }
      return newMuted;
    });
  }, [stop, unlockAudio, resume]);

  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    const handleClick = () => unlockAudio();
    document.addEventListener('click', handleClick);
    return () => document.removeEventListener('click', handleClick);
  }, [unlockAudio]);

  useEffect(() => {
    if (!isMuted) {
      unlockAudio();
      resume();
    }
  }, [isMuted, unlockAudio, resume]);

  return { isMuted, toggleMute, play, stop, resume };
}