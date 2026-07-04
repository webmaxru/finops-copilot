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
      <div
        style={{
          display: 'flex',
          alignItems: 'baseline',
          justifyContent: 'space-between',
          gap: 12,
          flexWrap: 'wrap',
        }}
      >
        <h2 style={{ margin: 0 }}>Cost centers</h2>
        <span style={{ fontSize: 13, color: over ? 'var(--limit)' : 'var(--muted)' }}>
          {fmtInt(assigned)}/{fmtInt(totalLicenses)} licenses assigned · {fmtInt(Math.max(0, remaining))}{' '}
          unassigned{over ? ' · exceeds total — reduce members' : ''}
        </span>
      </div>

      <div className="cc-grid">
        {costCenters.map((cc) => (
          <CostCenterCard key={cc.id} id={cc.id} />
        ))}
        <button
          type="button"
          className="cc-add-card"
          onClick={addCostCenter}
          disabled={full}
          title={full ? 'No licenses left to assign' : 'Add a cost center'}
        >
          <span className="cc-add-plus" aria-hidden>
            +
          </span>
          Add cost center
        </button>
      </div>

      <div className="muted" style={{ fontSize: 13 }}>
        Unassigned: {fmtInt(sim.unassigned.seats)} seats ({fmtInt(sim.unassigned.activeUsers)} active) · draw
        from the shared pool under the enterprise limits
      </div>
    </section>
  );
}
