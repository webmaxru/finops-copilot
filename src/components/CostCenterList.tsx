import { useStore, useSimResult } from '../state/store';
import { fmtInt } from '../model/format';
import CostCenterCard from './CostCenterCard';

export default function CostCenterList() {
  const addCostCenter = useStore((s) => s.addCostCenter);
  const costCenters = useStore((s) => s.inputs.costCenters);
  const totalLicenses = useStore((s) => s.inputs.totalLicenses);
  const sim = useSimResult();

  const assigned = costCenters.reduce((sum, c) => sum + c.members, 0);
  const remaining = totalLicenses - assigned;
  const over = remaining < 0;
  const full = remaining <= 0;

  return (
    <section className="panel" style={{ display: 'grid', gap: 12 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
        <h2 style={{ margin: 0 }}>Cost centers</h2>
        <button type="button" onClick={addCostCenter} disabled={full} title={full ? 'No licenses left to assign' : undefined}>
          Add cost center
        </button>
      </div>

      <div style={{ fontSize: 13, color: over ? 'var(--limit)' : 'var(--muted)' }}>
        {fmtInt(assigned)} / {fmtInt(totalLicenses)} licenses assigned to cost centers ·{' '}
        {fmtInt(Math.max(0, remaining))} unassigned
        {over ? ' · exceeds total licenses — reduce members' : ''}
      </div>

      {costCenters.map((cc) => (
        <CostCenterCard key={cc.id} id={cc.id} />
      ))}

      <div className="muted" style={{ fontSize: 13 }}>
        Unassigned: {fmtInt(sim.unassigned.seats)} seats ({fmtInt(sim.unassigned.activeUsers)} active) · draw from
        the shared pool under the enterprise limits
      </div>
    </section>
  );
}
