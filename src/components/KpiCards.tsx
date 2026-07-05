import { useSimResult } from '../state/store';
import { fmtUsd } from '../model/format';

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

  return (
    <div className="hero-instrument">
      <div className="hero-bill">
        <p className="readout-label">Projected month-end bill</p>
        <div className="bill-value">
          {fmtUsd(sim.monthEndBillUsd)}
          <span className="bill-unit">projected /mo</span>
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
          <span className="readout__note">hit a hard stop this month</span>
        </div>
      </div>
    </div>
  );
}
