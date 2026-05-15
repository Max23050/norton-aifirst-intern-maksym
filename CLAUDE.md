# Norton Scam Detector — Project Instructions for Claude Code

You are assisting on a React Native + Expo + TypeScript scam-message detector
built for the Gen Digital (Norton) AI-First Mobile Engineering internship
take-home assignment. This file is your standing brief; read it before every
session.

## Mission

Build a single-screen app where a user pastes an SMS, email, or URL and gets
back a risk assessment (safe / suspicious / dangerous) with a confidence
score and a list of specific flagged reasons. Inspired by Norton Genie but
improves on it with structured output, source transparency, and a focused
single-task UX.

## Architecture rules (non-negotiable)

### Folder layout

- `src/screens/` — composition only, no business logic
- `src/components/` — presentational, no service imports, no fetch
- `src/hooks/` — view models, state machines, request orchestration
- `src/services/` — business logic, pure where possible, fully unit-tested
- `src/models/` — pure type definitions, no runtime code, no RN imports
- `src/data/` — static catalogues (scam patterns, examples), no logic
- `src/theme/` — colors, spacing, typography constants
- `src/__fixtures__/` — shared test data

### Test placement

Co-located. `foo.ts` → `foo.test.ts` in the same folder.
Shared fixtures go in `src/__fixtures__/`.

### Dependency graph (one-way, no cycles)
screens → components, hooks
hooks → services, models
services/analyzerOrchestrator → services/heuristicAnalyzer, services/aiAnalyzer, models
services/heuristicAnalyzer → data, models
services/aiAnalyzer → models, services/errors
components → models, theme
data → models

If a proposed import violates this graph, refuse and propose a refactor.

### Module responsibilities

| Module | MUST | MUST NOT |
|---|---|---|
| `models/*` | Pure type definitions and enums | Import React, RN, fetch |
| `data/scamPatterns.ts` | Export typed immutable pattern data | Execute matching logic |
| `services/heuristicAnalyzer.ts` | Pure sync function: string → RiskAssessment | Call OpenAI, touch state, read env |
| `services/aiAnalyzer.ts` | Single OpenAI call via fetch, JSON parse, schema validate, typed errors | Implement retry/cache/merge, know about heuristic |
| `services/analyzerOrchestrator.ts` | Sequential gate: heuristic first, AI on uncertainty, graceful AI-failure fallback | Touch React, hold state, console.log |
| `services/errors.ts` | Typed error classes (AnalyzerError, AIAnalyzerError, ValidationError) | Contain logic |
| `hooks/useScamAnalyzer.ts` | State machine, AbortController on unmount/new request, bounded in-session cache keyed on trimmed input | Render, contain scoring logic, import from components |
| `screens/AnalyzerScreen.tsx` | Compose components, wire to hook | Contain analysis logic, regex, fetch |
| `components/*` | Render UI from props, emit callbacks | Import services, call hooks beyond useState for local UI |
| `theme/*` | Color/spacing/type constants | Be duplicated inline elsewhere |

## Merge strategy: sequential gate

1. Run `heuristicAnalyzer` first.
2. If confidence ≥ 85 and result is `safe` or `dangerous`, return immediately
   with `source: 'heuristic'`.
3. Otherwise call `aiAnalyzer` and merge:
   - Risk level: take the higher (more cautious) of the two
   - Confidence: weighted average favoring AI (0.6 AI, 0.4 heuristic)
   - Flagged reasons: union, deduped by category
   - Source: `'combined'`
4. If AI call fails: return heuristic result with `degraded: true` flag.

## Conventions

- TypeScript strict mode. No `any`. Use `unknown` and narrow.
- No default exports for services or hooks. Named exports only.
  Components and screens may use default exports.
- All async functions throw typed errors. Never reject with strings.
- Tests use `describe`/`it`. Test names read as sentences:
  `it('returns dangerous when message contains bit.ly URL', ...)`
- Comments only where the why isn't obvious from the code.
- AI-generated tests get a file-level comment block listing which cases
  were generated and which the human added.

## Working style

Before any non-trivial change:
1. Restate what you'll do in one or two sentences.
2. List the files you'll create or edit.
3. Wait for approval.

After implementing:
1. Run `npm test` and fix failures.
2. Run `npx tsc --noEmit` and fix type errors.
3. Summarize what changed.

If you spot a violation of the rules above in existing code, flag it
rather than silently fixing it.

## Out of scope

- No state management library (Zustand/Redux). One screen, one hook.
- No navigation library. Single screen.
- No animation library beyond RN's built-in `Animated`.
- No retry logic, no caching beyond the hook-level dedup cache.
- No real backend. API key is bundled (documented limitation).

## Norton-adjacent visual language

- Primary CTA: yellow pill (#FFE600) with black border + black text
- Background: cream (#F8F4ED)
- Cards: white on cream, subtle border
- Risk colors:
  - safe: green (#00A86B)
  - suspicious: orange (#FF8800)
  - dangerous: red (#D7263D)
- Signature pattern: "**Risk Level** detected" headline with colored
  risk word, black rest. Mirrors Norton's "**1 risk** found".
