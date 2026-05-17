/**
 * AI-generated test cases:
 * - Successful call with valid response
 * - Network failure
 * - 401 unauthorized response
 * - 429 rate limit response
 * - Generic 500 response
 * - Invalid JSON in response content
 * - Invalid riskLevel (schema mismatch)
 * - Missing fields with defaults (permissive validation)
 * - Missing API key (placeholder value)
 * - AbortSignal (already aborted)
 * - Error sanitization (no API key leak in cause chain)
 * - Timeout (fetch hangs, fake timers)
 */

import { AIAnalyzerError, ValidationError } from './errors';

// ── Mocks ───────────────────────────────────────────────────────

// Mutable mock — tests mutate OPENAI_API_KEY to simulate missing/invalid key
const envMock: Record<string, string> = { OPENAI_API_KEY: 'sk-test-key-123' };
jest.mock('@env', () => envMock);

const mockFetch = jest.fn() as jest.MockedFunction<typeof fetch>;
global.fetch = mockFetch;

// Import AFTER jest.mock so the module gets the mock
import { analyzeWithAI } from './aiAnalyzer';

function makeOpenAIResponse(content: string): Response {
  const body = JSON.stringify({
    choices: [{ message: { content } }],
  });
  return {
    ok: true,
    status: 200,
    statusText: 'OK',
    json: () => Promise.resolve(JSON.parse(body)),
    text: () => Promise.resolve(body),
    headers: new Headers(),
  } as unknown as Response;
}

function makeErrorResponse(status: number, errorBody?: string): Response {
  const body = errorBody ?? JSON.stringify({ error: { message: 'Something went wrong' } });
  return {
    ok: false,
    status,
    statusText: 'Error',
    json: () => Promise.resolve(JSON.parse(body)),
    text: () => Promise.resolve(body),
    headers: new Headers(),
  } as unknown as Response;
}

const VALID_AI_CONTENT = JSON.stringify({
  riskLevel: 'dangerous',
  confidence: 92,
  explanation: 'This message contains phishing indicators.',
  flaggedReasons: [
    { category: 'url', description: 'Contains a suspicious shortened URL', severity: 'high' },
    { category: 'urgency', description: 'Creates false time pressure', severity: 'medium' },
  ],
});

// ── Tests ───────────────────────────────────────────────────────

describe('analyzeWithAI', () => {
  beforeEach(() => {
    mockFetch.mockReset();
    envMock.OPENAI_API_KEY = 'sk-test-key-123';
  });

  it('returns a valid RiskAssessment on successful call', async () => {
    mockFetch.mockResolvedValueOnce(makeOpenAIResponse(VALID_AI_CONTENT));

    const result = await analyzeWithAI('Check this suspicious message');

    expect(result.source).toBe('ai');
    expect(result.riskLevel).toBe('dangerous');
    expect(result.confidence).toBe(92);
    expect(result.explanation).toBe('This message contains phishing indicators.');
    expect(result.flaggedReasons).toHaveLength(2);
    expect(result.flaggedReasons[0].category).toBe('url');
    expect(result.analyzedAt).toBeInstanceOf(Date);
  });

  it('throws AIAnalyzerError on network failure', async () => {
    mockFetch.mockRejectedValueOnce(new TypeError('Failed to fetch'));

    let caught: unknown;
    try {
      await analyzeWithAI('test message');
    } catch (err) {
      caught = err;
    }

    expect(caught).toBeInstanceOf(AIAnalyzerError);
    expect((caught as AIAnalyzerError).message).toBe('OpenAI request failed');
  });

  it('throws AIAnalyzerError mentioning unauthorized on 401', async () => {
    mockFetch.mockResolvedValueOnce(makeErrorResponse(401));

    let caught: unknown;
    try {
      await analyzeWithAI('test');
    } catch (err) {
      caught = err;
    }

    expect(caught).toBeInstanceOf(AIAnalyzerError);
    expect((caught as AIAnalyzerError).message).toContain('invalid or unauthorized');
  });

  it('throws AIAnalyzerError mentioning rate limit on 429', async () => {
    mockFetch.mockResolvedValueOnce(makeErrorResponse(429));

    let caught: unknown;
    try {
      await analyzeWithAI('test');
    } catch (err) {
      caught = err;
    }

    expect(caught).toBeInstanceOf(AIAnalyzerError);
    expect((caught as AIAnalyzerError).message).toContain('rate limit');
  });

  it('throws AIAnalyzerError with status on generic 500', async () => {
    mockFetch.mockResolvedValueOnce(makeErrorResponse(500));

    let caught: unknown;
    try {
      await analyzeWithAI('test');
    } catch (err) {
      caught = err;
    }

    expect(caught).toBeInstanceOf(AIAnalyzerError);
    expect((caught as AIAnalyzerError).message).toContain('500');
  });

  it('throws ValidationError when response content is not valid JSON', async () => {
    mockFetch.mockResolvedValueOnce(makeOpenAIResponse('this is not json'));

    let caught: unknown;
    try {
      await analyzeWithAI('test');
    } catch (err) {
      caught = err;
    }

    expect(caught).toBeInstanceOf(ValidationError);
    expect((caught as ValidationError).message).toBe('AI response was not valid JSON');
  });

  it('throws ValidationError when riskLevel is invalid', async () => {
    const content = JSON.stringify({ riskLevel: 'extreme', confidence: 80 });
    mockFetch.mockResolvedValueOnce(makeOpenAIResponse(content));

    let caught: unknown;
    try {
      await analyzeWithAI('test');
    } catch (err) {
      caught = err;
    }

    expect(caught).toBeInstanceOf(ValidationError);
    expect((caught as ValidationError).message).toContain('invalid riskLevel');
  });

  it('returns defaults when optional fields are missing', async () => {
    const content = JSON.stringify({ riskLevel: 'safe' });
    mockFetch.mockResolvedValueOnce(makeOpenAIResponse(content));

    const result = await analyzeWithAI('test');

    expect(result.riskLevel).toBe('safe');
    expect(result.confidence).toBe(50);
    expect(result.explanation).toBe('AI analysis complete.');
    expect(result.flaggedReasons).toEqual([]);
    expect(result.source).toBe('ai');
  });

  it('throws AIAnalyzerError immediately when API key is the placeholder', async () => {
    envMock.OPENAI_API_KEY = 'sk-your-key-here';

    let caught: unknown;
    try {
      await analyzeWithAI('test');
    } catch (err) {
      caught = err;
    }

    expect(caught).toBeInstanceOf(AIAnalyzerError);
    expect((caught as AIAnalyzerError).message).toBe('OpenAI API key is missing');
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it('throws AIAnalyzerError immediately when API key is empty', async () => {
    envMock.OPENAI_API_KEY = '';

    let caught: unknown;
    try {
      await analyzeWithAI('test');
    } catch (err) {
      caught = err;
    }

    expect(caught).toBeInstanceOf(AIAnalyzerError);
    expect((caught as AIAnalyzerError).message).toBe('OpenAI API key is missing');
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it('rejects with AIAnalyzerError when signal is already aborted', async () => {
    const controller = new AbortController();
    controller.abort();

    mockFetch.mockRejectedValueOnce(
      Object.assign(new Error('The operation was aborted'), { name: 'AbortError' }),
    );

    let caught: unknown;
    try {
      await analyzeWithAI('test', { signal: controller.signal });
    } catch (err) {
      caught = err;
    }

    expect(caught).toBeInstanceOf(AIAnalyzerError);
    expect((caught as AIAnalyzerError).message).toContain('aborted');
  });

  it('does not leak the API key in error cause or message on 401', async () => {
    const testKey = 'sk-test-key-123';
    envMock.OPENAI_API_KEY = testKey;
    mockFetch.mockResolvedValueOnce(makeErrorResponse(401));

    let caught: unknown;
    try {
      await analyzeWithAI('test');
    } catch (err) {
      caught = err;
    }

    expect(caught).toBeInstanceOf(AIAnalyzerError);

    // Serialize the entire error including all own properties
    const serialized = JSON.stringify(
      caught,
      Object.getOwnPropertyNames(caught as object),
    );
    expect(serialized).not.toContain(testKey);
    expect(serialized).not.toContain('sk-test');
  });

  describe('timeout', () => {
    beforeEach(() => {
      jest.useFakeTimers();
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it('rejects with AIAnalyzerError when fetch hangs past timeout', async () => {
      // Mock fetch as a promise that only resolves when the signal fires
      mockFetch.mockImplementationOnce(
        (_url, init) =>
          new Promise<Response>((_resolve, reject) => {
            const sig = (init as RequestInit)?.signal;
            if (sig) {
              sig.addEventListener('abort', () => {
                reject(
                  Object.assign(new Error('The operation was aborted'), {
                    name: 'AbortError',
                  }),
                );
              });
            }
          }),
      );

      const promise = analyzeWithAI('test message');

      // Advance past the 15s timeout
      jest.advanceTimersByTime(16000);

      let caught: unknown;
      try {
        await promise;
      } catch (err) {
        caught = err;
      }

      expect(caught).toBeInstanceOf(AIAnalyzerError);
      expect((caught as AIAnalyzerError).message).toContain('timed out');
    });
  });
});
