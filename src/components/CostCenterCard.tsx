import { useStore, useSimResult } from '../state/store';
import { RANGES, SEAT_PRICE, ccBudgetMaxUsd } from '../model/defaults';
import { fmtUsd, fmtCredits, fmtInt, usdToCredits } from '../model/format';
import type { CostCenter, GroupSeries } from '../model/types';
import Slider from './Slider';
import Toggle from './Toggle';

interface CostCenterCardProps {
  id: string;
}

function ApiOnlyBadge() {
  return (
    <span
      style={{
        fontSize: 10,
        padding: '1px 6px',
        border: '1px solid var(--border)',
        borderRadius: 6,
        color: 'var(--muted)',
        marginLeft: 6,
      }}
    >
      API-only today
    </span>
  );
}

export default function CostCenterCard({ id }: CostCenterCardProps) {
  const cc = useStore((s) => s.inputs.costCenters.find((c) => c.id === id));
  const update = useStore((s) => s.updateCostCenter);
  const remove = useStore((s) => s.removeCostCenter);
  const totalLicenses = useStore((s) => s.inputs.totalLicenses);
  const costCenters = useStore((s) => s.inputs.costCenters);
  const sim = useSimResult();

  if (!cc) return null;

  const series: GroupSeries | undefined = sim.costCenters.find((g) => g.key === id);
  const setPatch = (patch: Partial<CostCenter>) => update(id, patch);

  // A seat belongs to only one cost center, so members across all cost centers
  // cannot exceed total enterprise licenses. Cap this slider at the seats not
  // claimed by other cost centers (keep the current value if it already exceeds
  // that, e.g. after total licenses was lowered, so the thumb stays usable).
  const othersMembers = costCenters
    .filter((c) => c.id !== id)
    .reduce((sum, c) => sum + c.members, 0);
  const available = Math.max(0, totalLicenses - othersMembers);
  const membersMax = Math.min(RANGES.ccMembers.max, Math.max(available, cc.members));

  // Business/Enterprise seat split for this cost center's own ratio (the ratio
  // slider is only shown when the CC does not inherit the enterprise mix, so
  // cc.bizRatio is the effective ratio here). Matches the engine's rounding.
  const ccSeats = series?.seats ?? Math.max(0, Math.round(cc.members));
  const ccBizSeats = Math.round(ccSeats * cc.bizRatio);
  const ccEntSeats = ccSeats - ccBizSeats;

  return (
    <article
      style={{
        border: '1px solid var(--border)',
        borderRadius: 10,
        padding: 12,
        background: 'var(--panel-2)',
        display: 'grid',
        gap: 10,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
        <input
          type="text"
          value={cc.name}
          onChange={(e) => setPatch({ name: e.target.value })}
          style={{
            flex: 1,
            minWidth: 0,
            border: '1px solid var(--border)',
            borderRadius: 8,
            padding: '6px 8px',
            background: 'var(--panel-2)',
            color: 'inherit',
            font: 'inherit',
            fontWeight: 700,
          }}
        />
        <button type="button" onClick={() => remove(id)}>
          Remove
        </button>
      </div>

      <Slider
        label="Members (seats)"
        value={cc.members}
        min={RANGES.ccMembers.min}
        max={membersMax}
        step={RANGES.ccMembers.step}
        onChange={(v) => setPatch({ members: Math.min(v, membersMax) })}
        format={fmtInt}
        caption={`max ${fmtInt(membersMax)} of ${fmtInt(totalLicenses)} licenses · license value ${fmtUsd(
          series?.licenseValueUsd ?? 0,
        )} · funds ${fmtCredits(series?.poolCredits ?? 0)}`}
      />

      <Toggle
        label="Use enterprise Business/Enterprise plan mix"
        checked={cc.planMixInherit}
        onChange={(v) => setPatch({ planMixInherit: v })}
      />
      {!cc.planMixInherit && (
        <Slider
          label="Business / Enterprise ratio"
          value={cc.bizRatio}
          min={RANGES.bizRatio.min}
          max={RANGES.bizRatio.max}
          step={RANGES.bizRatio.step}
          onChange={(v) => setPatch({ bizRatio: v })}
          format={(v) => `${Math.round(v * 100)}/${Math.round((1 - v) * 100)}`}
          caption={`${fmtInt(ccBizSeats)} Business ($${ccBizSeats * SEAT_PRICE.business}) · ${fmtInt(
            ccEntSeats,
          )} Enterprise ($${ccEntSeats * SEAT_PRICE.enterprise})`}
        />
      )}

      <Toggle
        label="Use enterprise ULB"
        checked={cc.userLimitInherit}
        onChange={(v) => setPatch({ userLimitInherit: v })}
      />
      {!cc.userLimitInherit && (
        <Slider
          label="Cost center ULB"
          value={cc.userLimitUsd}
          min={RANGES.ccUserLimitUsd.min}
          max={RANGES.ccUserLimitUsd.max}
          step={RANGES.ccUserLimitUsd.step}
          onChange={(v) => setPatch({ userLimitUsd: v })}
          format={(v) => fmtUsd(v)}
          caption={
            <>
              <ApiOnlyBadge /> = {fmtCredits(usdToCredits(cc.userLimitUsd))} per user (hard stop)
            </>
          }
        />
      )}

      <Slider
        label="Cost center limit (metered budget)"
        value={cc.budgetUsd}
        min={RANGES.ccBudgetUsd.min}
        max={Math.max(ccBudgetMaxUsd(ccSeats), cc.budgetUsd)}
        step={RANGES.ccBudgetUsd.step}
        onChange={(v) => setPatch({ budgetUsd: v })}
        format={(v) => fmtUsd(v)}
        caption={`metered budget on top of this CC's licenses · max ${fmtUsd(
          (series?.licenseValueUsd ?? 0) + cc.budgetUsd,
        )} (= licenses + budget)`}
      />

      <Toggle
        label="Stop usage at CC budget"
        checked={cc.stopUsageBudget}
        onChange={(v) => setPatch({ stopUsageBudget: v })}
      />

      <Toggle
        label="AI credit pool (limit to own licenses)"
        checked={cc.includedCapEnabled}
        onChange={(v) => setPatch({ includedCapEnabled: v })}
        caption={
          <>
            auto-sized {fmtCredits(series?.poolCredits ?? 0)} ({fmtUsd(series?.licenseValueUsd ?? 0)}); beyond
            it, usage continues as metered (subject to budgets)
            <ApiOnlyBadge />
          </>
        }
      />

      <div className="muted" style={{ fontSize: 13 }}>
        This month: metered {fmtUsd(series?.monthEndMeteredUsd ?? 0)} · blocked{' '}
        {series?.monthEndBlockedUsers ?? 0}/{series?.activeUsers ?? 0}
      </div>
    </article>
  );
}
