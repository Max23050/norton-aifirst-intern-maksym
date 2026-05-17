import type { FlaggedReason, RiskAssessment, RiskLevel, Severity } from '@/models';
import { analyzeWithAI } from '@/services/aiAnalyzer';
import { assertConfidence } from '@/services/confidence';
import { AnalyzerError } from '@/services/errors';
import { analyzeHeuristic } from '@/services/heuristicAnalyzer';

const RISK_ORDER: Record<RiskLevel, number> = {
  safe: 0,
  suspicious: 1,
  dangerous: 2,
};

const SEVERITY_ORDER: Record<Severity, number> = {
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
  const heuristic = assertAssessmentConfidence(analyzeHeuristic(message), 'Heuristic confidence');

  if (
    heuristic.confidence >= 85 &&
    (heuristic.riskLevel === 'safe' || heuristic.riskLevel === 'dangerous')
  ) {
    return heuristic;
  }

  let ai: RiskAssessment;
  try {
    ai = assertAssessmentConfidence(await analyzeWithAI(message, options), 'AI confidence');
  } catch (caught: unknown) {
    if (!shouldFallbackFromAIError(caught)) {
      throw caught;
    }

    return assertAssessmentConfidence({
      ...heuristic,
      source: 'heuristic',
      degraded: true,
    }, 'Heuristic confidence');
  }

  return assertAssessmentConfidence(mergeAssessments(heuristic, ai), 'Combined confidence');
}

function mergeAssessments(
  heuristic: RiskAssessment,
  ai: RiskAssessment,
): RiskAssessment {
  const riskLevel = moreCautious(heuristic.riskLevel, ai.riskLevel);
  const heuristicConfidence = assertConfidence(heuristic.confidence, 'Heuristic confidence');
  const aiConfidence = assertConfidence(ai.confidence, 'AI confidence');
  const confidence = assertConfidence(
    Math.round((0.6 * aiConfidence) + (0.4 * heuristicConfidence)),
    'Combined confidence',
  );
  const agreed = heuristic.riskLevel === ai.riskLevel;
  const explanation = agreed
    ? `${ai.explanation} (Heuristic agreed: ${heuristic.riskLevel} at ${heuristicConfidence}% confidence.)`
    : `${ai.explanation} (Heuristic flagged this as ${heuristic.riskLevel} at ${heuristicConfidence}% confidence.)`;
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

function assertAssessmentConfidence(
  assessment: RiskAssessment,
  label: string,
): RiskAssessment {
  assertConfidence(assessment.confidence, label);
  return assessment;
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
