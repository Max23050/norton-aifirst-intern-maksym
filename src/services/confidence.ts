import { ValidationError } from './errors';

const MAX_VALIDATION_VALUE_LENGTH = 120;

export function assertConfidence(value: unknown, label = 'Confidence'): number {
  if (
    typeof value !== 'number' ||
    !Number.isInteger(value) ||
    value < 0 ||
    value > 100
  ) {
    throw new ValidationError(
      `${label} must be an integer from 0 to 100`,
      { receivedValue: sanitizeValidationValue(value) },
    );
  }

  return value;
}

function sanitizeValidationValue(value: unknown): string {
  return String(value).slice(0, MAX_VALIDATION_VALUE_LENGTH);
}
