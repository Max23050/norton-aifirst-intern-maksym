import type { RiskLevel, FlaggedReason, RiskAssessment } from '@/models';
import { SCAM_PATTERNS, type ScamPattern } from '@/data/scamPatterns';
import { uppercaseRatio } from '@/utils/textAnalysis';

// Re-export for testing convenience
export { uppercaseRatio } from '@/utils/textAnalysis';

// ── Internal types ──────────────────────────────────────────────

interface MatchedPattern {
  id: string;
  category: ScamPattern['category'];
  severity: FlaggedReason['severity'];
  weight: number;
  description: string;
}

/** Structured analysis of a single URL extracted from a message. */
export interface UrlAnalysis {
  /** The raw URL string. */
  raw: string;
  /** The hostname portion (e.g. "bit.ly"). */
  hostname: string;
  /** "http" or "https", or empty if no scheme was present. */
  scheme: string;
  /** Whether the hostname belongs to a known URL shortener. */
  isShortener: boolean;
  /** Whether the hostname is a raw IP address. */
  isIpAddress: boolean;
  /** Whether the TLD is commonly associated with scams. */
  hasSuspiciousTld: boolean;
  /** Whether the hostname mixes Unicode scripts (e.g. Latin + Cyrillic). */
  hasMixedScript: boolean;
}

// ── Constants ───────────────────────────────────────────────────

const SHORTENER_HOSTS = new Set([
  'bit.ly',
  'tinyurl.com',
  't.co',
  'goo.gl',
  'is.gd',
  'ow.ly',
  'cutt.ly',
]);

const SUSPICIOUS_TLDS = new Set([
  'xyz', 'top', 'click', 'zip', 'review', 'country', 'gq', 'tk', 'ml', 'cf',
]);

const COMMON_TLDS = [
  'com', 'org', 'net', 'io', 'co', 'info', 'biz', 'gov', 'edu',
  'ly', 'gl', 'gd',
  'xyz', 'top', 'click', 'zip', 'review', 'country', 'gq', 'tk', 'ml', 'cf',
];

const SHORTENER_DOMAINS = [
  'bit\\.ly', 'tinyurl\\.com', 't\\.co', 'goo\\.gl', 'is\\.gd', 'ow\\.ly', 'cutt\\.ly',
];

const URL_REGEX = new RegExp(
  '(?:https?:\\/\\/\\S+)' +
  '|(?:www\\.\\S+)' +
  '|(?:(?:' + SHORTENER_DOMAINS.join('|') + ')\\/\\S*)' +
  '|(?:[a-zA-Z0-9](?:[a-zA-Z0-9-]*[a-zA-Z0-9])?\\.(?:' + COMMON_TLDS.join('|') + ')(?:\\/\\S*)?)' ,
  'gi',
);

const IP_HOST_REGEX = /^\d{1,3}(?:\.\d{1,3}){3}$/;

const SEVERITY_RANK: Record<FlaggedReason['severity'], number> = {
  low: 0,
  medium: 1,
  high: 2,
};

const CATEGORY_LABELS: Record<string, string> = {
  url: 'suspicious URLs',
  urgency: 'urgency tactics',
  credentials: 'credential requests',
  financial: 'financial requests',
  impersonation: 'brand impersonation',
  grammar: 'grammar issues',
  other: 'other indicators',
};

// ── Exported helpers ────────────────────────────────────────────

/** Extracts all URLs from text. Strips trailing punctuation, filters emails and version strings. */
export function extractUrls(text: string): string[] {
  const results: string[] = [];
  let match: RegExpExecArray | null;

  URL_REGEX.lastIndex = 0;
  while ((match = URL_REGEX.exec(text)) !== null) {
    const start = match.index;
    if (start > 0 && text[start - 1] === '@') continue;

    const url = match[0].replace(/[.,;:!?)>]+$/, '');

    const pathPart = url.replace(/^(?:https?:\/\/)?[^/]+/, '');
    if (pathPart && /^\/[\d.]+$/.test(pathPart)) continue;

    results.push(url);
  }

  return results;
}

/** Parses a URL into structured fields for scam analysis. */
export function analyzeUrl(url: string): UrlAnalysis {
  let normalized = url;
  if (!/^https?:\/\//i.test(normalized)) {
    normalized = 'https://' + normalized;
  }

  let hostname = '';
  let scheme = '';
  try {
    const parsed = new URL(normalized);
    hostname = parsed.hostname.toLowerCase();
    scheme = parsed.protocol.replace(':', '');
  } catch {
    const schemeMatch = normalized.match(/^(https?):\/\/([^/:]+)/i);
    if (schemeMatch) {
      scheme = schemeMatch[1].toLowerCase();
      hostname = schemeMatch[2].toLowerCase();
    }
  }

  const isIpAddress = IP_HOST_REGEX.test(hostname);
  const isShortener = SHORTENER_HOSTS.has(hostname);
  const tld = hostname.split('.').pop() ?? '';
  const hasSuspiciousTld = SUSPICIOUS_TLDS.has(tld);
  const hasMixedScript = detectMixedScript(hostname);

  return {
    raw: url,
    hostname,
    scheme,
    isShortener,
    isIpAddress,
    hasSuspiciousTld,
    hasMixedScript,
  };
}

// ── Private helpers ─────────────────────────────────────────────

function detectMixedScript(hostname: string): boolean {
  let hasLatin = false;
  let hasCyrillic = false;
  for (let i = 0; i < hostname.length; i++) {
    const code = hostname.charCodeAt(i);
    if ((code >= 0x41 && code <= 0x5a) || (code >= 0x61 && code <= 0x7a)) {
      hasLatin = true;
    }
    if (code >= 0x0400 && code <= 0x04ff) {
      hasCyrillic = true;
    }
    if (hasLatin && hasCyrillic) return true;
  }
  return false;
}

function matchKeywordPattern(message: string, keywords: readonly string[]): boolean {
  const lower = message.toLowerCase();
  for (const kw of keywords) {
    const escaped = kw.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const re = new RegExp('\\b' + escaped + '\\b', 'i');
    if (re.test(lower)) return true;
  }
  return false;
}

function buildExplanation(
  riskLevel: RiskLevel,
  matched: MatchedPattern[],
): string {
  if (riskLevel === 'safe') {
    return 'No scam indicators detected in this message.';
  }

  const categoryCounts = new Map<string, number>();
  for (const m of matched) {
    categoryCounts.set(m.category, (categoryCounts.get(m.category) ?? 0) + m.weight);
  }
  const sorted = [...categoryCounts.entries()].sort((a, b) => b[1] - a[1]);
  const topCategories = sorted.map(([cat]) => CATEGORY_LABELS[cat] ?? cat);

  if (riskLevel === 'suspicious') {
    return `This message shows some scam-like signals, including ${topCategories[0]}.`;
  }

  const top2 = topCategories.slice(0, 2).join(' and ');
  return `This message has multiple strong scam indicators including ${top2}. Do not click any links or share personal information.`;
}

function scoreToRiskLevel(score: number): RiskLevel {
  if (score <= 25) return 'safe';
  if (score <= 60) return 'suspicious';
  return 'dangerous';
}

function scoreToConfidence(score: number, matchCount: number): number {
  if (matchCount === 0) return 95;
  if (score <= 10) return 85;
  if (score <= 25) return 70;
  if (score <= 45) return 65;
  if (score <= 70) return 80;
  return 90;
}

function dedupeReasons(matched: MatchedPattern[]): FlaggedReason[] {
  const byCategory = new Map<string, MatchedPattern[]>();
  for (const m of matched) {
    const arr = byCategory.get(m.category);
    if (arr) arr.push(m);
    else byCategory.set(m.category, [m]);
  }

  const results: FlaggedReason[] = [];
  for (const [category, patterns] of byCategory) {
    patterns.sort((a, b) => SEVERITY_RANK[b.severity] - SEVERITY_RANK[a.severity]);
    const highestSeverity = patterns[0].severity;
    const descriptions = [...new Set(patterns.map((p) => p.description))];
    results.push({
      category: category as FlaggedReason['category'],
      description: descriptions.join('; '),
      severity: highestSeverity,
    });
  }

  return results;
}

// ── Main analyzer ───────────────────────────────────────────────

/** Pure synchronous heuristic scam analyzer. Scores a message against a curated pattern catalogue. */
export function analyzeHeuristic(message: string): RiskAssessment {
  if (!message || message.trim().length < 3) {
    return {
      riskLevel: 'safe',
      confidence: 90,
      explanation: 'Message is empty or too short to analyze.',
      flaggedReasons: [],
      source: 'heuristic',
      analyzedAt: new Date(),
    };
  }

  const matched: MatchedPattern[] = [];
  const matchedIds = new Set<string>();

  const urls = extractUrls(message);
  const urlAnalyses = urls.map(analyzeUrl);

  const hasShortener = urlAnalyses.some((u) => u.isShortener);
  const hasIpAddress = urlAnalyses.some((u) => u.isIpAddress);
  const hasSuspiciousTld = urlAnalyses.some((u) => u.hasSuspiciousTld);
  const hasPlainHttp = urlAnalyses.some((u) => u.scheme === 'http');

  for (const pat of SCAM_PATTERNS) {
    let isMatch = false;

    if (pat.category === 'url') {
      switch (pat.id) {
        case 'url.shortener':
          isMatch = hasShortener;
          break;
        case 'url.ip-address':
          isMatch = hasIpAddress;
          break;
        case 'url.suspicious-tld':
          isMatch = hasSuspiciousTld;
          break;
        case 'url.plain-http':
          isMatch = hasPlainHttp;
          break;
      }
    } else if (pat.kind === 'function') {
      isMatch = pat.evaluate(message);
    } else if (pat.kind === 'regex') {
      pat.pattern.lastIndex = 0;
      isMatch = pat.pattern.test(message);
    } else {
      isMatch = matchKeywordPattern(message, pat.keywords);
    }

    if (isMatch && !matchedIds.has(pat.id)) {
      matchedIds.add(pat.id);
      matched.push({
        id: pat.id,
        category: pat.category,
        severity: pat.severity,
        weight: pat.weight,
        description: pat.description,
      });
    }
  }

  let urgencyTotal = 0;
  let rawScore = 0;

  for (const m of matched) {
    if (m.category === 'urgency') {
      const allowed = Math.min(m.weight, 30 - urgencyTotal);
      if (allowed > 0) {
        urgencyTotal += allowed;
        rawScore += allowed;
      }
    } else {
      rawScore += m.weight;
    }
  }

  const hasImpersonation = matched.some((m) => m.category === 'impersonation');
  const hasUrlMatch = matched.some((m) => m.category === 'url');
  if (hasImpersonation && hasUrlMatch) {
    rawScore = Math.round(rawScore * 1.5);
  }

  const score = Math.min(rawScore, 100);
  const riskLevel = scoreToRiskLevel(score);
  const confidence = scoreToConfidence(score, matched.length);
  const flaggedReasons = dedupeReasons(matched);
  const explanation = buildExplanation(riskLevel, matched);

  return {
    riskLevel,
    confidence,
    explanation,
    flaggedReasons,
    source: 'heuristic',
    analyzedAt: new Date(),
  };
}
