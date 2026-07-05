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
    <label className={`control${disabled ? ' is-disabled' : ''}`}>
      <div className="control__head">
        <span className="control__label">{label}</span>
        <span className="control__value">{format ? format(value) : value}</span>
      </div>
      <input
        type="range"
        className={isRatio ? 'range range--ratio' : 'range'}
        min={min}
        max={max}
        step={step}
        value={value}
        disabled={disabled}
        onChange={(e) => onChange(Number(e.target.value))}
        style={{ '--pos': `${pos}%` } as CSSProperties}
      />
      {caption != null && <div className="control__caption">{caption}</div>}
    </label>
  );
}
