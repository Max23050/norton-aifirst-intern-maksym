/**
 * AI-generated test cases:
 * - Early exit on high-confidence safe and dangerous heuristic results
 * - No early exit for suspicious or low-confidence heuristic results
 * - No early exit for long no-hit heuristic safe results
 * - Merge risk, confidence, source, explanations, and timestamps
 * - More cautious risk-level precedence
 * - Weighted confidence averaging
 * - Flagged reason union and category deduplication with severity precedence
 * - AnalyzerError and DOMException AbortError fallback behavior
 * - Unexpected native error rethrow behavior
 * - AbortSignal passthrough to the AI analyzer
 * - Whitespace input early-exit behavior
 * - moreCautious helper coverage for all risk-level combinations
 */

import type { FlaggedReason, RiskAssessment, RiskLevel } from '@/models';
import { analyzeWithAI } from '@/services/aiAnalyzer';
import { AIAnalyzerError } from '@/services/errors';
import { analyzeHeuristic } from '@/services/heuristicAnalyzer';

import { analyze, moreCautious } from './analyzerOrchestrator';

jest.mock('@/services/heuristicAnalyzer', () => ({
  analyzeHeuristic: jest.fn(),
}));

jest.mock('@/services/aiAnalyzer', () => ({
  analyzeWithAI: jest.fn(),
}));

const mockAnalyzeHeuristic = analyzeHeuristic as jest.MockedFunction<typeof analyzeHeuristic>;
const mockAnalyzeWithAI = analyzeWithAI as jest.MockedFunction<typeof analyzeWithAI>;

const BASE_DATE = new Date('2026-01-01T00:00:00.000Z');

function makeAssessment(overrides: Partial<RiskAssessment>): RiskAssessment {
  return {
    riskLevel: 'safe',
    confidence: 50,
    explanation: 'Base assessment.',
    flaggedReasons: [],
    source: 'heuristic',
    analyzedAt: new Date(BASE_DATE),
    ...overrides,
  };
}

function makeReason(
  category: FlaggedReason['category'],
  description: string,
  severity: FlaggedReason['severity'],
): FlaggedReason {
  return { category, description, severity };
}

describe('analyze', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns heuristic result and skips AI for high-confidence safe verdicts', async () => {
    const heuristic = makeAssessment({
      riskLevel: 'safe',
      confidence: 95,
    });
    mockAnalyzeHeuristic.mockReturnValueOnce(heuristic);

    const result = await analyze('See you at 5');

    expect(mockAnalyzeWithAI).not.toHaveBeenCalled();
    expect(result).toEqual(heuristic);
  });

  it('returns heuristic result and skips AI for high-confidence dangerous verdicts', async () => {
    const heuristic = makeAssessment({
      riskLevel: 'dangerous',
      confidence: 90,
    });
    mockAnalyzeHeuristic.mockReturnValueOnce(heuristic);

    const result = await analyze('Reset password now at bit.ly/example');

    expect(mockAnalyzeWithAI).not.toHaveBeenCalled();
    expect(result).toEqual(heuristic);
  });

  it('calls AI for high-confidence suspicious verdicts', async () => {
    const heuristic = makeAssessment({
      riskLevel: 'suspicious',
      confidence: 95,
    });
    const ai = makeAssessment({
      riskLevel: 'suspicious',
      confidence: 80,
      source: 'ai',
    });
    mockAnalyzeHeuristic.mockReturnValueOnce(heuristic);
    mockAnalyzeWithAI.mockResolvedValueOnce(ai);

    const result = await analyze('This seems unusual');

    expect(mockAnalyzeWithAI).toHaveBeenCalledTimes(1);
    expect(result.source).toBe('combined');
  });

  it('calls AI for low-confidence safe verdicts', async () => {
    const heuristic = makeAssessment({
      riskLevel: 'safe',
      confidence: 70,
    });
    const ai = makeAssessment({
      riskLevel: 'safe',
      confidence: 90,
      source: 'ai',
    });
    mockAnalyzeHeuristic.mockReturnValueOnce(heuristic);
    mockAnalyzeWithAI.mockResolvedValueOnce(ai);

    await analyze('Could be safe');

    expect(mockAnalyzeWithAI).toHaveBeenCalledTimes(1);
  });

  it('calls AI for long no-hit safe verdicts because heuristic confidence is capped', async () => {
    const heuristic = makeAssessment({
      riskLevel: 'safe',
      confidence: 70,
    });
    const ai = makeAssessment({
      riskLevel: 'safe',
      confidence: 90,
      source: 'ai',
    });
    const longMessage = 'a'.repeat(5000);
    mockAnalyzeHeuristic.mockReturnValueOnce(heuristic);
    mockAnalyzeWithAI.mockResolvedValueOnce(ai);

    const result = await analyze(longMessage);

    expect(mockAnalyzeWithAI).toHaveBeenCalledTimes(1);
    expect(mockAnalyzeWithAI).toHaveBeenCalledWith(longMessage, undefined);
    expect(result.source).toBe('combined');
  });

  it('early exits at exactly 85 confidence when the heuristic verdict is safe', async () => {
    const heuristic = makeAssessment({
      riskLevel: 'safe',
      confidence: 85,
    });
    mockAnalyzeHeuristic.mockReturnValueOnce(heuristic);

    const result = await analyze('Looks normal');

    expect(mockAnalyzeWithAI).not.toHaveBeenCalled();
    expect(result.source).toBe('heuristic');
  });

  it('early exits for whitespace input when heuristic returns high-confidence safe', async () => {
    const heuristic = makeAssessment({
      riskLevel: 'safe',
      confidence: 90,
      explanation: 'Message is empty or too short to analyze.',
      flaggedReasons: [],
    });
    mockAnalyzeHeuristic.mockReturnValueOnce(heuristic);

    const result = await analyze('   ');

    expect(mockAnalyzeHeuristic).toHaveBeenCalledWith('   ');
    expect(mockAnalyzeWithAI).not.toHaveBeenCalled();
    expect(result).toEqual(heuristic);
  });

  it('merges assessments when both analyzers run', async () => {
    const heuristic = makeAssessment({
      riskLevel: 'suspicious',
      confidence: 80,
      explanation: 'Heuristic explanation.',
      flaggedReasons: [
        makeReason('url', 'Shortened URL', 'medium'),
      ],
    });
    const ai = makeAssessment({
      riskLevel: 'dangerous',
      confidence: 90,
      explanation: 'AI explanation.',
      flaggedReasons: [
        makeReason('urgency', 'Creates pressure', 'high'),
      ],
      source: 'ai',
    });
    mockAnalyzeHeuristic.mockReturnValueOnce(heuristic);
    mockAnalyzeWithAI.mockResolvedValueOnce(ai);

    const result = await analyze('Suspicious message');

    expect(result.source).toBe('combined');
    expect(result.degraded).toBeUndefined();
    expect(result.riskLevel).toBe('dangerous');
    expect(result.confidence).toBe(86);
    expect(result.flaggedReasons).toEqual([
      makeReason('url', 'Shortened URL', 'medium'),
      makeReason('urgency', 'Creates pressure', 'high'),
    ]);
    expect(result.explanation).toBe(
      'AI explanation. (Heuristic flagged this as suspicious at 80% confidence.)',
    );
    expect(result.analyzedAt).toBeInstanceOf(Date);
  });

  it('keeps the more cautious AI risk level when AI is more severe', async () => {
    const heuristic = makeAssessment({
      riskLevel: 'safe',
      confidence: 70,
    });
    const ai = makeAssessment({
      riskLevel: 'dangerous',
      confidence: 90,
      source: 'ai',
    });
    mockAnalyzeHeuristic.mockReturnValueOnce(heuristic);
    mockAnalyzeWithAI.mockResolvedValueOnce(ai);

    const result = await analyze('Escalated by AI');

    expect(result.riskLevel).toBe('dangerous');
  });

  it('keeps the more cautious heuristic risk level when AI is less severe', async () => {
    const heuristic = makeAssessment({
      riskLevel: 'dangerous',
      confidence: 70,
    });
    const ai = makeAssessment({
      riskLevel: 'safe',
      confidence: 95,
      source: 'ai',
    });
    mockAnalyzeHeuristic.mockReturnValueOnce(heuristic);
    mockAnalyzeWithAI.mockResolvedValueOnce(ai);

    const result = await analyze('Downgraded by AI');

    expect(result.riskLevel).toBe('dangerous');
  });

  it('computes confidence as the rounded weighted average favoring AI', async () => {
    const heuristic = makeAssessment({
      riskLevel: 'suspicious',
      confidence: 80,
    });
    const ai = makeAssessment({
      riskLevel: 'suspicious',
      confidence: 90,
      source: 'ai',
    });
    mockAnalyzeHeuristic.mockReturnValueOnce(heuristic);
    mockAnalyzeWithAI.mockResolvedValueOnce(ai);

    const result = await analyze('Weighted confidence message');

    expect(result.confidence).toBe(86);
  });

  it('dedupes reasons by category while keeping the higher severity reason', async () => {
    const heuristic = makeAssessment({
      riskLevel: 'suspicious',
      confidence: 70,
      flaggedReasons: [
        makeReason('urgency', 'Pressures immediate action', 'low'),
      ],
    });
    const ai = makeAssessment({
      riskLevel: 'suspicious',
      confidence: 90,
      flaggedReasons: [
        makeReason('urgency', 'Creates account pressure immediately', 'medium'),
      ],
      source: 'ai',
    });
    mockAnalyzeHeuristic.mockReturnValueOnce(heuristic);
    mockAnalyzeWithAI.mockResolvedValueOnce(ai);

    const result = await analyze('Dear customer, confirm now');

    expect(result.flaggedReasons).toEqual([
      makeReason('urgency', 'Creates account pressure immediately', 'medium'),
    ]);
  });

  it('keeps different reasons in the union', async () => {
    const heuristic = makeAssessment({
      riskLevel: 'suspicious',
      confidence: 70,
      flaggedReasons: [
        makeReason('url', 'Shortened URL', 'medium'),
      ],
    });
    const ai = makeAssessment({
      riskLevel: 'suspicious',
      confidence: 90,
      flaggedReasons: [
        makeReason('urgency', 'Creates pressure', 'high'),
      ],
      source: 'ai',
    });
    mockAnalyzeHeuristic.mockReturnValueOnce(heuristic);
    mockAnalyzeWithAI.mockResolvedValueOnce(ai);

    const result = await analyze('Different reasons');

    expect(result.flaggedReasons).toEqual([
      makeReason('url', 'Shortened URL', 'medium'),
      makeReason('urgency', 'Creates pressure', 'high'),
    ]);
  });

  it('preserves degraded when either merged assessment is degraded', async () => {
    const heuristic = makeAssessment({
      riskLevel: 'suspicious',
      confidence: 70,
      degraded: true,
    });
    const ai = makeAssessment({
      riskLevel: 'suspicious',
      confidence: 90,
      source: 'ai',
    });
    mockAnalyzeHeuristic.mockReturnValueOnce(heuristic);
    mockAnalyzeWithAI.mockResolvedValueOnce(ai);

    const result = await analyze('Degraded heuristic context');

    expect(result.source).toBe('combined');
    expect(result.degraded).toBe(true);
  });

  it('falls back to degraded heuristic result when AI throws an AnalyzerError', async () => {
    const heuristic = makeAssessment({
      riskLevel: 'suspicious',
      confidence: 70,
    });
    mockAnalyzeHeuristic.mockReturnValueOnce(heuristic);
    mockAnalyzeWithAI.mockRejectedValueOnce(new AIAnalyzerError('OpenAI request failed'));

    const result = await analyze('AI will fail');

    expect(result).toEqual({
      ...heuristic,
      source: 'heuristic',
      degraded: true,
    });
  });

  it('falls back to degraded heuristic result when AI throws a DOMException AbortError', async () => {
    const heuristic = makeAssessment({
      riskLevel: 'suspicious',
      confidence: 70,
    });
    mockAnalyzeHeuristic.mockReturnValueOnce(heuristic);
    mockAnalyzeWithAI.mockRejectedValueOnce(
      new DOMException('The operation was aborted.', 'AbortError'),
    );

    const result = await analyze('AI will be cancelled');

    expect(result).toEqual({
      ...heuristic,
      source: 'heuristic',
      degraded: true,
    });
  });

  it('rethrows unexpected native errors from the AI analyzer', async () => {
    const heuristic = makeAssessment({
      riskLevel: 'suspicious',
      confidence: 70,
    });
    const programmerError = new TypeError('Unexpected implementation bug');
    mockAnalyzeHeuristic.mockReturnValueOnce(heuristic);
    mockAnalyzeWithAI.mockRejectedValueOnce(programmerError);

    await expect(analyze('AI has a bug')).rejects.toBe(programmerError);
  });

  it('passes AbortSignal options through to the AI analyzer', async () => {
    const controller = new AbortController();
    const options = { signal: controller.signal };
    const heuristic = makeAssessment({
      riskLevel: 'suspicious',
      confidence: 70,
    });
    const ai = makeAssessment({
      riskLevel: 'suspicious',
      confidence: 90,
      source: 'ai',
    });
    mockAnalyzeHeuristic.mockReturnValueOnce(heuristic);
    mockAnalyzeWithAI.mockResolvedValueOnce(ai);

    await analyze('Pass signal through', options);

    expect(mockAnalyzeWithAI).toHaveBeenCalledWith('Pass signal through', options);
  });

  it('uses agreement wording when AI and heuristic risk levels match', async () => {
    const heuristic = makeAssessment({
      riskLevel: 'suspicious',
      confidence: 70,
    });
    const ai = makeAssessment({
      riskLevel: 'suspicious',
      confidence: 90,
      explanation: 'AI sees soft scam signals.',
      source: 'ai',
    });
    mockAnalyzeHeuristic.mockReturnValueOnce(heuristic);
    mockAnalyzeWithAI.mockResolvedValueOnce(ai);

    const result = await analyze('Agreement wording');

    expect(result.explanation).toBe(
      'AI sees soft scam signals. (Heuristic agreed: suspicious at 70% confidence.)',
    );
  });

  it('uses flagged wording when AI and heuristic risk levels differ', async () => {
    const heuristic = makeAssessment({
      riskLevel: 'safe',
      confidence: 70,
    });
    const ai = makeAssessment({
      riskLevel: 'dangerous',
      confidence: 90,
      explanation: 'AI sees credential theft.',
      source: 'ai',
    });
    mockAnalyzeHeuristic.mockReturnValueOnce(heuristic);
    mockAnalyzeWithAI.mockResolvedValueOnce(ai);

    const result = await analyze('Disagreement wording');

    expect(result.explanation).toBe(
      'AI sees credential theft. (Heuristic flagged this as safe at 70% confidence.)',
    );
  });
});

describe('moreCautious', () => {
  it.each<[RiskLevel, RiskLevel, RiskLevel]>([
    ['safe', 'safe', 'safe'],
    ['safe', 'suspicious', 'suspicious'],
    ['safe', 'dangerous', 'dangerous'],
    ['suspicious', 'safe', 'suspicious'],
    ['suspicious', 'suspicious', 'suspicious'],
    ['suspicious', 'dangerous', 'dangerous'],
    ['dangerous', 'safe', 'dangerous'],
    ['dangerous', 'suspicious', 'dangerous'],
    ['dangerous', 'dangerous', 'dangerous'],
  ])('returns %s vs %s as %s', (a, b, expected) => {
    expect(moreCautious(a, b)).toBe(expected);
  });
});
