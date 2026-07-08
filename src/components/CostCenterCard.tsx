import { useStore, useSimResult } from '../state/store';
import { RANGES, SEAT_PRICE, ccBudgetMaxUsd } from '../model/defaults';
import { fmtUsd, fmtCredits, fmtInt, usdToCredits, creditsToUsd } from '../model/format';
import type { CostCenter, GroupSeries } from '../model/types';
import Slider from './Slider';
import Toggle from './Toggle';

interface CostCenterCardProps {
  id: string;
}

function ApiOnlyBadge() {
  return (
    <span className="badge" style={{ marginLeft: 6 }}>
      API-only today
    </span>
  );
}

function NewBadge() {
  return (
    <span className="badge badge-new" style={{ marginLeft: 6 }}>
      NEW
    </span>
  );
}

export default function CostCenterCard({ id }: CostCenterCardProps) {
  const cc = useStore((s) => s.inputs.costCenters.find((c) => c.id === id));
  const update = useStore((s) => s.updateCostCenter);
  const remove = useStore((s) => s.removeCostCenter);
  const totalLicenses = useStore((s) => s.inputs.totalLicenses);
  const costCenters = useStore((s) => s.inputs.costCenters);
  const universalUlbUsd = useStore((s) => s.inputs.universalUlbUsd);
  const enterpriseBizRatio = useStore((s) => s.inputs.bizRatio);
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

  // Business/Enterprise seat split — cost centers always use the enterprise
  // ratio (there is no per-CC plan-mix control). Matches the engine's rounding.
  const ccSeats = series?.seats ?? Math.max(0, Math.round(cc.members));
  const ccBizSeats = Math.round(ccSeats * enterpriseBizRatio);
  const ccEntSeats = ccSeats - ccBizSeats;

  return (
    <article className="cc-card">
      <div className="cc-card__head">
        <input
          type="text"
          className="cc-name"
          value={cc.name}
          onChange={(e) => setPatch({ name: e.target.value })}
          aria-label="Cost center name"
        />
        <button type="button" className="btn-ghost" onClick={() => remove(id)}>
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

      <div className="cc-meta" style={{ marginTop: -2 }}>
        {fmtInt(series?.activeUsers ?? 0)} active users ·{' '}
        <strong className="power">{fmtInt(series?.powerUsers ?? 0)} power-users</strong>{' '}
        (individual budget) · {fmtInt(Math.max(0, (series?.activeUsers ?? 0) - (series?.powerUsers ?? 0)))} normal
      </div>

      <div className="cc-meta">
        Enterprise mix {Math.round(enterpriseBizRatio * 100)}/{Math.round((1 - enterpriseBizRatio) * 100)} →{' '}
        {fmtInt(ccBizSeats)} Business (${ccBizSeats * SEAT_PRICE.business}) · {fmtInt(ccEntSeats)} Enterprise ($
        {ccEntSeats * SEAT_PRICE.enterprise}) · license value {fmtUsd(series?.licenseValueUsd ?? 0)}
      </div>

      <Slider
        label="Average developer monthly usage"
        value={cc.avgDevUsageCredits}
        min={RANGES.avgDevUsageCredits.min}
        max={RANGES.avgDevUsageCredits.max}
        step={RANGES.avgDevUsageCredits.step}
        onChange={(v) => setPatch({ avgDevUsageCredits: v })}
        format={fmtCredits}
        caption={`${fmtUsd(creditsToUsd(cc.avgDevUsageCredits))}/mo per active normal developer in this cost center`}
      />

      <Toggle
        label="Cost center ULB"
        labelSuffix={<NewBadge />}
        checked={!cc.userLimitInherit}
        onChange={(v) => setPatch({ userLimitInherit: !v })}
        caption={
          cc.userLimitInherit ? `Enterprise ULB ${fmtUsd(universalUlbUsd)} is used by default` : undefined
        }
      />
      {!cc.userLimitInherit && (
        <Slider
          label="Cost center ULB amount"
          value={cc.userLimitUsd}
          min={RANGES.ccUserLimitUsd.min}
          max={RANGES.ccUserLimitUsd.max}
          step={RANGES.ccUserLimitUsd.step}
          onChange={(v) => setPatch({ userLimitUsd: v })}
          format={(v) => fmtUsd(v)}
          caption={`= ${fmtCredits(usdToCredits(cc.userLimitUsd))} per user (hard stop)`}
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
        labelSuffix={
          <>
            <NewBadge />
            <ApiOnlyBadge />
          </>
        }
        checked={cc.includedCapEnabled}
        onChange={(v) => setPatch({ includedCapEnabled: v })}
        caption={
          <>
            auto-sized {fmtCredits(series?.poolCredits ?? 0)} ({fmtUsd(series?.licenseValueUsd ?? 0)}); beyond
            it, usage continues as metered — subject to budgets and the enterprise overages policy
          </>
        }
      />

      <div className="cc-result">
        This month: metered {fmtUsd(series?.monthEndMeteredUsd ?? 0)} · blocked{' '}
        {series?.monthEndBlockedUsers ?? 0}/{series?.activeUsers ?? 0}
      </div>
    </article>
  );
}
