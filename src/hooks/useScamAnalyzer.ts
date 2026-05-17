import { useCallback, useEffect, useRef, useState } from 'react';

import type { RiskAssessment } from '@/models';
import { analyze as analyzeMessage } from '@/services/analyzerOrchestrator';

const MAX_CACHE_SIZE = 20;
const EMPTY_MESSAGE_ERROR = 'Paste a message first.';
const DEFAULT_ERROR_MESSAGE = 'Unable to analyze this message. Please try again.';

export type ScamAnalyzerState =
  | { status: 'idle' }
  | { status: 'analyzing' }
  | { status: 'success'; data: RiskAssessment }
  | { status: 'error'; error: string };

export interface UseScamAnalyzerResult {
  state: ScamAnalyzerState;
  analyze: (message: string) => Promise<void>;
  reset: () => void;
}

export function useScamAnalyzer(): UseScamAnalyzerResult {
  const [state, setState] = useState<ScamAnalyzerState>({ status: 'idle' });
  const controllerRef = useRef<AbortController | null>(null);
  const cacheRef = useRef<Map<string, RiskAssessment>>(new Map());

  const abortActiveRequest = useCallback(() => {
    controllerRef.current?.abort();
    controllerRef.current = null;
  }, []);

  const reset = useCallback(() => {
    abortActiveRequest();
    // Reset is a UI reset; keep the in-session cache for repeated checks.
    setState({ status: 'idle' });
  }, [abortActiveRequest]);

  const analyze = useCallback(async (message: string) => {
    const trimmedMessage = message.trim();

    if (trimmedMessage.length === 0) {
      setState({ status: 'error', error: EMPTY_MESSAGE_ERROR });
      return;
    }

    abortActiveRequest();

    const cached = cacheRef.current.get(trimmedMessage);
    if (cached) {
      setState({ status: 'success', data: cached });
      return;
    }

    const controller = new AbortController();
    controllerRef.current = controller;
    setState({ status: 'analyzing' });

    try {
      const data = await analyzeMessage(trimmedMessage, {
        signal: controller.signal,
      });

      if (controller.signal.aborted || controllerRef.current !== controller) {
        return;
      }

      addToCache(cacheRef.current, trimmedMessage, data);
      setState({ status: 'success', data });
    } catch (caught: unknown) {
      if (isAbortError(caught)) {
        if (!controller.signal.aborted && controllerRef.current === controller) {
          setState({ status: 'idle' });
        }
        return;
      }

      if (controller.signal.aborted || controllerRef.current !== controller) {
        return;
      }

      setState({ status: 'error', error: getErrorMessage(caught) });
    } finally {
      if (controllerRef.current === controller) {
        controllerRef.current = null;
      }
    }
  }, [abortActiveRequest]);

  useEffect(() => abortActiveRequest, [abortActiveRequest]);

  return { state, analyze, reset };
}

function addToCache(
  cache: Map<string, RiskAssessment>,
  key: string,
  value: RiskAssessment,
): void {
  if (!cache.has(key) && cache.size >= MAX_CACHE_SIZE) {
    const oldestKey = cache.keys().next().value;

    if (oldestKey !== undefined) {
      cache.delete(oldestKey);
    }
  }

  cache.set(key, value);
}

function isAbortError(error: unknown): boolean {
  if (
    typeof DOMException !== 'undefined' &&
    error instanceof DOMException &&
    error.name === 'AbortError'
  ) {
    return true;
  }

  return (
    isObjectRecord(error) &&
    error.name === 'AbortError'
  );
}

function getErrorMessage(error: unknown): string {
  if (error instanceof Error && error.message.trim().length > 0) {
    return error.message;
  }

  if (typeof error === 'string' && error.trim().length > 0) {
    return error;
  }

  if (
    isObjectRecord(error) &&
    typeof error.message === 'string' &&
    error.message.trim().length > 0
  ) {
    return error.message;
  }

  return DEFAULT_ERROR_MESSAGE;
}

function isObjectRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}
