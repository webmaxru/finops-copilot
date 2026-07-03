import type { ReactNode } from 'react';

interface ToggleProps {
  label: string;
  checked: boolean;
  onChange: (b: boolean) => void;
  caption?: ReactNode;
  disabled?: boolean;
}

/** Simple checkbox-style toggle with an optional caption line. */
export default function Toggle({ label, checked, onChange, caption, disabled }: ToggleProps) {
  return (
    <label style={{ display: 'block', opacity: disabled ? 0.5 : 1, cursor: 'pointer' }}>
      <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <input
          type="checkbox"
          checked={checked}
          disabled={disabled}
          onChange={(e) => onChange(e.target.checked)}
          style={{ accentColor: 'var(--primary)', width: 16, height: 16 }}
        />
        <span>{label}</span>
      </span>
      {caption != null && (
        <div className="muted" style={{ fontSize: 12, marginTop: 1, marginLeft: 24 }}>
          {caption}
        </div>
      )}
    </label>
  );
}
