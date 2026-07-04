import { useStore } from '../state/store';
import { fmtInt } from '../model/format';

/** Slim dynamic status line shown at the very top of the header. */
export default function StatusBar() {
  const costCenters = useStore((s) => s.inputs.costCenters);
  const totalLicenses = useStore((s) => s.inputs.totalLicenses);
  const count = costCenters.length;
  const assigned = costCenters.reduce((sum, c) => sum + c.members, 0);
  const over = assigned > totalLicenses;

  return (
    <div className="status-bar">
      <span className="status-dot" aria-hidden />
      <strong>
        {count} cost center{count === 1 ? '' : 's'}
      </strong>{' '}
      configured
      <span className="status-sep">·</span>
      <span className={over ? 'status-over' : undefined}>
        {fmtInt(assigned)}/{fmtInt(totalLicenses)} licenses assigned
      </span>
    </div>
  );
}
