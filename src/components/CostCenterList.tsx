import { useStore, useSimResult } from '../state/store';
import { fmtInt } from '../model/format';
import CostCenterCard from './CostCenterCard';

export default function CostCenterList() {
  const addCostCenter = useStore((s) => s.addCostCenter);
  const costCenters = useStore((s) => s.inputs.costCenters);
  const sim = useSimResult();

  return (
    <section className="panel" style={{ display: 'grid', gap: 12 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
        <h2 style={{ margin: 0 }}>Cost centers</h2>
        <button type="button" onClick={addCostCenter}>
          Add cost center
        </button>
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
