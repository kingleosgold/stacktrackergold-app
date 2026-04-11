import { useEffect, useRef, useState } from 'react';
import { speak } from '../../services/troy';

interface Props {
  text: string;
  userId: string;
}

type State = 'idle' | 'loading' | 'playing' | 'paused';

export function ListenButton({ text, userId }: Props) {
  const [state, setState] = useState<State>('idle');
  const [error, setError] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const urlRef = useRef<string | null>(null);

  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
      if (urlRef.current) {
        URL.revokeObjectURL(urlRef.current);
        urlRef.current = null;
      }
    };
  }, []);

  const handleClick = async () => {
    setError(null);

    if (state === 'playing') {
      audioRef.current?.pause();
      setState('paused');
      return;
    }

    if (state === 'paused') {
      audioRef.current?.play();
      setState('playing');
      return;
    }

    try {
      setState('loading');
      const blob = await speak(text, userId);
      const url = URL.createObjectURL(blob);
      urlRef.current = url;
      const audio = new Audio(url);
      audio.onended = () => setState('idle');
      audio.onerror = () => {
        setError('Playback failed');
        setState('idle');
      };
      audioRef.current = audio;
      await audio.play();
      setState('playing');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Listen failed');
      setState('idle');
    }
  };

  const label =
    state === 'loading' ? 'Loading…' :
    state === 'playing' ? '❚❚ Pause' :
    state === 'paused' ? '▶ Resume' :
    '▶ Listen';

  return (
    <div className="mt-1.5">
      <button
        onClick={handleClick}
        disabled={state === 'loading'}
        className="text-[11px] text-text-muted hover:text-[#DAA520] transition-colors disabled:opacity-50"
      >
        {label}
      </button>
      {error && <span className="text-[11px] text-[#EF4444] ml-2">{error}</span>}
    </div>
  );
}
