import { useSimResult } from '../state/store';
import { fmtUsd } from '../model/format';
import { blockedReasonEntries } from './blockReasons';
import PromoControl from './PromoControl';

/**
 * Hero instrument cluster: the projected bill as the headline, a bill-composition
 * "meter" (license | metered | headroom, ceiling = max bill) as the signature,
 * and three secondary readouts. Every value/label mirrors the simulation outputs.
 */
export default function KpiCards() {
  const sim = useSimResult();
  const poolExhausted = sim.poolExhaustedDay === null ? 'never' : `day ${sim.poolExhaustedDay}`;

  // Meter geometry — scale to whichever is larger so the bar always fits, and
  // place the ceiling marker at the max-bill position (it sits left of the fill
  // when stop-usage is off and metered runs past the budget).
  const scale = Math.max(sim.maxBillUsd, sim.monthEndBillUsd, 1);
  const licenseW = (sim.licenseFeesUsd / scale) * 100;
  const meteredW = (sim.monthEndMeteredUsd / scale) * 100;
  const ceilingPos = Math.min(100, (sim.maxBillUsd / scale) * 100);
  const over = sim.monthEndBillUsd > sim.maxBillUsd + 0.5;

  // Why the blocked users were cut off (nonzero reasons only) — shown as a
  // distribution under the headline count instead of extra chart lines.
  const blockedReasons = blockedReasonEntries(sim.monthEndBlockedBreakdown);

  return (
    <div className="hero-instrument">
      <div className="hero-bill">
        <p className="readout-label">Projected month-end bill</p>
        <div className="bill-headline">
          <div className="bill-value">
            {fmtUsd(sim.monthEndBillUsd)}
            <span className="bill-unit">projected /mo</span>
          </div>
          <PromoControl />
        </div>
        <div className="bill-split">
          <span>
            <span className="swatch" style={{ background: 'var(--brand)' }} />
            license {fmtUsd(sim.licenseFeesUsd)}
          </span>
          <span className="plus">+</span>
          <span>
            <span className="swatch" style={{ background: 'var(--metered)' }} />
            metered {fmtUsd(sim.monthEndMeteredUsd)}
          </span>
        </div>

        <div
          className="meter"
          role="img"
          aria-label={`Projected bill ${fmtUsd(sim.monthEndBillUsd)} of a maximum ${fmtUsd(sim.maxBillUsd)}`}
        >
          <div className="meter__track">
            <div className="meter__seg meter__seg--license" style={{ left: 0, width: `${licenseW}%` }} />
            <div
              className="meter__seg meter__seg--metered"
              style={{ left: `${licenseW}%`, width: `${meteredW}%` }}
            />
            <div className="meter__ceiling" style={{ left: `${ceilingPos}%` }} />
          </div>
          <div className="meter__scale">
            <span>$0</span>
            <span className={over ? 'over' : 'ceil'}>
              {over ? `over max ${fmtUsd(sim.maxBillUsd)}` : `max ${fmtUsd(sim.maxBillUsd)}`}
            </span>
          </div>
        </div>
      </div>

      <div className="hero-readouts">
        <div className="readout">
          <span className="readout__label">Max possible bill</span>
          <span className="readout__value">{fmtUsd(sim.maxBillUsd)}</span>
          <span className="readout__note">licenses + metered budgets</span>
        </div>
        <div className="readout">
          <span className="readout__label">Pool exhausted</span>
          <span className="readout__value">{poolExhausted}</span>
          <span className="readout__note">{Math.round(sim.poolUsedPct * 100)}% of pool used</span>
        </div>
        <div className="readout">
          <span className="readout__label">Blocked users</span>
          <span className={`readout__value${sim.monthEndBlockedUsers > 0 ? ' is-alert' : ''}`}>
            {sim.monthEndBlockedUsers}/{sim.activeUsers}
          </span>
          {blockedReasons.length > 0 ? (
            <ul className="reason-list" aria-label="Blocked users by reason">
              {blockedReasons.map((r) => (
                <li className="reason-list__item" key={r.key}>
                  <span className="swatch swatch--sm" style={{ background: r.color }} />
                  <span className="reason-list__label">{r.label}</span>
                  <span className="reason-list__count">{r.count}</span>
                </li>
              ))}
            </ul>
          ) : (
            <span className="readout__note">hit a hard stop this month</span>
          )}
        </div>
      </div>
    </div>
  );
}
