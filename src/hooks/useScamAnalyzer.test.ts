/**
 * AI-generated test cases:
 * - Initial idle state
 * - Empty and whitespace-only input validation
 * - Happy path idle to analyzing to success transition
 * - In-session cache hit with trimmed message keys
 * - Reset clears UI state but preserves in-session cache
 * - FIFO cache eviction after 20 entries
 * - AbortController cancellation on unmount
 * - AbortController cancellation on sequential analyze calls
 * - Error transition for non-abort failures
 * - AbortError handling without entering error state
 */

import { act, renderHook } from '@testing-library/react-native';

import type { RiskAssessment } from '@/models';
import { analyze as analyzeMessage } from '@/services/analyzerOrchestrator';

import { useScamAnalyzer } from './useScamAnalyzer';

jest.mock('@/services/analyzerOrchestrator', () => ({
  analyze: jest.fn(),
}));

const mockAnalyzeMessage = analyzeMessage as jest.MockedFunction<typeof analyzeMessage>;

const BASE_DATE = new Date('2026-01-01T00:00:00.000Z');

interface Deferred<T> {
  promise: Promise<T>;
  resolve: (value: T) => void;
  reject: (reason: unknown) => void;
}

function createDeferred<T>(): Deferred<T> {
  let resolve!: (value: T) => void;
  let reject!: (reason: unknown) => void;
  const promise = new Promise<T>((promiseResolve, promiseReject) => {
    resolve = promiseResolve;
    reject = promiseReject;
  });

  return { promise, resolve, reject };
}

function makeAssessment(overrides: Partial<RiskAssessment> = {}): RiskAssessment {
  return {
    riskLevel: 'safe',
    confidence: 90,
    explanation: 'No obvious scam indicators were detected.',
    flaggedReasons: [],
    source: 'heuristic',
    analyzedAt: new Date(BASE_DATE),
    ...overrides,
  };
}

function makeAbortError(): DOMException | Error {
  if (typeof DOMException !== 'undefined') {
    return new DOMException('Request was aborted.', 'AbortError');
  }

  const error = new Error('Request was aborted.');
  error.name = 'AbortError';
  return error;
}

describe('useScamAnalyzer', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('starts in the idle state', () => {
    const { result } = renderHook(() => useScamAnalyzer());

    expect(result.current.state).toEqual({ status: 'idle' });
  });

  it('enters error state without analyzing empty or whitespace-only input', async () => {
    const { result } = renderHook(() => useScamAnalyzer());

    await act(async () => {
      await result.current.analyze('   \n\t  ');
    });

    expect(mockAnalyzeMessage).not.toHaveBeenCalled();
    expect(result.current.state).toEqual({
      status: 'error',
      error: 'Paste a message first.',
    });
  });

  it('transitions from idle to analyzing to success', async () => {
    const deferred = createDeferred<RiskAssessment>();
    const assessment = makeAssessment({ riskLevel: 'dangerous' });
    mockAnalyzeMessage.mockReturnValueOnce(deferred.promise);
    const { result } = renderHook(() => useScamAnalyzer());

    let analyzePromise!: Promise<void>;
    act(() => {
      analyzePromise = result.current.analyze('Pay this invoice now');
    });

    expect(result.current.state).toEqual({ status: 'analyzing' });

    await act(async () => {
      deferred.resolve(assessment);
      await analyzePromise;
    });

    expect(result.current.state).toEqual({
      status: 'success',
      data: assessment,
    });
    expect(mockAnalyzeMessage).toHaveBeenCalledWith(
      'Pay this invoice now',
      { signal: expect.any(AbortSignal) },
    );
  });

  it('uses a cached result when analyzing the same trimmed message again', async () => {
    const assessment = makeAssessment({ explanation: 'Cached assessment.' });
    mockAnalyzeMessage.mockResolvedValueOnce(assessment);
    const { result } = renderHook(() => useScamAnalyzer());

    await act(async () => {
      await result.current.analyze('  verify your account  ');
    });
    await act(async () => {
      await result.current.analyze('verify your account');
    });

    expect(mockAnalyzeMessage).toHaveBeenCalledTimes(1);
    expect(mockAnalyzeMessage).toHaveBeenCalledWith(
      'verify your account',
      { signal: expect.any(AbortSignal) },
    );
    expect(result.current.state).toEqual({
      status: 'success',
      data: assessment,
    });
  });

  it('preserves the in-session cache after reset', async () => {
    const assessment = makeAssessment({ explanation: 'Cached across reset.' });
    mockAnalyzeMessage.mockResolvedValueOnce(assessment);
    const { result } = renderHook(() => useScamAnalyzer());

    await act(async () => {
      await result.current.analyze('cached message');
    });

    act(() => {
      result.current.reset();
    });

    expect(result.current.state).toEqual({ status: 'idle' });

    await act(async () => {
      await result.current.analyze('cached message');
    });

    expect(mockAnalyzeMessage).toHaveBeenCalledTimes(1);
    expect(result.current.state).toEqual({
      status: 'success',
      data: assessment,
    });
  });

  it('evicts the oldest cached item after storing twenty-one unique messages', async () => {
    mockAnalyzeMessage.mockImplementation(async (message) => (
      makeAssessment({ explanation: `Assessment for ${message}` })
    ));
    const { result } = renderHook(() => useScamAnalyzer());

    for (let index = 0; index < 21; index += 1) {
      await act(async () => {
        await result.current.analyze(`message-${index}`);
      });
    }

    await act(async () => {
      await result.current.analyze('message-0');
    });

    expect(mockAnalyzeMessage).toHaveBeenCalledTimes(22);
    expect(mockAnalyzeMessage).toHaveBeenLastCalledWith(
      'message-0',
      { signal: expect.any(AbortSignal) },
    );
  });

  it('aborts the in-flight request when the hook unmounts', async () => {
    const deferred = createDeferred<RiskAssessment>();
    const assessment = makeAssessment();
    mockAnalyzeMessage.mockReturnValueOnce(deferred.promise);
    const { result, unmount } = renderHook(() => useScamAnalyzer());

    let analyzePromise!: Promise<void>;
    act(() => {
      analyzePromise = result.current.analyze('Pending message');
    });

    const signal = mockAnalyzeMessage.mock.calls[0][1]?.signal;
    expect(signal?.aborted).toBe(false);

    unmount();

    expect(signal?.aborted).toBe(true);

    await act(async () => {
      deferred.resolve(assessment);
      await analyzePromise;
    });
  });

  it('aborts the previous request when analyze is called again', async () => {
    const firstDeferred = createDeferred<RiskAssessment>();
    const secondDeferred = createDeferred<RiskAssessment>();
    const firstAssessment = makeAssessment({ explanation: 'First result.' });
    const secondAssessment = makeAssessment({ explanation: 'Second result.' });
    mockAnalyzeMessage
      .mockReturnValueOnce(firstDeferred.promise)
      .mockReturnValueOnce(secondDeferred.promise);
    const { result } = renderHook(() => useScamAnalyzer());

    let firstPromise!: Promise<void>;
    act(() => {
      firstPromise = result.current.analyze('First message');
    });
    const firstSignal = mockAnalyzeMessage.mock.calls[0][1]?.signal;

    let secondPromise!: Promise<void>;
    act(() => {
      secondPromise = result.current.analyze('Second message');
    });
    const secondSignal = mockAnalyzeMessage.mock.calls[1][1]?.signal;

    expect(firstSignal?.aborted).toBe(true);
    expect(secondSignal?.aborted).toBe(false);
    expect(result.current.state).toEqual({ status: 'analyzing' });

    await act(async () => {
      firstDeferred.resolve(firstAssessment);
      await firstPromise;
    });

    expect(result.current.state).toEqual({ status: 'analyzing' });

    await act(async () => {
      secondDeferred.resolve(secondAssessment);
      await secondPromise;
    });

    expect(result.current.state).toEqual({
      status: 'success',
      data: secondAssessment,
    });
  });

  it('transitions to error when the analyzer fails with a non-abort error', async () => {
    mockAnalyzeMessage.mockRejectedValueOnce(new Error('Network unavailable'));
    const { result } = renderHook(() => useScamAnalyzer());

    await act(async () => {
      await result.current.analyze('Check this link');
    });

    expect(result.current.state).toEqual({
      status: 'error',
      error: 'Network unavailable',
    });
  });

  it('returns to idle instead of error when the analyzer throws an AbortError', async () => {
    mockAnalyzeMessage.mockRejectedValueOnce(makeAbortError());
    const { result } = renderHook(() => useScamAnalyzer());

    await act(async () => {
      await result.current.analyze('Check this link');
    });

    expect(result.current.state).toEqual({ status: 'idle' });
  });
});
