import { useStore, useSimResult } from '../state/store';
import { RANGES } from '../model/defaults';
import { fmtUsd, fmtCredits, fmtInt, fmtMultiplier, usdToCredits } from '../model/format';
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
        label="Use enterprise plan mix"
        checked={cc.planMixInherit}
        onChange={(v) => setPatch({ planMixInherit: v })}
      />
      {!cc.planMixInherit && (
        <Slider
          label="Business share"
          value={cc.bizRatio}
          min={RANGES.bizRatio.min}
          max={RANGES.bizRatio.max}
          step={RANGES.bizRatio.step}
          onChange={(v) => setPatch({ bizRatio: v })}
          format={(v) => `${Math.round(v * 100)}/${Math.round((1 - v) * 100)}`}
        />
      )}

      <Toggle
        label="Use universal ULB"
        checked={cc.userLimitInherit}
        onChange={(v) => setPatch({ userLimitInherit: v })}
        caption={<ApiOnlyBadge />}
      />
      {!cc.userLimitInherit && (
        <Slider
          label="CC per-user limit"
          value={cc.userLimitUsd}
          min={RANGES.ccUserLimitUsd.min}
          max={RANGES.ccUserLimitUsd.max}
          step={RANGES.ccUserLimitUsd.step}
          onChange={(v) => setPatch({ userLimitUsd: v })}
          format={(v) => fmtUsd(v)}
          caption={`= ${fmtCredits(usdToCredits(cc.userLimitUsd))} per user (hard stop)`}
        />
      )}

      <Toggle
        label="Use default budget (1× license value)"
        checked={cc.budgetMultipleInherit}
        onChange={(v) => setPatch({ budgetMultipleInherit: v })}
      />
      {!cc.budgetMultipleInherit && (
        <Slider
          label="CC metered budget"
          value={cc.budgetMultiple}
          min={RANGES.ccBudgetMultiple.min}
          max={RANGES.ccBudgetMultiple.max}
          step={RANGES.ccBudgetMultiple.step}
          onChange={(v) => setPatch({ budgetMultiple: v })}
          format={fmtMultiplier}
          caption={`${fmtUsd(cc.budgetMultiple * (series?.licenseValueUsd ?? 0))} metered budget`}
        />
      )}

      <Toggle
        label="Stop usage at CC budget"
        checked={cc.stopUsageBudget}
        onChange={(v) => setPatch({ stopUsageBudget: v })}
      />

      <Toggle
        label="Included-usage cap (limit to own licenses)"
        checked={cc.includedCapEnabled}
        onChange={(v) => setPatch({ includedCapEnabled: v })}
        caption={
          <>
            auto-sized {fmtCredits(series?.poolCredits ?? 0)} ({fmtUsd(series?.licenseValueUsd ?? 0)})
            <ApiOnlyBadge />
          </>
        }
      />
      {cc.includedCapEnabled && (
        <div style={{ display: 'flex', gap: 8 }}>
          <button
            type="button"
            className={cc.includedCapMode === 'block' ? 'primary' : undefined}
            onClick={() => setPatch({ includedCapMode: 'block' })}
          >
            Block
          </button>
          <button
            type="button"
            className={cc.includedCapMode === 'overage' ? 'primary' : undefined}
            onClick={() => setPatch({ includedCapMode: 'overage' })}
          >
            Overage
          </button>
        </div>
      )}

      <div className="muted" style={{ fontSize: 13 }}>
        This month: metered {fmtUsd(series?.monthEndMeteredUsd ?? 0)} · blocked{' '}
        {series?.monthEndBlockedUsers ?? 0}/{series?.activeUsers ?? 0}
      </div>
    </article>
  );
}
