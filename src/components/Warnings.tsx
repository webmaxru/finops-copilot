import { useSimResult } from '../state/store';
import AssumptionsFooter from './AssumptionsFooter';

export default function Warnings() {
  const sim = useSimResult();

  return (
    <>
      <section className="panel">
        {sim.warnings.length === 0 ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span
              aria-hidden="true"
              style={{
                width: 10,
                height: 10,
                borderRadius: '50%',
                background: 'var(--pool)',
                display: 'inline-block',
              }}
            />
            <span className="muted">No configuration issues detected.</span>
          </div>
        ) : (
          <>
            <h2 style={{ marginTop: 0 }}>Heads up</h2>
            <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>
              {sim.warnings.map((warning) => (
                <li
                  key={warning}
                  style={{
                    borderLeft: '3px solid var(--limit)',
                    padding: 8,
                    marginBottom: 6,
                    background: 'rgba(248,81,73,0.08)',
                    color: 'var(--text)',
                  }}
                >
                  {warning}
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
