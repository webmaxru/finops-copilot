import Slider from './Slider';
import Toggle from './Toggle';
import { RANGES, SEAT_PRICE } from '../model/defaults';
import { creditsToUsd, fmtCredits, fmtInt, fmtMultiplier, fmtPct, fmtUsd, usdToCredits } from '../model/format';
import { useSimResult, useStore } from '../state/store';

export default function GlobalControls() {
  const totalLicenses = useStore((s) => s.inputs.totalLicenses);
  const bizRatio = useStore((s) => s.inputs.bizRatio);
  const activePct = useStore((s) => s.inputs.activePct);
  const avgDevUsageCredits = useStore((s) => s.inputs.avgDevUsageCredits);
  const powerRatio = useStore((s) => s.inputs.powerRatio);
  const powerMultiplier = useStore((s) => s.inputs.powerMultiplier);
  const usageVariation = useStore((s) => s.inputs.usageVariation);
  const individualLimitUsd = useStore((s) => s.inputs.individualLimitUsd);
  const enterpriseLimitMultiple = useStore((s) => s.inputs.enterpriseLimitMultiple);
  const promo = useStore((s) => s.inputs.promo);
  const stopUsageBudgets = useStore((s) => s.inputs.stopUsageBudgets);
  const setInput = useStore((s) => s.setInput);
  const reset = useStore((s) => s.reset);
  const reshuffle = useStore((s) => s.reshuffle);
  const sim = useSimResult();

  return (
    <section className="panel">
      <h2 style={{ marginTop: 0, marginBottom: 14 }}>Enterprise settings</h2>

      <div style={{ display: 'grid', gap: 14 }}>
        <Slider
          label="Total licenses"
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
            Actual consumption of a typical active developer; power users spend more (below). Range starts at one
            Business seat&apos;s included credits.
          </div>
        </div>

        <Slider
          label="Power-user ratio"
          value={powerRatio}
          min={RANGES.powerRatio.min}
          max={RANGES.powerRatio.max}
          step={RANGES.powerRatio.step}
          onChange={(v) => setInput('powerRatio', v)}
          format={(v) => fmtPct(v)}
          caption={`≈ ${fmtInt(Math.round(sim.activeUsers * powerRatio))} power users`}
        />

        <Slider
          label="Power-user multiplier"
          value={powerMultiplier}
          min={RANGES.powerMultiplier.min}
          max={RANGES.powerMultiplier.max}
          step={RANGES.powerMultiplier.step}
          onChange={(v) => setInput('powerMultiplier', v)}
          format={fmtMultiplier}
          caption={`power users ≈ ${fmtUsd(creditsToUsd(avgDevUsageCredits * powerMultiplier))}/mo`}
        />

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
          label="Individual limit (per-user budget)"
          value={individualLimitUsd}
          min={RANGES.individualLimitUsd.min}
          max={RANGES.individualLimitUsd.max}
          step={RANGES.individualLimitUsd.step}
          onChange={(v) => setInput('individualLimitUsd', v)}
          format={(v) => fmtUsd(v)}
          caption={`= ${fmtCredits(usdToCredits(individualLimitUsd))} per user · hard stop (pool + metered)`}
        />

        <Slider
          label="Enterprise limit (metered budget)"
          value={enterpriseLimitMultiple}
          min={RANGES.enterpriseLimitMultiple.min}
          max={RANGES.enterpriseLimitMultiple.max}
          step={RANGES.enterpriseLimitMultiple.step}
          onChange={(v) => setInput('enterpriseLimitMultiple', v)}
          format={fmtMultiplier}
          caption={`metered budget ${fmtUsd(sim.enterpriseBudgetUsd)} · max bill ${fmtUsd(
            sim.maxBillUsd,
          )} (= licenses + budget)`}
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
