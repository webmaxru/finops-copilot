import type { ReactNode } from 'react';

interface ToggleProps {
  label: string;
  checked: boolean;
  onChange: (b: boolean) => void;
  caption?: ReactNode;
  disabled?: boolean;
  /** Optional badges/markers rendered right after the label (consistent position). */
  labelSuffix?: ReactNode;
}

/** Simple checkbox-style toggle with an optional caption line. */
export default function Toggle({ label, checked, onChange, caption, disabled, labelSuffix }: ToggleProps) {
  return (
    <label className={`toggle${disabled ? ' is-disabled' : ''}`}>
      <span className="toggle__row">
        <input
          type="checkbox"
          className="switch"
          checked={checked}
          disabled={disabled}
          onChange={(e) => onChange(e.target.checked)}
        />
        <span className="toggle__label">
          {label}
          {labelSuffix}
        </span>
      </span>
      {caption != null && <div className="toggle__caption muted">{caption}</div>}
    </label>
  );
}
