// WebMCP bootstrap: binds the app's zustand store to the two imperative tools
// and registers them with the browser model context. Safe to call once at
// startup; a no-op when WebMCP is unavailable (non-Chrome, insecure context,
// server/test). See docs/webmcp-tools.md.

import { useStore } from '../state/store';
import { registerWebMcpTools, type WebMcpRegistration } from './registry';
import { createTools, type SimStore } from './tools';

/** Adapt the zustand store to the minimal surface the tools need. */
const storeAdapter: SimStore = {
  getInputs: () => useStore.getState().inputs,
  setInput: (key, value) => useStore.getState().setInput(key, value),
};

let registration: WebMcpRegistration | null = null;

/** Register the WebMCP tools. Idempotent (subsequent calls are ignored). */
export function initWebMcp(): WebMcpRegistration {
  if (registration) return registration;
  registration = registerWebMcpTools(createTools(storeAdapter));
  return registration;
}
