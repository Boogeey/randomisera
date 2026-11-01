# 0003 — Separate preparation from result presentation

- Status: Accepted
- Recorded: 2026-11-01, retrospectively

## Context

Showing the list editor, settings, result, and history together made the initial view feel crowded. Once users have prepared a draw, their primary task is to read the result and repeat the action. Mobile use is a particular design focus.

## Decision

Use separate preparation and presentation states for List tools, Numbers, and Quick choices:

- Preparation contains input and relevant settings.
- A successful draw opens presentation, which emphasizes the result and repeat action.
- Returning to preparation ends the current draw session while preserving input and settings.
- Repeated draws continue the session only within presentation, including remaining-name tracking and dice locks where applicable.

Give each successful draw visible and accessible feedback even when its value matches the previous result. Respect reduced-motion preferences. Returning to preparation focuses the main content rather than an input, avoiding automatic activation of the mobile keyboard.

The knockout step starts from existing grouped results. Returning from knockout presentation to those groups preserves the teams and tournament progress; regrouping or returning to preparation resets the tournament.

## Alternatives and tradeoffs

A combined editor/result view exposes everything at once but competes for space and attention. A purely optional presentation mode would retain that crowded default. Keeping a partially completed draw session when returning to preparation would make a newly started draw depend on earlier activity that is no longer visible.

## Consequences

- Tools share a predictable preparation, result, repeat, and back pattern.
- View transitions must manage focus, session reset, and announcements deliberately.
- Group-to-knockout navigation has different reset semantics from returning to preparation and must remain covered by tests.
- Presentation does not imply a separate URL or the browser's fullscreen mode.

## Implementation references

- [Controller and view transitions](../../assets/app.js)
- [Round state reset](../../assets/workspace-state.js)
- [Result rendering and animations](../../assets/result-view.js)
- [Knockout presentation](../../assets/matches.js)
- [Browser interaction tests](../../tests/browser/workspace.spec.cjs)
