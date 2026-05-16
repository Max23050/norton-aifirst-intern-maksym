/**
 * Pure stateless text analysis helpers.
 * Used by data catalogues and services for text measurement.
 */

/**
 * Returns the ratio of uppercase letters to all alphabetic chars.
 * Returns 0 if fewer than 10 alphabetic characters are present (too short to judge).
 */
export function uppercaseRatio(text: string): number {
  let upper = 0;
  let alpha = 0;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (/[a-zA-Z]/.test(ch)) {
      alpha++;
      if (ch >= 'A' && ch <= 'Z') upper++;
    }
  }
  if (alpha < 10) return 0;
  return upper / alpha;
}
