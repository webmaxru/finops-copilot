const notes = [
  'AICR = AI Credits — 1 AICR = $0.01 USD',
  'Included per seat: Business 1,900 AICR ($19) · Enterprise 3,900 AICR ($39); promo 3,000/7,000 until Sep 1 2026',
  'Budgets cap metered usage on top of license fees (max bill = licenses + budget); stop-usage real-world default is OFF',
  'Individual/cost-center per-user limits cap total (pool + metered) and always hard-stop',
  'Code completions & next-edit suggestions are unlimited and NOT billed',
  'Cost-center per-user budgets and included-usage caps are API-only today (not yet in the billing UI)',
  'Model/pricing figures as of 2026-07; source: official GitHub docs.',
];

export default function AssumptionsFooter() {
  return (
    <section className="muted" style={{ fontSize: 12, lineHeight: 1.5 }}>
      <h2 style={{ color: 'var(--muted)', fontSize: 13, marginBottom: 6 }}>Assumptions &amp; notes</h2>
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
        <a href="https://www.linkedin.com/in/webmax/" target="_blank" rel="noopener noreferrer">
          LinkedIn
        </a>{' '}
        ·{' '}
        <a
          href="https://github.com/webmaxru/finops-copilot"
          target="_blank"
          rel="noopener noreferrer"
        >
          GitHub repo
        </a>
      </p>
    </section>
  );
}
