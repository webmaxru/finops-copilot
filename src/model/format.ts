import { CREDIT_USD } from './defaults';

export const creditsToUsd = (credits: number): number => credits * CREDIT_USD;
export const usdToCredits = (usd: number): number => usd / CREDIT_USD;

export function fmtUsd(usd: number, digits = 0): string {
  return `$${usd.toLocaleString('en-US', {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  })}`;
}

export function fmtCredits(credits: number): string {
  return `${Math.round(credits).toLocaleString('en-US')} AIC`;
}

export function fmtInt(n: number): string {
  return Math.round(n).toLocaleString('en-US');
}

export function fmtPct(fraction: number, digits = 0): string {
  return `${(fraction * 100).toFixed(digits)}%`;
}

/** "1,900 cr ($19)" — a credits value with its USD equivalent. */
export function creditsWithUsd(credits: number): string {
  return `${fmtCredits(credits)} (${fmtUsd(creditsToUsd(credits))})`;
}
