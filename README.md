# Norton Scam Detector

Option B: Scam Message Detector prototype for the Gen Digital Norton Mobile Engineering AI-First Intern take-home assignment.

This is a single-screen React Native and Expo app where a user can paste or type a suspicious SMS, email snippet, or URL and receive a structured risk assessment inspired by Norton Genie. The result includes a risk level, confidence score, short explanation, and specific flagged reasons.

## Project Overview

The app uses a hybrid analyzer:

- A deterministic heuristic analyzer runs first against a typed scam pattern catalog.
- If the heuristic result is high-confidence safe or dangerous, the app returns that result immediately.
- If the heuristic result is uncertain, the orchestrator calls OpenAI and merges the AI result with the heuristic result.
- If the AI call has a known service failure, the app falls back to the heuristic result and marks the assessment as degraded.

Key product goals:

- Keep the first screen focused on the main task: paste a message and analyze it.
- Use Norton-adjacent visual language: cream background, white cards, black borders, and yellow primary CTA.
- Treat user-provided message text as untrusted data in AI prompts.
- Protect common false positives such as legitimate 2FA messages and bank security codes.

## Tech Stack

- React Native
- Expo
- TypeScript strict mode
- Jest with `jest-expo`
- ESLint with `eslint-config-expo`
- Prettier

## Setup

Install dependencies:

```bash
npm install
```

Create a local environment file:

```bash
cp .env.example .env
```

Then replace the placeholder in `.env`:

```bash
OPENAI_API_KEY=sk-your-real-key
```

The app can still demonstrate heuristic behavior without a valid key, but uncertain messages that require AI will fall back to heuristic-only analysis.

## Run

Start Expo:

```bash
npm start
```

Run on web, useful for recording a demo without Xcode:

```bash
npm run web
```

Run on Android with Expo Go or an emulator:

```bash
npm run android
```

Run on iOS simulator:

```bash
npm run ios
```

## Verification

```bash
npm run typecheck
npm run lint
npm test
```

The repository also includes a GitHub Actions workflow that runs typecheck, lint, and tests on pull requests and pushes to `main`.

## Architecture

The code is split by responsibility:

- `App.tsx`: smart screen composition, keyboard handling, SafeAreaView, and hook wiring.
- `src/components`: dumb presentational UI components.
- `src/hooks/useScamAnalyzer.ts`: view-model state machine, abort handling, and bounded in-session cache.
- `src/services/heuristicAnalyzer.ts`: pure synchronous rule-based analyzer.
- `src/services/aiAnalyzer.ts`: one OpenAI request, response validation, prompt-injection mitigation, timeout handling, and typed errors.
- `src/services/analyzerOrchestrator.ts`: heuristic-first gate, AI fallback, and result merge.
- `src/data/scamPatterns.ts`: typed static scam pattern catalog.
- `src/models`: shared domain types.

The merge strategy is intentionally simple:

- Risk level: choose the more cautious level.
- Confidence: weighted average, 0.6 AI and 0.4 heuristic.
- Reasons: union of reasons, deduped by category.

The 0.6/0.4 confidence weight is a product heuristic, not a calibrated statistical model. AI gets slightly higher weight because it can handle context better, while heuristic confidence remains included because deterministic signals such as suspicious URLs and OTP solicitation are valuable.

## AI Failure Contract

The orchestrator falls back to a degraded heuristic result only for known analyzer failures:

- OpenAI network or fetch failure
- Request timeout
- OpenAI HTTP errors such as 401, 429, or 5xx
- Invalid or malformed AI response JSON
- Schema validation errors from the AI response
- Caller aborts

The app does not retry AI requests. Unexpected programmer errors should be rethrown instead of hidden by fallback logic.

## AI Interaction Log

### Prompt 1: Project architecture and module boundaries

**Phase:** Architecture / setup
**Tool used:** Claude (Opus 4.7)

**Prompt:**
> I'm building a React Native + Expo scam message detector. The app analyzes pasted SMS/email/URL text and returns a risk level (safe/suspicious/dangerous), confidence score, and flagged reasons. I plan to combine local heuristics (regex, keyword lists) with an OpenAI GPT-4o-mini call, then merge the results. Constraints: TypeScript, must be unit-testable, must hide API key, single screen UX. Propose a folder structure and module boundaries. For each module, state its single responsibility and what it should NOT do.

**What the AI produced:**
A folder structure with clear separation between models, data, services
(heuristic, AI, orchestrator), hooks, components, and screens. Each module
came with a "MUST"/"MUST NOT" responsibility statement. Importantly, the AI
pushed back on two things in my prompt:
1. The phrase "hide API key" — pointed out that .env in a client app isn't
   really hidden, just gitignored. Suggested noting this in the README.
2. The vague "combine heuristic + AI" — forced me to pick a merge strategy
   (parallel, sequential gate, fallback) before locking in structure.

**My evaluation:**
- The MUST/MUST NOT framing per module is sharper than what I would have
  written myself; I adopted it as-is.
- The push-back on API-key security is a good catch — I'll add a section
  on this to my README reflection.
- I rejected the suggestion to skip a state management library at first
  glance, but on second thought a single useState-driven hook is enough.
  Reverted to AI's recommendation.
- Follow-up prompt: asked it to define the exact dependency graph so I
  could enforce one-way imports. It produced a clear arrow diagram I'm
  using as my mental lint rule. 
- What I refined: I sent a follow-up prompt forcing the AI to co-locate the tests.

**Final outcome:**
Folder structure.
src/services/, src/hooks/, src/models/, src/data/, src/theme/, src/components/.

**Lesson:**
Forcing the AI to declare what each module must NOT do produced cleaner
boundaries than asking what each module SHOULD do. Constraints generate
better designs than affordances.


## 2026-05-15 — Caught contradiction in AI's setup instructions

**Tool:** Claude (Opus 4.7) via claude.ai
**Phase:** Setup

**Context:** AI proposed an architecture explicitly rejecting state
management libraries ("no Zustand/Redux — one screen, one hook"), but
the setup commands in the same conversation included
`npm install zustand`. I caught the contradiction by reading the
generated package.json.

**My action:** Asked the AI to justify the inclusion. It acknowledged
the mistake and instructed me to uninstall. Also removed `openai`
which we had earlier agreed to skip in favor of plain fetch.

**Lesson:** AI output across long conversations can drift from earlier
stated decisions. Reading every file the AI generates against the
agreed plan — not just the latest output — catches these. Verification
beats trust.

## Prompt 2: First Claude Code session: models

**Tool:** Claude Code (Opus 4.7)
**Phase:** Implementation — type models

**Prompt:** 
> I need to create the type models for this project. Read CLAUDE.md first if you haven't already.
Create the following files in src/models/:

>RiskLevel.ts — a string union type with values 'safe' | 'suspicious' | 'dangerous', exported as a type alias. Also export a >const array RISK_LEVELS containing all values, typed as readonly RiskLevel[], useful for iteration and validation.
>FlaggedReason.ts — a ReasonCategory string union covering: 'url', 'urgency', 'credentials', 'financial', 'impersonation'  'grammar', 'other'. Also export a FlaggedReason interface with: category: ReasonCategory, description: string (1 sentence, human-readable), and severity: 'low' | 'medium' | 'high'. Export a const array REASON_CATEGORIES for iteration.
>AnalysisRequest.ts — an interface with: message: string (the text to analyze), type: 'sms' | 'email' | 'url' | 'unknown'  >(optional, default 'unknown' — let consumers pass it or leave it out), submittedAt: Date.
>RiskAssessment.ts — the result type, an interface with:

>riskLevel: RiskLevel
>confidence: number (0–100 integer, document the range in a JSDoc comment)
>explanation: string (1–2 sentence summary the UI will show)
>flaggedReasons: FlaggedReason[]
>source: 'heuristic' | 'ai' | 'combined'
>degraded?: boolean (true if AI call failed and we fell back to heuristic-only)
>analyzedAt: Date


>index.ts — a barrel file that re-exports everything from the above modules.

>Constraints:

>Named exports only, no default exports
>JSDoc comments on every exported symbol, brief but useful
>No runtime logic, no imports from React or React Native, no fetch
>Strict TypeScript — no any, no unknown unless absolutely necessary

Propose the plan first — list the files you'll create and a 1-line description of each. Do not write code yet. Wait for my approval.

**My evaluation:**
- Plan matched spec exactly, approved with "ok, do it"
- Claude Code proactively ran `tsc --noEmit` and confirmed clean compile
- Claude Code made an undirected design choice: extracted MessageType
  and AnalysisSource as standalone named type aliases (not just inline
  unions inside their parent interfaces). On review I think this is a
  good call — it lets the orchestrator and hook import these unions
  directly without grabbing the whole parent interface. Kept it.
- Pattern to watch: Claude Code added a feature I didn't ask for.
  Small and useful here, but worth checking every diff for scope creep.

### Prompt 3: Scam Domain Knowledge & Heuristic Patterns

**Phase:** Domain Knowledge / Data Layer


**Prompt:**
> Give me a categorized list of textual scam indicators that a heuristic analyzer should detect in SMS and email scams. Group them as: (a) URL-based (b) urgency/pressure language (c) credential/financial requests (d) impersonation signals (e) grammar/formatting red flags. For each category, give 3-5 specific patterns or example phrases. Cite the type of scam each category typically appears in. I'll use this list to design my regex + keyword rules.

**What the AI produced:**
The AI provided a highly detailed taxonomy of phishing and scam patterns. Unprompted, it also provided a "Meta-note on scoring".

**My evaluation:**
- What worked: The domain knowledge is excellent. I'm adopting the co-occurrence multiplier strategy and the warning that "grammar" red flags often just indicate non-native English speakers, meaning it should be weighted very low to avoid bias.
- What I rejected/corrected: The AI wrote a flawed regex for excessive capitalization (`/[A-Z]{15,}/`), which failed to account for spaces and punctuation, meaning it would miss real-world scam texts. I also rejected its loose variable declarations.
- What I refined: I sent a follow-up prompt pointing out the regex bug. 

**Final outcome:**
A robust, typed `scamPatterns.ts` file containing weighted heuristics, with fixed regexes that properly handle real-world text spacing, ready to be consumed by the Heuristic Analyzer.

**Lesson:**
You cannot trust AI-generated regex blindly. Always mentally dry-run edge cases (like whitespace and punctuation) because AI often writes regex for the "happy path" of the pattern, not the messy reality of user input.

### Prompt 4: OpenAI Service Plan

**Phase:** Implementation (AI Analyzer & Errors)

**Prompt:**
> I need to implement the OpenAI-backed analyzer service and its supporting error types. Read CLAUDE.md first.
Files to create

>src/services/errors.ts — typed error classes
src/services/aiAnalyzer.ts — the OpenAI client
src/services/aiAnalyzer.test.ts — co-located tests

>File 1: src/services/errors.ts
Export three error classes, all extending Error, all with proper name set and a typed cause chain (so original errors can be inspected):
typescriptexport class AnalyzerError extends Error {
  readonly cause?: unknown;
  constructor(message: string, cause?: unknown) { ... }
}

>export class AIAnalyzerError extends AnalyzerError { ... }

>export class ValidationError extends AnalyzerError { ... }
All three set this.name to the class name. The cause field uses TypeScript's native cause (ES2022) — if the target doesn't support it, fall back to a custom field. Use Error.captureStackTrace(this, this.constructor) when available.
File 2: src/services/aiAnalyzer.ts
Export:
typescriptexport async function analyzeWithAI(
  message: string,
  options?: { signal?: AbortSignal }
): Promise<RiskAssessment>
Implementation:

>Read API key from @env (the react-native-dotenv module alias). Throw AIAnalyzerError('OpenAI API key is missing') if it's empty or still the placeholder 'sk-your-key-here'.
Endpoint: https://api.openai.com/v1/chat/completions
Request body:
typescript{
  model: 'gpt-4o-mini',
  response_format: { type: 'json_object' },
  temperature: 0.2,        // low temperature for consistency
  max_tokens: 500,
  messages: [
    { role: 'system', content: SYSTEM_PROMPT },
    { role: 'user', content: `Analyze this message:\n\n${message}` }
  ]
}

>System prompt (embed as a top-of-file const SYSTEM_PROMPT = ...):
You are a cybersecurity assistant analyzing text messages for scam indicators. Your job is to assess whether a given message is a legitimate communication or a scam (phishing, smishing, fraud, social engineering).

>You will respond ONLY with valid JSON matching this exact schema:
{
  "riskLevel": "safe" | "suspicious" | "dangerous",
  "confidence": <integer 0-100>,
  "explanation": "<1-2 sentence summary of your verdict>",
  "flaggedReasons": [
    {
      "category": "url" | "urgency" | "credentials" | "financial" | "impersonation" | "grammar" | "other",
      "description": "<short, specific reason in your own words>",
      "severity": "low" | "medium" | "high"
    }
  ]
}

>Guidelines:
- "safe": no scam indicators. Normal personal, transactional, or commercial messages.
- "suspicious": one or two soft signals (mild urgency, generic greeting) but not conclusive.
- "dangerous": clear scam indicators (credential requests, suspicious URLs, payment demands, impersonation).
- Confidence reflects how certain you are of the label, NOT how dangerous the message is. A clean safe message has confidence ~95. A borderline case has lower confidence.
- flaggedReasons should be specific to THIS message. Do not list generic scam patterns; cite what you actually see.
- If the message is empty, gibberish, or too short to analyze, return "safe" with low confidence and an explanation saying so.
- Respond ONLY with the JSON object. No prose before or after. No markdown code fences.

>Network call: Use native fetch with Authorization: Bearer ${apiKey} and Content-Type: application/json. Pass signal from options through to fetch for cancellation.
Error handling:

>Network error or AbortError → AIAnalyzerError('OpenAI request failed', cause)
Non-2xx response → AIAnalyzerError(\OpenAI returned status ${status}`, responseBody)` (parse body if possible)
401 specifically → AIAnalyzerError('OpenAI API key is invalid or unauthorized')
429 specifically → AIAnalyzerError('OpenAI rate limit hit')


>Parse response:

>Extract data.choices[0].message.content (string)
JSON.parse it; if it throws → ValidationError('AI response was not valid JSON', cause)


>Validate parsed JSON. Write a private function validateAssessment(obj: unknown): RiskAssessment that:

>Checks obj is a non-null object
Validates riskLevel is one of the three valid strings (use RISK_LEVELS from models)
Validates confidence is a number, clamps to [0, 100], rounds to integer
Validates explanation is a non-empty string (truncate to 500 chars if longer)
Validates flaggedReasons is an array (default [] if missing)
For each reason: validates category is one of REASON_CATEGORIES (default 'other' if invalid), description is non-empty string, severity is one of low | medium | high (default 'medium')
Throws ValidationError if riskLevel is invalid (this is the only non-recoverable field)
For all other validation failures, default sensible values rather than throw — we want to be permissive on AI output where safe


>onstruct the final RiskAssessment:

>Spread validated fields
Set source: 'ai'
Set analyzedAt: new Date()
Do not set degraded (that's an orchestrator concern)


>Constants at top of file:

>const SYSTEM_PROMPT = '...' (the prompt above)
const OPENAI_ENDPOINT = 'https://api.openai.com/v1/chat/completions'
const MODEL = 'gpt-4o-mini'
const REQUEST_TIMEOUT_MS = 15000 (wrap fetch in a timeout via AbortController if no signal is provided)



>File 3: src/services/aiAnalyzer.test.ts
Co-located tests. Mock fetch globally for these tests — DO NOT make real OpenAI calls in tests (it would burn API quota and be flaky).
Cover:

>Successful call: mock fetch to return a valid OpenAI response with valid JSON content. Verify the returned RiskAssessment has correct source: 'ai', correct fields, and analyzedAt is a Date.
Network failure: mock fetch to reject with a network error. Verify AIAnalyzerError is thrown with the original error as cause.
401 response: mock fetch to return { ok: false, status: 401 }. Verify the error message mentions invalid/unauthorized key.
429 response: verify rate-limit-specific error message.
Generic 500 response: verify a generic AIAnalyzerError with status in message.
Invalid JSON in response: mock content as 'this is not json'. Verify ValidationError thrown.
Schema-mismatched response — invalid riskLevel: mock content with riskLevel: 'extreme'. Verify ValidationError thrown.
Schema-mismatched response — missing fields with defaults: mock content with only riskLevel: 'safe' and nothing else. Verify it doesn't throw, and the returned assessment has defaults (confidence clamped, empty reasons, default explanation).
Missing API key: mock @env to return the placeholder. Verify it throws immediately without making a network call.
AbortSignal: pass an already-aborted signal. Verify it doesn't make the network call (or fetch rejects appropriately).

>Mark this test file with a top-of-file comment listing which tests were AI-generated.
Constraints

>TypeScript strict, no any (use unknown and narrow)
Named exports only
No retry logic, no caching, no merge logic (these belong elsewhere)
All async paths throw typed errors, never reject with strings
JSDoc on every exported symbol
Use types from @/models

>Output format
Propose the plan first. List:

>Files you'll create
Any decisions you're making that I didn't specify (mocking strategy, default values for validation defaults, etc.)
Any concerns or pushback on the spec

>Do not write code until I approve.

**My evaluation:**
Flagged credential leakage risk. The OpenAI API key sits in fetch's Authorization header. If raw Response/Request/Headers objects flow into an error's cause chain, and the error reaches a crash reporter, the bearer token leaks. Claude agreed and proposed:
- An explicit sanitizeCause() helper with an allow-list (not deny-list)
- A SECURITY comment at top of aiAnalyzer.ts explaining the invariant
- A test that JSON.stringifies the entire thrown error and asserts the
  test key substring is absent
- A ban on interpolating any env-derived value into error messages.


### Prompt 5:

**Phase:** Implementation (Orchestrator)

**Prompt:**

>I need to implement src/services/analyzerOrchestrator.ts and co-located tests. Read CLAUDE.md first, then read src/services/heuristicAnalyzer.ts and src/services/aiAnalyzer.ts to understand the inputs you'll be combining.
Files to create

>src/services/analyzerOrchestrator.ts — the merge logic
src/services/analyzerOrchestrator.test.ts — co-located tests

>What the orchestrator does
Single exported function:
typescriptexport async function analyze(
  message: string,
  options?: { signal?: AbortSignal }
): Promise<RiskAssessment>
Behavior is the sequential gate strategy defined in CLAUDE.md:
Step 1 — Run heuristic
Call analyzeHeuristic(message) (synchronous). Capture the result.
Step 2 — Early-exit decision
If the heuristic result satisfies BOTH:

>confidence >= 85
riskLevel === 'safe' OR riskLevel === 'dangerous' (NOT suspicious)

>Then return the heuristic result as-is with source: 'heuristic'. Skip the AI call entirely. Skip cost, skip latency.
Rationale: extreme heuristic confidence with a clear verdict doesn't need AI confirmation. Suspicious-zone results always go to AI, because that's exactly the case where the heuristic isn't sure.
Step 3 — Call AI
Call analyzeWithAI(message, options) (await it). Pass through the signal option.
If AI call throws (any error from aiAnalyzer, typed or not):

>Catch it
Return the heuristic result but mutate source: 'heuristic' and degraded: true
Do NOT rethrow. The user always gets some answer.

>Step 4 — Merge (both results available)
Implement a private function:
typescriptfunction mergeAssessments(
  heuristic: RiskAssessment,
  ai: RiskAssessment
): RiskAssessment
Merge rules:
Risk level: take the more cautious. Implement a helper:
typescriptconst RISK_ORDER: Record<RiskLevel, number> = {
  safe: 0,
  suspicious: 1,
  dangerous: 2,
};

>function moreCautious(a: RiskLevel, b: RiskLevel): RiskLevel {
  return RISK_ORDER[a] >= RISK_ORDER[b] ? a : b;
}
Confidence: weighted average, AI favored. confidence = round(0.6 * ai.confidence + 0.4 * heuristic.confidence). Clamp to [0, 100].
Flagged reasons: union, deduped by (category, description) pair. Implementation: concat both arrays, deduplicate. Two reasons are duplicates if they share the same category AND the same description (case-insensitive comparison of description). When duplicates exist, keep the one with the higher severity (low < medium < high).
Explanation: combine both. Format:
${ai.explanation} (Heuristic agreed: ${heuristic.riskLevel} at ${heuristic.confidence}% confidence.)
If AI and heuristic disagree on risk level, the parenthetical becomes:
${ai.explanation} (Heuristic flagged this as ${heuristic.riskLevel} at ${heuristic.confidence}% confidence.)
Source: 'combined'
degraded: undefined (don't set it; only set on AI failure)
analyzedAt: new Date()
Edge cases to handle explicitly

>Empty/whitespace message: the heuristic already returns safe with high confidence for these. The early-exit will kick in. No special handling needed in the orchestrator — verify with a test.
AI returns a less cautious verdict than heuristic: the merge's "more cautious" rule handles this. heuristic=dangerous + ai=safe should still return dangerous. Test this.
AI call cancelled via signal: the AbortError from fetch will propagate as an AIAnalyzerError. Treat it as any other AI failure: return heuristic with degraded: true. Test this.
Heuristic confidence exactly 85: triggers early exit if also safe/dangerous (use >= not >).

>Test file
Co-located. Use jest.mock() to mock @/services/heuristicAnalyzer and @/services/aiAnalyzer — don't run the real ones in these tests. The orchestrator is being tested in isolation; the analyzers have their own tests.
Cover:

>Early exit on high-confidence safe: mock heuristic to return { riskLevel: 'safe', confidence: 95, ... }. Verify AI is NOT called. Verify result has source: 'heuristic'.
Early exit on high-confidence dangerous: same pattern with dangerous result. Verify AI not called.
NO early exit on high-confidence suspicious: mock heuristic to return { riskLevel: 'suspicious', confidence: 95, ... }. Verify AI IS called.
NO early exit on low-confidence safe: mock heuristic to return { riskLevel: 'safe', confidence: 70, ... }. Verify AI IS called.
Merge happens when both run: mock both. Verify result has source: 'combined' and merged fields per rules.
More cautious takes precedence: mock heuristic=safe@70 + ai=dangerous@90. Verify result risk level is dangerous.
Confidence weighted average: mock heuristic=80 + ai=90. Verify result confidence is round(0.6*90 + 0.4*80) = 86.
Reason dedup by category+description: mock heuristic with {category:'url', description:'Bit.ly URL', severity:'medium'} and AI with same category+description but severity:'high'. Verify result contains exactly one reason for that pair, with severity=high.
Reason union when different: mock heuristic with [{category:'url',...}] and AI with [{category:'urgency',...}]. Verify result contains both.
AI failure falls back to heuristic with degraded flag: mock AI to throw AIAnalyzerError. Verify result is heuristic-shaped with source: 'heuristic' and degraded: true. Verify error is NOT rethrown.
AI cancellation falls back: mock AI to throw a DOMException with name 'AbortError'. Verify same fallback behavior.
Signal passthrough: verify the orchestrator passes the options.signal argument through to analyzeWithAI.
Explanation format with agreement: when heuristic and AI agree on risk level, the parenthetical uses "Heuristic agreed: ..." wording.
Explanation format with disagreement: when they disagree, parenthetical uses "Heuristic flagged this as ..." wording.
More-cautious helper unit tests: test the moreCautious function (export it for testing) against all 9 pair combinations.

>Mark the test file with a top-of-file comment listing which tests were AI-generated.
Constraints

>TypeScript strict, no any
Named exports only
Use types from @/models
Imports allowed: @/models, @/services/heuristicAnalyzer, @/services/aiAnalyzer (and @/services/errors if you need the error types for instanceof checks — but the spec says "catch any error", so probably not needed)
JSDoc on every exported symbol
No retry, no caching, no console

>Output format
Propose the plan first. List:

>Files you'll create
Specific decisions you're making that I didn't fully specify
Concerns or pushback

>Do not write code until I approve.


## AI Code Review Summary

I asked AI to review the codebase from a security and maintainability perspective. The most useful feedback was:

- Prompt injection was not mitigated. I changed the AI request body to isolate user text as untrusted data and added tests.
- Timeout handling was silently disabled when a caller signal was supplied. I refactored timeout wiring and added abort tests.
- `analyzeWithAI` mixed too many abstraction levels. I split it into request body, signal, HTTP, status, content extraction, JSON parse, and validation helpers.
- OTP keywords caused false positives on legitimate 2FA messages. I changed the pattern to OTP solicitation and added false-positive regression tests.
- Reason dedupe did not match the documented contract. I changed merge behavior to dedupe by category.
- `confidence: number` did not enforce the 0-100 integer contract. I added runtime validation.
- Severity values were duplicated inline. I moved them to a shared model.
- Project hygiene was missing. I added typecheck, lint, Prettier, and CI.

I did not blindly accept every suggestion. For example, I kept the app as a single classic Expo `App.tsx` instead of migrating to Expo Router, because a router would add complexity without value for this one-screen assignment.

## Tests

The test suite covers:

- Heuristic analyzer safe, suspicious, and dangerous fixture behavior.
- False-positive guards for legitimate 2FA and OTP warning messages.
- Scam coverage for crypto, romance, job, tech support, and sweepstakes patterns.
- URL extraction and shortener detection.
- AI analyzer JSON validation, timeout, abort, prompt injection, and error sanitization.
- Orchestrator early exit, AI gate, fallback, merge behavior, and reason dedupe.
- Hook state transitions, cache behavior, and empty input validation.

Some tests include file-level comments noting AI-generated coverage that was reviewed and refined.


## Reflection

This project reinforced that AI-assisted development works best when the prompt includes architecture constraints and concrete failure cases. The highest-value AI feedback was not generating UI code, but reviewing edge cases: prompt injection, timeout cleanup, false positives, and contract drift between comments and code.

If I had more time, I would add real i18n scaffolding, improve non-English scam pattern coverage, add sender/domain reputation signals, and move the OpenAI call behind a backend so the API key is never bundled in a mobile client. I would also add end-to-end UI tests for the main analyze flow.

## Limitations

- The OpenAI key is read from a local `.env` file for prototype purposes. A production mobile app should call a backend instead of bundling an API key.
- The heuristic catalog is intentionally small and cannot fully distinguish legitimate bank fraud alerts from scams without sender, domain, or account context.
- AI fallback is graceful but does not retry failed requests.
- The app is a prototype and does not provide security advice beyond the analyzed message text.
