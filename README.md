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

### 1. UI layer plan and implementation

Prompt:

```text
Build the UI Layer. Read CLAUDE.md and the Norton-adjacent visual language section. Create MessageInput, ResultCard, colors, and the main smart screen. Dumb components must take props only.
```

How I used it:

I used the AI output to structure a classic Expo `App.tsx` instead of adding Expo Router. I refined the decomposition by adding `ReasonItem` as a dumb child component and keeping all analysis logic in `useScamAnalyzer`.

### 2. Prompt injection mitigation

Prompt:

```text
Prompt injection mitigation is absent. User content is concatenated straight into the prompt. Delimit user content and treat it as untrusted data.
```

How I used it:

The first implementation was not enough because it still relied on plain text prompt boundaries. I refined it so the user message is passed as JSON under `untrustedMessage`, added explicit system instructions, and added a deterministic guard for obvious injection attempts.

### 3. Timeout and abort handling

Prompt:

```text
The 15s timeout is disabled when the hook supplies a caller signal. Always create the timeout controller and link the caller signal to it.
```

How I used it:

I refactored AI request signal creation so every request gets its own timeout signal. The caller signal is linked into it, and cleanup removes timers/listeners. Tests now cover timeout with a caller signal and mid-fetch abort.

### 4. Data-vs-logic contract

Prompt:

```text
scamPatterns.ts must not execute matching logic, but function patterns define evaluate callbacks. Move logic out of data or relax the spec.
```

How I used it:

I moved executable matching behavior out of the data file. The data catalog now stores declarative threshold patterns, while `heuristicAnalyzer.ts` owns the metric registry and matching logic.

### 5. OTP false-positive review

Prompt:

```text
credentials.otp keywords will flag every legitimate 2FA SMS as dangerous. Split "asks for OTP" from "delivers OTP" and protect "Do not share your code" messages.
```

How I used it:

I replaced broad OTP keywords with solicitation-specific keywords such as "reply with your verification code" and added negation handling for legitimate warnings like "Do not share your code with anyone." Regression tests protect Google and bank OTP messages.

### 6. Code quality pass

Prompt:

```text
Add runtime confidence validation and centralize duplicated severity types. Add typecheck, lint, Prettier, and CI hooks.
```

How I used it:

I added `assertConfidence`, a shared `Severity` model, Expo ESLint config, Prettier config, `typecheck` and `lint` scripts, and a CI workflow. I ran the commands locally and fixed lint findings.

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

## Demo Video

Video link: `TODO: add unlisted YouTube, Google Drive, or Loom link before submitting`.

Suggested 5-minute structure:

1. App demo, about 2 minutes:
   - Run `npm run web` or open the app in Expo Go.
   - Paste a legitimate 2FA message and show that it remains safe.
   - Paste a scam message with urgency and a shortened URL.
   - Show the risk headline, explanation, and flagged reasons.
2. Code walkthrough, about 1.5 minutes:
   - Show `useScamAnalyzer.ts`, `analyzerOrchestrator.ts`, `heuristicAnalyzer.ts`, and `aiAnalyzer.ts`.
   - Explain the heuristic-first gate, AI fallback, and dumb component structure.
3. AI workflow demo, about 1.5 minutes:
   - Show several AI prompts from the development conversation.
   - Highlight one example where AI feedback was refined, such as OTP false positives or timeout handling.

## Reflection

This project reinforced that AI-assisted development works best when the prompt includes architecture constraints and concrete failure cases. The highest-value AI feedback was not generating UI code, but reviewing edge cases: prompt injection, timeout cleanup, false positives, and contract drift between comments and code.

If I had more time, I would add real i18n scaffolding, improve non-English scam pattern coverage, add sender/domain reputation signals, and move the OpenAI call behind a backend so the API key is never bundled in a mobile client. I would also add end-to-end UI tests for the main analyze flow.

## Limitations

- The OpenAI key is read from a local `.env` file for prototype purposes. A production mobile app should call a backend instead of bundling an API key.
- The heuristic catalog is intentionally small and cannot fully distinguish legitimate bank fraud alerts from scams without sender, domain, or account context.
- AI fallback is graceful but does not retry failed requests.
- The app is a prototype and does not provide security advice beyond the analyzed message text.
