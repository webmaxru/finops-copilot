import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './styles.css';
import { initAnalytics, track } from './analytics';
import { CONFIG_PARAM } from './state/shareConfig';
import { initWebMcp } from './webmcp';

// Cookieless product analytics (no consent banner needed). Fire-and-forget; a
// safe no-op when no connection string is configured (local dev / tests).
initAnalytics();

// Expose the browser AI-agent tools (WebMCP). No-op when WebMCP is unavailable.
initWebMcp();
try {
  if (
    typeof window !== 'undefined' &&
    new URLSearchParams(window.location.search).has(CONFIG_PARAM)
  ) {
    track.sharedConfigOpened();
  }
} catch {
  /* ignore */
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
