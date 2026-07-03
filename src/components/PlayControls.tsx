import { useEffect } from 'react';
import { useStore } from '../state/store';

const speeds = [1, 2, 4] as const;

export default function PlayControls() {
  const day = useStore((s) => s.day);
  const playing = useStore((s) => s.playing);
  const speed = useStore((s) => s.speed);
  const setDay = useStore((s) => s.setDay);
  const setPlaying = useStore((s) => s.setPlaying);
  const setSpeed = useStore((s) => s.setSpeed);

  useEffect(() => {
    if (!playing) {
      return;
    }

    const id = setInterval(() => {
      const { day, setDay, setPlaying } = useStore.getState();

      if (day >= 30) {
        setPlaying(false);
        return;
      }

      const nextDay = Math.min(day + 1, 30);
      setDay(nextDay);

      if (nextDay >= 30) {
        setPlaying(false);
      }
    }, Math.round(700 / speed));

    return () => clearInterval(id);
  }, [playing, speed]);

  const togglePlaying = () => {
    if (playing) {
      setPlaying(false);
      return;
    }

    if (day >= 30) {
      setDay(1);
    }

    setPlaying(true);
  };

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        flexWrap: 'wrap',
      }}
    >
      <button className="primary" type="button" onClick={togglePlaying}>
        {playing ? '⏸ Pause' : '▶ Play'}
      </button>

      <button type="button" onClick={() => setDay(1)}>
        ⟲ Restart
      </button>

      <span className="muted" style={{ fontSize: 13 }}>
        Speed
      </span>

      {speeds.map((value) => (
        <button
          key={value}
          className={speed === value ? 'primary' : undefined}
          type="button"
          onClick={() => setSpeed(value)}
        >
          {value}×
        </button>
      ))}
    </div>
  );
}
