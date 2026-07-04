import type { ReactNode } from 'react';

/** Small "(i)" marker that reveals a description popover on hover/focus. */
export default function InfoPopover({ text }: { text: ReactNode }) {
  return (
    <span className="info" tabIndex={0} role="note" aria-label="More information">
      i
      <span className="info-pop">{text}</span>
    </span>
  );
}
