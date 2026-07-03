const notes = [
  '1 AI credit = $0.01',
  'Included per seat: Business 1,900 cr ($19) · Enterprise 3,900 cr ($39); promo 3,000/7,000 until Sep 1 2026',
  'Budgets cap metered usage on top of license fees (max bill = licenses + budget); stop-usage real-world default is OFF',
  'Individual/cost-center per-user limits cap total (pool + metered) and always hard-stop',
  'Code completions & next-edit suggestions are unlimited and NOT billed',
  'Cost-center per-user budgets and included-usage caps are API-only today (not yet in the billing UI)',
  'Model/pricing figures as of 2026-07; source: official GitHub docs.',
];

export default function AssumptionsFooter() {
  return (
    <section className="muted" style={{ fontSize: 12, lineHeight: 1.5 }}>
      <h2 style={{ color: 'var(--muted)', fontSize: 13, marginBottom: 6 }}>Assumptions & notes</h2>
      <ul style={{ margin: 0, paddingLeft: 18 }}>
        {notes.map((note) => (
          <li key={note}>{note}</li>
        ))}
      </ul>
    </section>
  );
}
