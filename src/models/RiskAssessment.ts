import type { RiskLevel } from './RiskLevel';
import type { FlaggedReason } from './FlaggedReason';

/** Which engine(s) produced this assessment. */
export type AnalysisSource = 'heuristic' | 'ai' | 'combined';

/** The result of analyzing a message for scam indicators. */
export interface RiskAssessment {
  /** Overall risk classification. */
  riskLevel: RiskLevel;
  /**
   * How confident the analyzer is in the classification.
   * Integer in the range 0–100 inclusive.
   */
  confidence: number;
  /** One-to-two sentence summary shown in the UI. */
  explanation: string;
  /** Individual scam indicators that were detected. */
  flaggedReasons: FlaggedReason[];
  /** Which analysis engine(s) produced this result. */
  source: AnalysisSource;
  /** True when the AI analyzer failed and we fell back to heuristic-only. */
  degraded?: boolean;
  /** When the analysis completed. */
  analyzedAt: Date;
}
