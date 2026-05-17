/**
 * AI-generated test cases:
 * - All SAFE_MESSAGES / SUSPICIOUS_MESSAGES / DANGEROUS_MESSAGES fixture loops
 * - Edge case tests (empty, whitespace, very short, very long)
 * - Confidence cap for medium/long no-hit messages
 * - extractUrls extraction, punctuation, email filtering
 * - uppercaseRatio empty/short/long
 * - analyzeUrl shortener and IP detection
 * - Co-occurrence multiplier test
 * - Determinism test
 * - Regression: safe messages produce no flagged reasons (or grammar-only)
 * - Regression: dangerous messages produce at least 2 distinct reason categories
 * - OTP solicitation false positive prevention
 */

import {
  SAFE_MESSAGES,
  SUSPICIOUS_MESSAGES,
  DANGEROUS_MESSAGES,
  EDGE_CASE_MESSAGES,
} from '@/__fixtures__/scamMessages';
import {
  analyzeHeuristic,
  extractUrls,
  analyzeUrl,
  uppercaseRatio,
} from './heuristicAnalyzer';

describe('analyzeHeuristic', () => {
  describe('safe messages', () => {
    it.each(SAFE_MESSAGES.map((m, i) => [i, m]))(
      'returns safe for SAFE_MESSAGES[%i]',
      (_index, message) => {
        const result = analyzeHeuristic(message as string);
        expect(result.riskLevel).toBe('safe');
        expect(result.source).toBe('heuristic');
      },
    );
  });

  describe('dangerous messages', () => {
    it.each(DANGEROUS_MESSAGES.map((m, i) => [i, m]))(
      'returns dangerous or suspicious for DANGEROUS_MESSAGES[%i]',
      (_index, message) => {
        const result = analyzeHeuristic(message as string);
        expect(['dangerous', 'suspicious']).toContain(result.riskLevel);
        expect(result.flaggedReasons.length).toBeGreaterThan(0);
      },
    );
  });

  describe('suspicious messages', () => {
    it.each(SUSPICIOUS_MESSAGES.map((m, i) => [i, m]))(
      'does not return dangerous for SUSPICIOUS_MESSAGES[%i]',
      (_index, message) => {
        const result = analyzeHeuristic(message as string);
        expect(result.riskLevel).not.toBe('dangerous');
      },
    );

    it('flags at least some suspicious messages as not safe', () => {
      const results = SUSPICIOUS_MESSAGES.map((m) => analyzeHeuristic(m));
      const notSafe = results.filter((r) => r.riskLevel !== 'safe');
      expect(notSafe.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('edge cases', () => {
    it('returns safe with high confidence for empty string', () => {
      const result = analyzeHeuristic(EDGE_CASE_MESSAGES.empty);
      expect(result.riskLevel).toBe('safe');
      expect(result.confidence).toBe(90);
      expect(result.explanation).toBe('Message is empty or too short to analyze.');
      expect(result.flaggedReasons).toEqual([]);
    });

    it('returns safe with high confidence for whitespace-only input', () => {
      const result = analyzeHeuristic(EDGE_CASE_MESSAGES.whitespace);
      expect(result.riskLevel).toBe('safe');
      expect(result.confidence).toBe(90);
    });

    it('returns safe with high confidence for very short input', () => {
      const result = analyzeHeuristic(EDGE_CASE_MESSAGES.veryShort);
      expect(result.riskLevel).toBe('safe');
      expect(result.confidence).toBe(90);
    });

    it('does not crash or hang on very long input', () => {
      const start = Date.now();
      const result = analyzeHeuristic(EDGE_CASE_MESSAGES.veryLong);
      const elapsed = Date.now() - start;
      expect(result).toBeDefined();
      expect(result.riskLevel).toBeDefined();
      expect(elapsed).toBeLessThan(1000);
    });

    it('caps confidence for medium-length messages with no matched patterns', () => {
      const result = analyzeHeuristic(
        'Here is the complete meeting recap from today with project notes, next steps, owners, dates, and follow-up items for the whole team to review before our next planning session.',
      );
      expect(result.riskLevel).toBe('safe');
      expect(result.flaggedReasons).toEqual([]);
      expect(result.confidence).toBe(80);
    });

    it('caps confidence further for long messages with no matched patterns', () => {
      const result = analyzeHeuristic(EDGE_CASE_MESSAGES.veryLong);
      expect(result.riskLevel).toBe('safe');
      expect(result.flaggedReasons).toEqual([]);
      expect(result.confidence).toBe(70);
    });
  });

  describe('determinism', () => {
    it('returns identical results for the same input', () => {
      const input = DANGEROUS_MESSAGES[0];
      const first = analyzeHeuristic(input);
      const second = analyzeHeuristic(input);

      expect(first.riskLevel).toBe(second.riskLevel);
      expect(first.confidence).toBe(second.confidence);
      expect(first.flaggedReasons).toEqual(second.flaggedReasons);
      expect(first.explanation).toBe(second.explanation);
      expect(first.source).toBe(second.source);
    });
  });

  describe('OTP false positive prevention', () => {
    it('returns safe for a legitimate Google 2FA SMS', () => {
      const result = analyzeHeuristic('G-482917 is your Google verification code.');
      expect(result.riskLevel).toBe('safe');
    });

    it('returns safe for a legitimate bank security code', () => {
      const result = analyzeHeuristic(
        'Your Chase security code is 839204. Do not share this code with anyone.',
      );
      expect(result.riskLevel).toBe('safe');
    });

    it('returns safe for a legitimate OTP warning with do-not-share wording', () => {
      const result = analyzeHeuristic(
        'Your Google verification code is 482917. Do not share your code with anyone.',
      );
      expect(result.riskLevel).toBe('safe');
      expect(result.flaggedReasons.some((r) => r.category === 'credentials')).toBe(false);
    });

    it('returns safe for a legitimate OTP warning that names the verification code', () => {
      const result = analyzeHeuristic(
        'Your Google verification code is 482917. Do not share your verification code with anyone.',
      );
      expect(result.riskLevel).toBe('safe');
      expect(result.flaggedReasons.some((r) => r.category === 'credentials')).toBe(false);
    });

    it('flags a direct request to send a one-time code', () => {
      const result = analyzeHeuristic('Send me the code.');
      expect(result.riskLevel).toBe('suspicious');
      expect(result.flaggedReasons.some((r) => r.category === 'credentials')).toBe(true);
    });

    it('flags a message that solicits a verification code', () => {
      const result = analyzeHeuristic(
        'We detected suspicious activity. Reply with the code we just sent to verify your identity.',
      );
      expect(result.riskLevel).not.toBe('safe');
      expect(result.flaggedReasons.some((r) => r.category === 'credentials')).toBe(true);
    });

    it('flags support impersonation asking for a verification code', () => {
      const result = analyzeHeuristic(
        'Hi, this is Microsoft support. We noticed unusual activity on your account. Please reply with your verification code.',
      );
      expect(result.riskLevel).toBe('suspicious');
      expect(result.flaggedReasons.some((r) => r.category === 'credentials')).toBe(true);
      expect(result.flaggedReasons.some((r) => r.category === 'impersonation')).toBe(true);
    });

    it('flags a non-negated request to share a verification code', () => {
      const result = analyzeHeuristic(
        'Please share your verification code with me to verify your account.',
      );
      expect(result.riskLevel).not.toBe('safe');
      expect(result.flaggedReasons.some((r) => r.category === 'credentials')).toBe(true);
    });
  });

  describe('real-world scam category coverage', () => {
    it.each([
      [
        'crypto investment',
        'I made 400% profit from crypto trading. Join my crypto investment group today.',
        'financial',
        'Promotes unrealistic crypto or investment returns',
      ],
      [
        'romance money request',
        'My love, I need money for my flight so we can finally be together.',
        'other',
        'Uses romance or relationship pressure tied to money',
      ],
      [
        'job task scam',
        'Recruiter on WhatsApp: remote job opportunity, complete simple tasks and earn daily.',
        'other',
        'Uses job or recruiting language common in task scams',
      ],
      [
        'tech support access',
        'This is Microsoft support. Your computer is infected. Install AnyDesk now.',
        'impersonation',
        'Claims urgent tech support access or malware cleanup',
      ],
      [
        'sweepstakes prize',
        'Congratulations, you have won a prize. Pay the processing fee to claim your prize.',
        'financial',
        'Promises a prize, lottery, or sweepstakes payout',
      ],
    ])('flags %s language', (_name, message, category, description) => {
      const result = analyzeHeuristic(message);

      expect(result.riskLevel).not.toBe('safe');
      expect(
        result.flaggedReasons.some(
          (reason) =>
            reason.category === category &&
            reason.description.includes(description),
        ),
      ).toBe(true);
    });
  });

  describe('co-occurrence multiplier', () => {
    it('scores higher when both brand impersonation and suspicious URL are present', () => {
      const urlOnly = analyzeHeuristic('Check this: http://192.168.1.1/page');
      const combined = analyzeHeuristic(
        'Apple Support: Verify at http://192.168.1.1/apple-verify',
      );

      expect(combined.flaggedReasons.length).toBeGreaterThanOrEqual(
        urlOnly.flaggedReasons.length,
      );

      expect(['suspicious', 'dangerous']).toContain(combined.riskLevel);
    });
  });

  describe('regression: safe message reasons', () => {
    it.each(SAFE_MESSAGES.map((m, i) => [i, m]))(
      'SAFE_MESSAGES[%i] has no flagged reasons or only grammar-category reasons',
      (_index, message) => {
        const result = analyzeHeuristic(message as string);
        const nonGrammarReasons = result.flaggedReasons.filter(
          (r) => r.category !== 'grammar',
        );
        expect(nonGrammarReasons).toHaveLength(0);
      },
    );
  });

  describe('regression: dangerous message categories', () => {
    it.each(DANGEROUS_MESSAGES.map((m, i) => [i, m]))(
      'DANGEROUS_MESSAGES[%i] has at least 2 distinct flagged reason categories',
      (_index, message) => {
        const result = analyzeHeuristic(message as string);
        const categories = new Set(result.flaggedReasons.map((r) => r.category));
        expect(categories.size).toBeGreaterThanOrEqual(2);
      },
    );
  });
});

describe('extractUrls', () => {
  it('extracts URLs from mixed text', () => {
    const text = 'Visit https://example.com and also http://test.org/page for more.';
    const urls = extractUrls(text);
    expect(urls).toContain('https://example.com');
    expect(urls).toContain('http://test.org/page');
  });

  it('extracts www-prefixed URLs', () => {
    const urls = extractUrls('Go to www.example.com/path for info.');
    expect(urls.some((u) => u.includes('www.example.com'))).toBe(true);
  });

  it('strips trailing punctuation from URLs', () => {
    const urls = extractUrls('Check https://example.com/page.');
    expect(urls[0]).toBe('https://example.com/page');
  });

  it('strips trailing exclamation marks', () => {
    const urls = extractUrls('Go to https://example.com/deal!!!');
    expect(urls[0]).toBe('https://example.com/deal');
  });

  it('ignores email addresses', () => {
    const urls = extractUrls('Contact john@example.com for help.');
    const hasEmail = urls.some((u) => u.includes('john@'));
    expect(hasEmail).toBe(false);
  });

  it('handles the emailLike fixture', () => {
    const urls = extractUrls(EDGE_CASE_MESSAGES.emailLike);
    const hasEmail = urls.some((u) => u.includes('john@'));
    expect(hasEmail).toBe(false);
  });

  it.each(['linktr.ee', 'rebrand.ly', 'x.co', 'fb.me', 'lnkd.in'])(
    'extracts new shortener %s without a scheme',
    (domain) => {
      const urls = extractUrls(`Claim details at ${domain}/secure-check now.`);
      expect(urls).toContain(`${domain}/secure-check`);
    },
  );
});

describe('uppercaseRatio', () => {
  it('returns 0 for empty string', () => {
    expect(uppercaseRatio('')).toBe(0);
  });

  it('returns 0 for input with fewer than 10 letters', () => {
    expect(uppercaseRatio('HELLO')).toBe(0);
  });

  it('returns correct ratio for long all-uppercase input', () => {
    expect(uppercaseRatio('ABCDEFGHIJKLMNOP')).toBe(1);
  });

  it('returns correct ratio for mixed-case input', () => {
    const ratio = uppercaseRatio('ABCDEFGHIJklmnopqrst');
    expect(ratio).toBeCloseTo(0.5, 1);
  });

  it('returns 0 for all-lowercase input with enough letters', () => {
    expect(uppercaseRatio('abcdefghijklmnop')).toBe(0);
  });
});

describe('analyzeUrl', () => {
  it('identifies a URL shortener', () => {
    const result = analyzeUrl('https://bit.ly/abc123');
    expect(result.isShortener).toBe(true);
    expect(result.hostname).toBe('bit.ly');
  });

  it('identifies tinyurl as a shortener', () => {
    const result = analyzeUrl('https://tinyurl.com/sec-check');
    expect(result.isShortener).toBe(true);
  });

  it.each(['linktr.ee', 'rebrand.ly', 'x.co', 'fb.me', 'lnkd.in'])(
    'identifies %s as a shortener',
    (domain) => {
      const result = analyzeUrl(`https://${domain}/sec-check`);
      expect(result.isShortener).toBe(true);
      expect(result.hostname).toBe(domain);
    },
  );

  it('identifies a raw IP address URL', () => {
    const result = analyzeUrl('http://192.168.1.4/pay');
    expect(result.isIpAddress).toBe(true);
    expect(result.scheme).toBe('http');
  });

  it('identifies a suspicious TLD', () => {
    const result = analyzeUrl('https://apple-id-verify.xyz/login');
    expect(result.hasSuspiciousTld).toBe(true);
  });

  it('does not flag .info as suspicious', () => {
    const result = analyzeUrl('https://courier-update.info/track');
    expect(result.hasSuspiciousTld).toBe(false);
  });

  it('does not flag a normal domain as suspicious', () => {
    const result = analyzeUrl('https://www.amazon.com/orders');
    expect(result.isShortener).toBe(false);
    expect(result.isIpAddress).toBe(false);
    expect(result.hasSuspiciousTld).toBe(false);
  });

  it('handles URLs without a scheme', () => {
    const result = analyzeUrl('www.example.com/path');
    expect(result.hostname).toBe('www.example.com');
  });
});
