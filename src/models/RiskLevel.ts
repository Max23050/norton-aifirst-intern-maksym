/** Severity classification for a scam analysis result. */
export type RiskLevel = 'safe' | 'suspicious' | 'dangerous';

/** All valid risk levels, useful for iteration and validation. */
export const RISK_LEVELS: readonly RiskLevel[] = [
  'safe',
  'suspicious',
  'dangerous',
] as const;
