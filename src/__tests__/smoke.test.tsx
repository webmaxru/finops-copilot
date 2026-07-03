import { describe, it, expect } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import App from '../App';

// Lightweight render smoke test: catches runtime errors (bad imports,
// undefined access, invalid chart props) that TypeScript can't.
describe('App smoke test', () => {
  it('renders the whole app without throwing', () => {
    const html = renderToStaticMarkup(<App />);
    expect(html).toContain('Copilot Enterprise Spend Simulator');
    expect(html).toContain('Cost center');
  });
});
