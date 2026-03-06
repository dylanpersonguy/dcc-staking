// =============================================================================
// Frontend — Formatting Utilities
// =============================================================================

const ONE_DCC = 100_000_000n;

/** Format wavelets to human-readable DCC string */
export function formatDcc(wavelets: bigint, decimals: number = 4): string {
  const whole = wavelets / ONE_DCC;
  const frac = wavelets % ONE_DCC;
  const fracStr = frac.toString().padStart(8, '0').slice(0, decimals);

  if (decimals === 0) return whole.toString();
  return `${whole}.${fracStr}`;
}

/** Parse human DCC input to wavelets */
export function parseDccToWavelets(input: string): bigint {
  const parts = input.split('.');
  const whole = BigInt(parts[0] || '0');
  const fracStr = (parts[1] || '').padEnd(8, '0').slice(0, 8);
  return whole * ONE_DCC + BigInt(fracStr);
}

/** Format basis points to percentage */
export function formatBps(bps: number): string {
  return `${(bps / 100).toFixed(2)}%`;
}

/** Format large numbers with commas */
export function formatNumber(n: bigint | number): string {
  return n.toLocaleString('en-US');
}

/** Shorten address for display */
export function shortenAddress(addr: string, chars: number = 6): string {
  if (addr.length <= chars * 2 + 3) return addr;
  return `${addr.slice(0, chars)}...${addr.slice(-chars)}`;
}

/** Calculate estimated APY from exchange rate history */
export function estimateApy(
  currentRate: bigint,
  previousRate: bigint,
  periodMs: number
): number {
  if (previousRate === 0n || currentRate <= previousRate) return 0;
  const growth = Number(currentRate - previousRate) / Number(previousRate);
  const annualMs = 365.25 * 24 * 60 * 60 * 1000;
  const annualizedGrowth = Math.pow(1 + growth, annualMs / periodMs) - 1;
  return annualizedGrowth * 100;
}
