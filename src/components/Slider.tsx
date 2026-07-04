import type { CSSProperties, ReactNode } from 'react';

interface SliderProps {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (v: number) => void;
  /** How to render the current numeric value next to the label. */
  format?: (v: number) => string;
  /** Secondary line under the slider, e.g. the USD equivalent. */
  caption?: ReactNode;
  disabled?: boolean;
  /** 'ratio' renders a two-tone split track (A|B) instead of a fill-vs-empty bar. */
  variant?: 'ratio';
}

/** Labeled range slider with a formatted value and an optional USD caption. */
export default function Slider({
  label,
  value,
  min,
  max,
  step,
  onChange,
  format,
  caption,
  disabled,
  variant,
}: SliderProps) {
  const pos = max > min ? ((value - min) / (max - min)) * 100 : 0;
  const isRatio = variant === 'ratio';
  return (
    <label style={{ display: 'block', opacity: disabled ? 0.5 : 1 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, marginBottom: 2 }}>
        <span>{label}</span>
        <strong>{format ? format(value) : value}</strong>
      </div>
      <input
        type="range"
        className={isRatio ? 'ratio-slider' : undefined}
        min={min}
        max={max}
        step={step}
        value={value}
        disabled={disabled}
        onChange={(e) => onChange(Number(e.target.value))}
        style={
          isRatio
            ? ({ width: '100%', '--pos': `${pos}%` } as CSSProperties)
            : { width: '100%', accentColor: 'var(--primary)' }
        }
      />
      {caption != null && (
        <div className="muted" style={{ fontSize: 12, marginTop: 1 }}>
          {caption}
        </div>
      )}
    </label>
  );
}
