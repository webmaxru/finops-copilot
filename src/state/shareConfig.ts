// Shareable-configuration serialization: encode/decode the full simulation
// inputs to/from a compact, URL-safe string so a scenario can be shared as a
// link (?c=...) and restored on load. This is deliberately kept out of the
// pure model layer because it touches the browser `window`/`location`; every
// such access is guarded so the module is safe to import in the (node) test
// environment and during SSR-style static rendering.
//
// The engine stays a pure function of `EnterpriseInputs`; this module only
// (de)serializes that input object — it never changes any calculation.

import { RANGES } from '../model/defaults';
import type { CostCenter, EnterpriseInputs } from '../model/types';

/** URL query parameter that carries an encoded configuration. */
export const CONFIG_PARAM = 'c';

/** Bump when the serialized shape changes in a non-backward-compatible way. */
const CONFIG_VERSION = 1;

/** A cost center without its volatile, machine-generated `id`. */
type SerializableCostCenter = Omit<CostCenter, 'id'>;

/** Inputs as stored in a link: cost centers carry no `id` (regenerated on load). */
interface SerializableInputs extends Omit<EnterpriseInputs, 'costCenters'> {
  costCenters: SerializableCostCenter[];
}

interface SharedConfig {
  /** schema version */
  v: number;
  /** inputs */
  i: SerializableInputs;
}

function newCostCenterId(): string {
  const c = (globalThis as { crypto?: { randomUUID?: () => string } }).crypto;
  return c?.randomUUID ? c.randomUUID() : `cc-${Math.random().toString(36).slice(2, 10)}`;
}

// ---------------------------------------------------------------------------
// base64url helpers (Unicode-safe, browser + Node) — no Buffer dependency.
// ---------------------------------------------------------------------------

function bytesToBase64Url(bytes: Uint8Array): string {
  let bin = '';
  for (let i = 0; i < bytes.length; i += 1) bin += String.fromCharCode(bytes[i]);
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function base64UrlToBytes(s: string): Uint8Array {
  const b64 = s.replace(/-/g, '+').replace(/_/g, '/');
  const pad = b64.length % 4 === 0 ? '' : '='.repeat(4 - (b64.length % 4));
  const bin = atob(b64 + pad);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i += 1) out[i] = bin.charCodeAt(i);
  return out;
}

// ---------------------------------------------------------------------------
// (de)serialization
// ---------------------------------------------------------------------------

function toSerializable(inputs: EnterpriseInputs): SerializableInputs {
  return {
    ...inputs,
    // Drop the machine-generated ids — they are noise in a shared link and are
    // regenerated deterministically-free on decode.
    costCenters: inputs.costCenters.map(({ id: _id, ...rest }) => rest),
  };
}

function num(value: unknown, fallback: number): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function bool(value: unknown, fallback: boolean): boolean {
  return typeof value === 'boolean' ? value : fallback;
}

function str(value: unknown, fallback: string): string {
  return typeof value === 'string' ? value : fallback;
}

function toCostCenter(raw: unknown, index: number): CostCenter {
  const c = (raw ?? {}) as Partial<CostCenter>;
  const members = clamp(Math.round(num(c.members, 0)), RANGES.ccMembers.min, RANGES.ccMembers.max);
  return {
    id: newCostCenterId(),
    name: str(c.name, `Cost center ${index + 1}`),
    members,
    avgDevUsageCredits: clamp(
      num(c.avgDevUsageCredits, RANGES.avgDevUsageCredits.min),
      RANGES.avgDevUsageCredits.min,
      RANGES.avgDevUsageCredits.max,
    ),
    userLimitInherit: bool(c.userLimitInherit, true),
    userLimitUsd: clamp(num(c.userLimitUsd, 50), RANGES.ccUserLimitUsd.min, RANGES.ccUserLimitUsd.max),
    budgetUsd: Math.max(RANGES.ccBudgetUsd.min, num(c.budgetUsd, 0)),
    stopUsageBudget: bool(c.stopUsageBudget, true),
    includedCapEnabled: bool(c.includedCapEnabled, false),
    includedCapBlock: bool(c.includedCapBlock, false),
  };
}

/**
 * Rebuild a validated `EnterpriseInputs` from an untrusted serialized object.
 * Unknown/invalid fields fall back to safe values and every number is clamped
 * to its slider range so a malformed or stale link can never crash the engine.
 */
function fromSerializable(raw: unknown): EnterpriseInputs {
  const i = (raw ?? {}) as Partial<SerializableInputs>;
  const totalLicenses = clamp(
    Math.round(num(i.totalLicenses, RANGES.totalLicenses.min)),
    RANGES.totalLicenses.min,
    RANGES.totalLicenses.max,
  );
  const costCenters = Array.isArray(i.costCenters) ? i.costCenters.map(toCostCenter) : [];
  return {
    totalLicenses,
    bizRatio: clamp(num(i.bizRatio, 0.7), RANGES.bizRatio.min, RANGES.bizRatio.max),
    activePct: clamp(num(i.activePct, 0.8), RANGES.activePct.min, RANGES.activePct.max),
    avgDevUsageCredits: clamp(
      num(i.avgDevUsageCredits, RANGES.avgDevUsageCredits.min),
      RANGES.avgDevUsageCredits.min,
      RANGES.avgDevUsageCredits.max,
    ),
    powerUsers: clamp(Math.round(num(i.powerUsers, 0)), RANGES.powerUsers.min, totalLicenses),
    avgPowerUserBudgetUsd: clamp(
      num(i.avgPowerUserBudgetUsd, RANGES.avgPowerUserBudgetUsd.min),
      RANGES.avgPowerUserBudgetUsd.min,
      RANGES.avgPowerUserBudgetUsd.max,
    ),
    usageVariation: clamp(num(i.usageVariation, 0.3), RANGES.usageVariation.min, RANGES.usageVariation.max),
    universalUlbUsd: Math.max(RANGES.universalUlbUsd.min, num(i.universalUlbUsd, 0)),
    enterpriseLimitUsd: Math.max(RANGES.enterpriseLimitUsd.min, num(i.enterpriseLimitUsd, 0)),
    promo: bool(i.promo, false),
    enterpriseBudgetExcludesCostCenters: bool(i.enterpriseBudgetExcludesCostCenters, false),
    stopUsageBudgets: bool(i.stopUsageBudgets, true),
    seed: Math.round(num(i.seed, 12345)),
    costCenters,
  };
}

/** Encode inputs to a compact, URL-safe token (base64url of versioned JSON). */
export function encodeInputs(inputs: EnterpriseInputs): string {
  const payload: SharedConfig = { v: CONFIG_VERSION, i: toSerializable(inputs) };
  return bytesToBase64Url(new TextEncoder().encode(JSON.stringify(payload)));
}

/** Decode a token produced by {@link encodeInputs}; returns null if unusable. */
export function decodeInputs(token: string | null | undefined): EnterpriseInputs | null {
  if (!token) return null;
  try {
    const json = new TextDecoder().decode(base64UrlToBytes(token));
    const parsed = JSON.parse(json) as Partial<SharedConfig>;
    if (!parsed || typeof parsed !== 'object' || parsed.v !== CONFIG_VERSION) return null;
    return fromSerializable(parsed.i);
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// location helpers (all guarded so the module is import-safe without a DOM)
// ---------------------------------------------------------------------------

/** Build an absolute, shareable URL that encodes the given configuration. */
export function buildShareUrl(inputs: EnterpriseInputs): string {
  const token = encodeInputs(inputs);
  if (typeof window === 'undefined' || !window.location) return `?${CONFIG_PARAM}=${token}`;
  const url = new URL(window.location.href);
  url.searchParams.set(CONFIG_PARAM, token);
  return url.toString();
}

/** Read and decode the configuration carried in the current URL, if any. */
export function readInputsFromLocation(): EnterpriseInputs | null {
  if (typeof window === 'undefined' || !window.location) return null;
  try {
    const token = new URLSearchParams(window.location.search).get(CONFIG_PARAM);
    return decodeInputs(token);
  } catch {
    return null;
  }
}

/**
 * Mirror the current configuration into the address bar via history.replaceState
 * (no new history entry, no navigation) so the URL is always copy-to-share ready.
 * Safe to call on every input change; failures are swallowed.
 */
export function writeInputsToLocation(inputs: EnterpriseInputs): void {
  if (typeof window === 'undefined' || !window.history || !window.location) return;
  try {
    const url = new URL(window.location.href);
    url.searchParams.set(CONFIG_PARAM, encodeInputs(inputs));
    window.history.replaceState(window.history.state, '', url.toString());
  } catch {
    /* ignore (privacy mode / unsupported) */
  }
}
