import type { ReasonCategory } from '@/models';

interface BasePattern {
  id: string;
  category: ReasonCategory;
  severity: 'low' | 'medium' | 'high';
  weight: number;
  description: string;
  tags?: readonly string[];
}

/** A pattern that matches via a regular expression. */
export interface RegexPattern extends BasePattern {
  kind: 'regex';
  pattern: RegExp;
  uniqueMatch?: boolean;
}

/** A pattern that matches via case-insensitive keyword/phrase lookup. */
export interface KeywordPattern extends BasePattern {
  kind: 'keyword';
  keywords: readonly string[];
  ignoreNegated?: boolean;
  uniqueMatch?: boolean;
}

/**
 * A pattern that matches when a named metric exceeds a threshold.
 * Pure declarative config — the heuristic analyzer resolves the metric
 * name to an actual function at match time.
 */
export interface ThresholdPattern extends BasePattern {
  kind: 'threshold';
  metric: string;
  threshold: number;
  uniqueMatch?: boolean;
}

/** Discriminated union of all pattern types in the catalogue. */
export type ScamPattern = RegexPattern | KeywordPattern | ThresholdPattern;

/** Curated catalogue of scam indicator patterns used by the heuristic analyzer. */
export const SCAM_PATTERNS: readonly ScamPattern[] = [
  // ── URL patterns ──────────────────────────────────────────────
  {
    id: 'url.shortener',
    kind: 'regex',
    category: 'url',
    severity: 'high',
    weight: 25,
    description: 'Contains a shortened URL that hides the destination',
    pattern: /\b(?:bit\.ly|tinyurl\.com|t\.co|goo\.gl|is\.gd|ow\.ly|cutt\.ly)\/\S*/i,
    uniqueMatch: true,
  },
  {
    id: 'url.ip-address',
    kind: 'regex',
    category: 'url',
    severity: 'high',
    weight: 30,
    description: 'Links to a raw IP address instead of a domain',
    pattern: /https?:\/\/\d{1,3}(?:\.\d{1,3}){3}/i,
    uniqueMatch: true,
  },
  {
    id: 'url.suspicious-tld',
    kind: 'regex',
    category: 'url',
    severity: 'medium',
    weight: 15,
    description: 'Uses a top-level domain commonly seen in scams',
    pattern: /(?:https?:\/\/|www\.)[\w.-]+\.(?:xyz|top|click|zip|review|country|gq|tk|ml|cf)\b/i,
    uniqueMatch: true,
  },
  {
    id: 'url.plain-http',
    kind: 'regex',
    category: 'url',
    severity: 'low',
    weight: 10,
    description: 'Uses non-HTTPS URL for a security-sensitive action',
    pattern: /\bhttp:\/\/\S+/i,
    uniqueMatch: true,
  },

  // ── Urgency patterns ──────────────────────────────────────────
  {
    id: 'urgency.time-threat',
    kind: 'keyword',
    category: 'urgency',
    severity: 'medium',
    weight: 12,
    description: 'Threatens action within a short time window',
    keywords: [
      'within 24 hours',
      'within 48 hours',
      'expires today',
      'immediately',
      'right away',
      'time is running out',
      'last chance',
      'final warning',
      'limited time',
      'urgently',
    ],
    uniqueMatch: true,
  },
  {
    id: 'urgency.account-threat',
    kind: 'keyword',
    category: 'urgency',
    severity: 'medium',
    weight: 12,
    description: 'Threatens account suspension or closure',
    keywords: [
      'account suspended',
      'account closed',
      'account disabled',
      'account locked',
      'account compromised',
      'will be terminated',
      'will be deactivated',
      'verify your account',
      'verify your identity',
      'confirm your account',
    ],
    uniqueMatch: true,
  },
  {
    id: 'urgency.action-verbs',
    kind: 'keyword',
    category: 'urgency',
    severity: 'low',
    weight: 8,
    description: 'Pressures immediate action ("act now", "verify now")',
    keywords: [
      'act now',
      'verify now',
      'confirm now',
      'click now',
      'click here',
      'track here',
      'respond immediately',
      'update now',
      'call now',
      'reply now',
    ],
    uniqueMatch: true,
  },

  // ── Credential patterns ───────────────────────────────────────
  {
    id: 'credentials.password',
    kind: 'keyword',
    category: 'credentials',
    severity: 'high',
    weight: 30,
    description: 'Requests a password',
    keywords: [
      'enter your password',
      'confirm your password',
      'provide your password',
      'verify your password',
      'password expired',
      'reset your password',
      'confirm password',
    ],
    uniqueMatch: true,
  },
  {
    id: 'credentials.otp-solicitation',
    kind: 'keyword',
    category: 'credentials',
    severity: 'medium',
    weight: 30,
    description: 'Asks the recipient to share or send a one-time code',
    keywords: [
      'send your verification code',
      'send your security code',
      'send me the code',
      'send us the code',
      'share your verification code',
      'share your security code',
      'share your code with',
      'reply with your verification code',
      'reply with your security code',
      'reply with your code',
      'reply with the code',
      'enter your verification code',
      'enter your security code',
      'provide your verification code',
      'provide your security code',
      'forward the code',
      'tell me your code',
      'tell us your code',
    ],
    ignoreNegated: true,
    uniqueMatch: true,
  },

  // ── Financial patterns ────────────────────────────────────────
  {
    id: 'financial.payment-rails',
    kind: 'keyword',
    category: 'financial',
    severity: 'high',
    weight: 25,
    description: 'Requests payment via gift cards, crypto, or wire transfer',
    keywords: [
      'gift card',
      'gift cards',
      'itunes card',
      'bitcoin',
      'cryptocurrency',
      'wire transfer',
      'western union',
      'moneygram',
      'zelle',
      'cash app',
      'crypto',
    ],
    uniqueMatch: true,
  },
  {
    id: 'financial.banking-details',
    kind: 'keyword',
    category: 'financial',
    severity: 'high',
    weight: 25,
    description: 'Requests bank account, card, or routing details',
    keywords: [
      'bank account',
      'routing number',
      'account number',
      'credit card number',
      'card number',
      'card details',
      'cvv',
      'social security',
      'ssn',
    ],
    uniqueMatch: true,
  },

  // ── Impersonation patterns ────────────────────────────────────
  {
    id: 'impersonation.brand',
    kind: 'keyword',
    category: 'impersonation',
    severity: 'low',
    weight: 5,
    description: 'Mentions a commonly impersonated brand',
    keywords: [
      'apple support',
      'apple id',
      'apple account',
      'microsoft support',
      'microsoft account',
      'amazon order',
      'amazon account',
      'amazon customer service',
      'paypal account',
      'paypal payment',
      'netflix subscription',
      'netflix account',
      'google account',
      'gmail account',
      'usps delivery',
      'usps package',
      'fedex delivery',
      'dhl delivery',
      'ups delivery',
      'irs notice',
      'irs payment',
      'hmrc payment',
      'chase account',
      'bank of america account',
      'wells fargo account',
      'your bank account',
      'the bank account',
      'bank statement',
    ],
    uniqueMatch: true,
  },
  {
    id: 'impersonation.greeting',
    kind: 'keyword',
    category: 'impersonation',
    severity: 'low',
    weight: 5,
    description: 'Uses a generic greeting like "Dear Customer"',
    keywords: [
      'dear customer',
      'dear user',
      'dear account holder',
      'dear valued member',
      'dear sir',
      'dear madam',
      'dear client',
    ],
    uniqueMatch: true,
  },

  // ── Grammar patterns ──────────────────────────────────────────
  {
    id: 'grammar.excessive-caps',
    kind: 'threshold',
    category: 'grammar',
    severity: 'low',
    weight: 5,
    description: 'Uses excessive uppercase text',
    metric: 'uppercaseRatio',
    threshold: 0.6,
    uniqueMatch: true,
  },
  {
    id: 'grammar.excessive-punct',
    kind: 'regex',
    category: 'grammar',
    severity: 'low',
    weight: 3,
    description: 'Uses excessive exclamation marks',
    pattern: /!{3,}/,
    uniqueMatch: true,
  },
];
