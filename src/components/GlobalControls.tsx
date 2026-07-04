import Slider from './Slider';
import Toggle from './Toggle';
import { RANGES, SEAT_PRICE, UNIVERSAL_ULB_MAX_MULTIPLE, enterpriseLimitMaxUsd } from '../model/defaults';
import { creditsToUsd, fmtCredits, fmtInt, fmtPct, fmtUsd, usdToCredits } from '../model/format';
import { useSimResult, useStore } from '../state/store';

export default function GlobalControls() {
  const totalLicenses = useStore((s) => s.inputs.totalLicenses);
  const bizRatio = useStore((s) => s.inputs.bizRatio);
  const activePct = useStore((s) => s.inputs.activePct);
  const avgDevUsageCredits = useStore((s) => s.inputs.avgDevUsageCredits);
  const powerUsers = useStore((s) => s.inputs.powerUsers);
  const avgPowerUserBudgetUsd = useStore((s) => s.inputs.avgPowerUserBudgetUsd);
  const usageVariation = useStore((s) => s.inputs.usageVariation);
  const universalUlbUsd = useStore((s) => s.inputs.universalUlbUsd);
  const enterpriseLimitUsd = useStore((s) => s.inputs.enterpriseLimitUsd);
  const promo = useStore((s) => s.inputs.promo);
  const enterpriseBudgetExcludesCostCenters = useStore((s) => s.inputs.enterpriseBudgetExcludesCostCenters);
  const stopUsageBudgets = useStore((s) => s.inputs.stopUsageBudgets);
  const setInput = useStore((s) => s.setInput);
  const reset = useStore((s) => s.reset);
  const reshuffle = useStore((s) => s.reshuffle);
  const sim = useSimResult();

  // Universal ULB slider max is derived live: 10 x the current average developer
  // monthly usage (docs/formulas.md §2.1). Keep the current value in range so the
  // thumb stays usable if avg usage is lowered below it.
  const universalUlbMax = creditsToUsd(avgDevUsageCredits) * UNIVERSAL_ULB_MAX_MULTIPLE;

  // "Number of power users" max = total users with licenses (dynamic).
  const powerUsersMax = totalLicenses;

  // Enterprise-limit slider max scales with total users (licenses); it is a pure
  // function of totalLicenses, so it only changes when that changes. The current
  // / default value is untouched — kept in range so the thumb stays usable
  // (docs/formulas.md §5.2, §2.2).
  const enterpriseLimitMax = enterpriseLimitMaxUsd(totalLicenses);

  return (
    <section className="panel">
      <h2 style={{ marginTop: 0, marginBottom: 14 }}>Enterprise settings</h2>

      <div style={{ display: 'grid', gap: 14 }}>
        <Slider
          label="Total users with licenses"
          value={totalLicenses}
          min={RANGES.totalLicenses.min}
          max={RANGES.totalLicenses.max}
          step={RANGES.totalLicenses.step}
          onChange={(v) => setInput('totalLicenses', v)}
          format={fmtInt}
          caption={`${fmtUsd(sim.licenseFeesUsd)}/mo license fees · pool ${fmtCredits(sim.poolCredits)}`}
        />

        <Slider
          label="Business / Enterprise ratio"
          value={bizRatio}
          min={RANGES.bizRatio.min}
          max={RANGES.bizRatio.max}
          step={RANGES.bizRatio.step}
          onChange={(v) => setInput('bizRatio', v)}
          format={(v) => `${Math.round(v * 100)}/${Math.round((1 - v) * 100)}`}
          variant="ratio"
          caption={`${fmtInt(sim.businessSeats)} Business ($${sim.businessSeats * SEAT_PRICE.business}) · ${fmtInt(
            sim.enterpriseSeats,
          )} Enterprise ($${sim.enterpriseSeats * SEAT_PRICE.enterprise})`}
        />

        <Slider
          label="Active users (% who actually use licenses)"
          value={activePct}
          min={RANGES.activePct.min}
          max={RANGES.activePct.max}
          step={RANGES.activePct.step}
          onChange={(v) => setInput('activePct', v)}
          format={(v) => fmtPct(v)}
          caption={`${fmtInt(sim.activeUsers)} active users consume credits (pool is funded by all seats)`}
        />

        <div>
          <Slider
            label="Average developer monthly usage"
            value={avgDevUsageCredits}
            min={RANGES.avgDevUsageCredits.min}
            max={RANGES.avgDevUsageCredits.max}
            step={RANGES.avgDevUsageCredits.step}
            onChange={(v) => setInput('avgDevUsageCredits', v)}
            format={fmtCredits}
            caption={`${fmtUsd(creditsToUsd(avgDevUsageCredits))}/mo per active developer`}
          />
          <div className="muted" style={{ fontSize: 12, marginTop: 4 }}>
            Actual consumption of a typical active (normal) developer; power users are modeled separately
            (below). Range starts at one Business seat&apos;s included credits.
          </div>
        </div>

        <Slider
          label="Usage variation"
          value={usageVariation}
          min={RANGES.usageVariation.min}
          max={RANGES.usageVariation.max}
          step={RANGES.usageVariation.step}
          onChange={(v) => setInput('usageVariation', v)}
          format={(v) => fmtPct(v)}
          caption="How uneven usage is across people & days. 0% = everyone uses the same each day (smooth); higher = spiky/uneven, so individual limits get hit sooner."
        />

        <Slider
          label="Universal user-level budget (ULB)"
          value={universalUlbUsd}
          min={RANGES.universalUlbUsd.min}
          max={Math.max(universalUlbMax, universalUlbUsd)}
          step={RANGES.universalUlbUsd.step}
          onChange={(v) => setInput('universalUlbUsd', v)}
          format={(v) => fmtUsd(v)}
          caption={`= ${fmtCredits(usdToCredits(universalUlbUsd))} per user · hard stop · max = 10× avg usage (${fmtUsd(universalUlbMax)})`}
        />

        <div
          style={{
            border: '1px solid var(--border)',
            borderRadius: 10,
            padding: 12,
            background: 'var(--panel-2)',
            display: 'grid',
            gap: 12,
          }}
        >
          <div style={{ fontWeight: 650 }}>Individual budget override for power-users</div>
          <Slider
            label="Number of power users"
            value={powerUsers}
            min={RANGES.powerUsers.min}
            max={Math.max(powerUsersMax, powerUsers)}
            step={RANGES.powerUsers.step}
            onChange={(v) => setInput('powerUsers', v)}
            format={fmtInt}
            caption={`approx. ${totalLicenses > 0 ? Math.round((powerUsers / totalLicenses) * 100) : 0}% of users`}
          />
          <Slider
            label="Average power-user budget"
            value={avgPowerUserBudgetUsd}
            min={RANGES.avgPowerUserBudgetUsd.min}
            max={RANGES.avgPowerUserBudgetUsd.max}
            step={RANGES.avgPowerUserBudgetUsd.step}
            onChange={(v) => setInput('avgPowerUserBudgetUsd', v)}
            format={(v) => fmtUsd(v)}
            caption={`= ${fmtCredits(usdToCredits(avgPowerUserBudgetUsd))} per power user · individual override of the ULB`}
          />
          <div className="muted" style={{ fontSize: 12 }}>
            Distributed across groups in proportion to each group&apos;s <em>active</em> users:
            a group gets <code>round(active × {fmtInt(powerUsers)}/{fmtInt(totalLicenses)})</code> power users
            (≈ {totalLicenses > 0 ? Math.round((powerUsers / totalLicenses) * 100) : 0}% of its active users).
            Per-cost-center counts are shown on each cost center below.
          </div>
        </div>

        <Slider
          label="Enterprise limit (metered budget)"
          value={enterpriseLimitUsd}
          min={RANGES.enterpriseLimitUsd.min}
          max={Math.max(enterpriseLimitMax, enterpriseLimitUsd)}
          step={RANGES.enterpriseLimitUsd.step}
          onChange={(v) => setInput('enterpriseLimitUsd', v)}
          format={(v) => fmtUsd(v)}
          caption={`metered budget on top of licenses · max bill ${fmtUsd(sim.maxBillUsd)}`}
        />

        <Toggle
          label="Enterprise budget excludes cost-center usage"
          checked={enterpriseBudgetExcludesCostCenters}
          onChange={(b) => setInput('enterpriseBudgetExcludesCostCenters', b)}
          caption="When on, the enterprise budget limits only usage NOT in a cost center; each cost center then spends under its own budget on top (raising the max bill). Default off (the budget includes all usage)."
        />

        <Toggle
          label="Promo allowances"
          checked={promo}
          onChange={(b) => setInput('promo', b)}
          caption="3,000 / 7,000 included credits until Sep 1 2026 (otherwise 1,900 / 3,900)"
        />

        <Toggle
          label="Stop usage at budget"
          checked={stopUsageBudgets}
          onChange={(b) => setInput('stopUsageBudgets', b)}
          caption="Hard-stop metered budgets when reached. Real-world default is OFF (alerts only)."
        />

        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <button className="primary" type="button" onClick={reset}>
            Reset to defaults
          </button>
          <button className="" type="button" onClick={reshuffle}>
            Reshuffle usage
          </button>
        </div>
      </div>
    </section>
  );
}
