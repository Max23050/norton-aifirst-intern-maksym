import type { Severity } from './Severity';

/** Category of a flagged scam indicator. */
export type ReasonCategory =
  | 'url'
  | 'urgency'
  | 'credentials'
  | 'financial'
  | 'impersonation'
  | 'grammar'
  | 'other';

/** All valid reason categories, useful for iteration and validation. */
export const REASON_CATEGORIES: readonly ReasonCategory[] = [
  'url',
  'urgency',
  'credentials',
  'financial',
  'impersonation',
  'grammar',
  'other',
] as const;

/** A single scam indicator surfaced by the analyzer. */
export interface FlaggedReason {
  /** Which scam signal category this reason belongs to. */
  category: ReasonCategory;
  /** One-sentence, human-readable explanation of why this was flagged. */
  description: string;
  /** How strongly this indicator suggests a scam. */
  severity: Severity;
}
