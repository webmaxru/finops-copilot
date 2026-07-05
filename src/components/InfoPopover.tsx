import { useId } from 'react';
import type { ReactNode } from 'react';

/** Small "(i)" marker that reveals a description popover on hover/focus. */
export default function InfoPopover({ text }: { text: ReactNode }) {
  const tipId = useId();
  return (
    <span className="info">
      <button
        type="button"
        className="info__trigger"
        aria-label="More information"
        aria-describedby={tipId}
      >
        i
      </button>
      <span role="tooltip" id={tipId} className="info-pop">
        {text}
      </span>
    </span>
  );
}
