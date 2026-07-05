import { useStore } from '../state/store';
import { isPromoWindowOpen } from '../model/defaults';
import InfoPopover from './InfoPopover';

/**
 * "Promo period" toggle shown beside the projected bill while GitHub's
 * promotional included allowances apply (Jun 1 – Sep 1 2026). Once the window
 * closes there is nothing to toggle, so the control is removed from the UI.
 */
export default function PromoControl() {
  const promo = useStore((s) => s.inputs.promo);
  const setInput = useStore((s) => s.setInput);

  if (!isPromoWindowOpen()) return null;

  return (
    <label className="header-toggle promo-toggle">
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
