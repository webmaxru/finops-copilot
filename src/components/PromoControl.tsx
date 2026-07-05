import { useStore } from '../state/store';
import InfoPopover from './InfoPopover';

/** "Promo period" toggle for the header, with an info popover. */
export default function PromoControl() {
  const promo = useStore((s) => s.inputs.promo);
  const setInput = useStore((s) => s.setInput);

  return (
    <label className="header-toggle">
      <input
        type="checkbox"
        className="switch"
        checked={promo}
        onChange={(e) => setInput('promo', e.target.checked)}
      />
      <span>Promo period</span>
      <InfoPopover
        text={
          <>
            Promotional included allowances for existing customers: <strong>3,000</strong> (Business) /{' '}
            <strong>7,000</strong> (Enterprise) AI credits per license per month for the first three months of
            usage-based billing (June 1 – Sep 1, 2026). Otherwise 1,900 / 3,900.
          </>
        }
      />
    </label>
  );
}
