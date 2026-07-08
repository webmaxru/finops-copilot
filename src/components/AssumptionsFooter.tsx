import { track } from '../analytics';

const notes = [
  'AIC = AI Credits — 1 AIC = $0.01 USD',
  'Included per seat: Business 1,900 AIC ($19) · Enterprise 3,900 AIC ($39); promo 3,000/7,000 until Sep 1 2026',
  'Budgets cap metered usage on top of license fees (max bill = licenses + budget); stop-usage real-world default is OFF',
  'Individual/cost-center per-user limits cap total (pool + metered) and always hard-stop',
  'Code completions & next-edit suggestions are unlimited and NOT billed',
  'Cost-center per-user budgets are now available in the billing UI (in addition to the REST API)',
  'Cost-center included-usage caps are API-only today (settings UI coming soon)',
  'Model/pricing figures as of 2026-07; source: official GitHub docs.',
];

export default function AssumptionsFooter() {
  return (
    <section className="footnotes">
      <h2>Assumptions &amp; notes</h2>
      <p style={{ marginTop: 0 }}>
        <strong>Disclaimer:</strong> This is a simulation for quick validation only. Results are
        approximate, can be imprecise, and may not reflect newly released Copilot features or pricing
        changes. Always confirm against your GitHub billing settings and the official documentation.
      </p>
      <ul style={{ margin: '0 0 8px', paddingLeft: 18 }}>
        {notes.map((note) => (
          <li key={note}>{note}</li>
        ))}
      </ul>
      <p style={{ margin: 0 }}>
        Built by Maxim Salnikov ·{' '}
        <a
          href="https://www.linkedin.com/in/webmax/"
          target="_blank"
          rel="noopener noreferrer"
          onClick={() => track.outboundClick('https://www.linkedin.com/in/webmax/', 'LinkedIn')}
        >
          LinkedIn
        </a>{' '}
        ·{' '}
        <a
          href="https://github.com/webmaxru/finops-copilot"
          target="_blank"
          rel="noopener noreferrer"
          onClick={() =>
            track.outboundClick('https://github.com/webmaxru/finops-copilot', 'GitHub repo')
          }
        >
          GitHub repo
        </a>
      </p>
    </section>
  );
}
