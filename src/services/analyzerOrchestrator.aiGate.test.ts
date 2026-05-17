/**
 * AI-gate integration tests:
 * - Borderline fixtures that heuristic alone should not finalize
 * - Actual heuristic analyzer plus mocked AI analyzer
 */

import { AI_GATE_REQUIRED_MESSAGES } from '@/__fixtures__/scamMessages';
import type { RiskAssessment } from '@/models';
import { analyzeWithAI } from '@/services/aiAnalyzer';

import { analyze } from './analyzerOrchestrator';

jest.mock('@/services/aiAnalyzer', () => ({
  analyzeWithAI: jest.fn(),
}));

const mockAnalyzeWithAI = analyzeWithAI as jest.MockedFunction<typeof analyzeWithAI>;

function makeAIAssessment(): RiskAssessment {
  return {
    riskLevel: 'safe',
    confidence: 90,
    explanation: 'AI found no conclusive scam indicators.',
    flaggedReasons: [],
    source: 'ai',
    analyzedAt: new Date('2026-01-01T00:00:00.000Z'),
  };
}

describe('analyze AI gate fixtures', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it.each(AI_GATE_REQUIRED_MESSAGES.map((m, i) => [i, m]))(
    'consults AI for AI_GATE_REQUIRED_MESSAGES[%i]',
    async (_index, message) => {
      mockAnalyzeWithAI.mockResolvedValueOnce(makeAIAssessment());

      const result = await analyze(message as string);

      expect(mockAnalyzeWithAI).toHaveBeenCalledWith(message, undefined);
      expect(result.source).toBe('combined');
    },
  );
});
