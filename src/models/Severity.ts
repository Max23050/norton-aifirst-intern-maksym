/** How strongly a flagged indicator suggests a scam. */
export const SEVERITIES = ['low', 'medium', 'high'] as const;

export type Severity = typeof SEVERITIES[number];
