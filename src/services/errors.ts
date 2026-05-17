/**
 * Typed error classes for the analyzer services.
 * All extend Error with a typed `cause` chain for error inspection.
 */

/** Base error for all analyzer failures. */
export class AnalyzerError extends Error {
  /** The underlying cause, if any. Safe to inspect but may be sanitized. */
  override readonly cause?: unknown;

  constructor(message: string, cause?: unknown) {
    super(message, { cause });
    this.name = 'AnalyzerError';
    this.cause = cause;
    if (typeof Error.captureStackTrace === 'function') {
      Error.captureStackTrace(this, this.constructor);
    }
  }
}

/** Error originating from the AI (OpenAI) analysis service. */
export class AIAnalyzerError extends AnalyzerError {
  constructor(message: string, cause?: unknown) {
    super(message, cause);
    this.name = 'AIAnalyzerError';
  }
}

/** Error from parsing or validating AI response data. */
export class ValidationError extends AnalyzerError {
  constructor(message: string, cause?: unknown) {
    super(message, cause);
    this.name = 'ValidationError';
  }
}
