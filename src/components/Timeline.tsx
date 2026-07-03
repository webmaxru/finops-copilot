import PlayControls from './PlayControls';
import { useStore } from '../state/store';

export default function Timeline() {
  const day = useStore((s) => s.day);
  const setDay = useStore((s) => s.setDay);

  return (
    <section
      className="panel"
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 12,
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'baseline',
          justifyContent: 'space-between',
          gap: 12,
        }}
      >
        <div>
          Day <strong>{day}</strong> / 30
        </div>
        <div className="muted" style={{ fontSize: 13 }}>
          drag to scrub, or press play
        </div>
      </div>

      <input
        type="range"
        min={1}
        max={30}
        step={1}
        value={day}
        onChange={(event) => setDay(Number(event.target.value))}
        style={{
          width: '100%',
          accentColor: 'var(--primary)',
        }}
      />

      <PlayControls />
    </section>
  );
}
