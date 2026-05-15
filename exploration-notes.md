# Norton 360 App Exploration Notes

## Features explored
- Home / Smart Scan dashboard
- Smart Scan flow (run, progress, results, recommendations, upgrades)
- Norton Genie 
- VPN
- Internet Security / Safe Web
- Device Security

## Visual design language
- Primary: Norton yellow with black borders on pill buttons
- Risk colors: green (safe), orange (warning), red (alert), burgundy (info)
- Cream background with white cards
- Strong, bold typography hierarchy

## Key UX patterns observed
1. Reassurance-first headlines ("You are protected")
2. Circular progress with percentage for scans
3. Colored numerals + black nouns for risk counts ("1 risk found")
4. Tabbed result flow (Risks -> Recommendations -> Upgrades)
5. Card-based content with icon + headline + body + CTA
6. Yellow primary CTAs, white outlined secondary actions

## Improvements I'd suggest
- Skip button visually competes with primary CTA
- No scan history accessible after completion
- "1 protection" vs "1 risk" reuses pattern in confusing ways

## How this informs my Scam Detector design
- Adopt Norton yellow + black-outline pill buttons for primary CTA
- Mirror circular progress pattern for the "Analyzing..." state
- Use colored risk badges with same color semantics
- Card-based result display with icon + risk level + explanation
- Cream background for that Norton-adjacent feel

## Norton Genie 

### What Genie does well
- Conversational empty state with clear "try this" prompts
- Two-part response structure: what it is + what to do
- Paste shortcut button reduces friction
- Suggested follow-up questions at bottom keep users engaged
- Decorative category header card adds visual interest

### What Genie does poorly
- No structured output (no risk level, confidence, or reason list - just prose)
- No source transparency (is this AI? cached known scam? heuristic?)
- Unrelated upsells injected into result (Siri shortcut, Norton 360 features)
- Conversation history not saved ("Your chat history won't be saved" warning)
- Chat UI makes it hard to scan results quickly

### What I'll do differently in my scam detector
1. Form + structured result card instead of pure chat - easier to scan
2. Explicit risk level badge with color semantics (safe/suspicious/dangerous)
3. Numeric confidence score (e.g. "92% confident")
4. Specific flagged reasons as bullets, categorized (URL, urgency, credentials, etc.)
5. Source label showing whether result came from AI, heuristics, or both
6. Focused single-task screen - no upsells or off-topic suggestion

## Safe Web, Device Security, VPN

### Safe Web
- Two-column stat layout: analyzed count (green) + threats count (red)
- "Always-on" red ring even when threats = 0 reinforces protection presence
- Bottom-sheet info modal pattern for "What is X?" explanations

### Device Security
- Reuses "X risk found" pattern from Smart Scan — Norton's signature summary style
- Step-by-step fix guides with bolded action keywords
- Uses native iOS action sheets where appropriate

### VPN
- Single dominant CTA for primary action
- State + benefit two-line copy ("VPN is off" / "Turn on VPN for extra privacy")
- Defers to native OS dialogs for permissions

## Norton's signature patterns (use in my app)
1. **"X [thing] found" headline** with colored numeral + black noun
2. **Yellow pill button with black border** for primary CTAs
3. **Cream background + white cards** with subtle borders
4. **Reassurance copy** above functional UI
5. **Two-part result structure** (verdict + recommended action)