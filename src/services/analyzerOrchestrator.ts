import type { FlaggedReason, RiskAssessment, RiskLevel } from '@/models';
import { analyzeWithAI } from '@/services/aiAnalyzer';
import { AnalyzerError } from '@/services/errors';
import { analyzeHeuristic } from '@/services/heuristicAnalyzer';

const RISK_ORDER: Record<RiskLevel, number> = {
  safe: 0,
  suspicious: 1,
  dangerous: 2,
};

const SEVERITY_ORDER: Record<FlaggedReason['severity'], number> = {
  low: 0,
  medium: 1,
  high: 2,
};

/**
 * Returns whichever risk level is more cautious.
 */
export function moreCautious(a: RiskLevel, b: RiskLevel): RiskLevel {
  return RISK_ORDER[a] >= RISK_ORDER[b] ? a : b;
}

/**
 * Analyzes a message using the sequential heuristic-first gate, falling back
 * to heuristic results when the AI analyzer has a known service failure.
 */
export async function analyze(
  message: string,
  options?: { signal?: AbortSignal },
): Promise<RiskAssessment> {
  const heuristic = analyzeHeuristic(message);

  if (
    heuristic.confidence >= 85 &&
    (heuristic.riskLevel === 'safe' || heuristic.riskLevel === 'dangerous')
  ) {
    return heuristic;
  }

  let ai: RiskAssessment;
  try {
    ai = await analyzeWithAI(message, options);
  } catch (caught: unknown) {
    if (!shouldFallbackFromAIError(caught)) {
      throw caught;
    }

    return {
      ...heuristic,
      source: 'heuristic',
      degraded: true,
    };
  }

  return mergeAssessments(heuristic, ai);
}

function mergeAssessments(
  heuristic: RiskAssessment,
  ai: RiskAssessment,
): RiskAssessment {
  const riskLevel = moreCautious(heuristic.riskLevel, ai.riskLevel);
  const confidence = clampConfidence(
    Math.round((0.6 * ai.confidence) + (0.4 * heuristic.confidence)),
  );
  const agreed = heuristic.riskLevel === ai.riskLevel;
  const explanation = agreed
    ? `${ai.explanation} (Heuristic agreed: ${heuristic.riskLevel} at ${heuristic.confidence}% confidence.)`
    : `${ai.explanation} (Heuristic flagged this as ${heuristic.riskLevel} at ${heuristic.confidence}% confidence.)`;
  const degraded = heuristic.degraded === true || ai.degraded === true;

  return {
    riskLevel,
    confidence,
    explanation,
    flaggedReasons: dedupeReasons([
      ...heuristic.flaggedReasons,
      ...ai.flaggedReasons,
    ]),
    source: 'combined',
    degraded: degraded || undefined,
    analyzedAt: new Date(),
  };
}

function clampConfidence(confidence: number): number {
  return Math.min(100, Math.max(0, confidence));
}

function dedupeReasons(reasons: FlaggedReason[]): FlaggedReason[] {
  const deduped = new Map<FlaggedReason['category'], FlaggedReason>();

  for (const reason of reasons) {
    const existing = deduped.get(reason.category);

    if (
      !existing ||
      SEVERITY_ORDER[reason.severity] >= SEVERITY_ORDER[existing.severity]
    ) {
      deduped.set(reason.category, reason);
    }
  }

  return [...deduped.values()];
}

function shouldFallbackFromAIError(caught: unknown): boolean {
  if (caught instanceof AnalyzerError) {
    return true;
  }

  return (
    typeof DOMException !== 'undefined' &&
    caught instanceof DOMException &&
    caught.name === 'AbortError'
  );
}
