import { describe, it, expect } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import App from '../App';
import { isPromoWindowOpen } from '../model/defaults';

// Lightweight render smoke test: catches runtime errors (bad imports,
// undefined access, invalid chart props) that TypeScript can't.
describe('App smoke test', () => {
  it('renders the whole app without throwing', () => {
    const html = renderToStaticMarkup(<App />);
    expect(html).toContain('Copilot Enterprise Spend Simulator');
    expect(html).toContain('Cost center');
    // Dynamic status line (header) and power-user composition line.
    expect(html).toContain('configured');
    expect(html).toContain('power-user');
    // Promo toggle sits beside the projected bill while the promo window is
    // open (before Sep 1 2026); it is hidden once the window closes.
    if (isPromoWindowOpen()) {
      expect(html).toContain('Promo period');
    } else {
      expect(html).not.toContain('Promo period');
    }
    // Cost centers moved to a grid with an empty add-card.
    expect(html).toContain('Add cost center');
    // Playback feature removed.
    expect(html).not.toContain('Play');
  });
});
