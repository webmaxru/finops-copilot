import { useSimResult } from '../state/store';
import AssumptionsFooter from './AssumptionsFooter';

export default function Warnings() {
  const sim = useSimResult();

  return (
    <>
      <section className="panel">
        {sim.warnings.length === 0 ? (
          <div className="status-ok">
            <span aria-hidden="true" className="status-ok__dot" />
            <span className="muted">No configuration issues detected.</span>
          </div>
        ) : (
          <>
            <h2 style={{ marginTop: 0 }}>Heads up</h2>
            <ul className="warnings-list">
              {sim.warnings.map((warning) => (
                <li key={warning} className="warning">
                  <span className="warning__icon" aria-hidden="true">
                    !
                  </span>
                  <span>{warning}</span>
                </li>
              ))}
            </ul>
          </>
        )}
      </section>
      <AssumptionsFooter />
    </>
  );
}
