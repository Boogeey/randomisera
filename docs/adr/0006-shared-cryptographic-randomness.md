# 0006 — Use one cryptographic random source

- Status: Accepted
- Recorded: 2026-11-01, retrospectively

## Context

The tools need random integer choices and shuffled lists. Separate implementations for list tools and knockout placement duplicated logic. A shared implementation makes the selection method consistent and keeps it directly testable.

## Decision

Use the browser's `crypto.getRandomValues()` through a single `randomInt(n)` utility. Generate an unsigned 32-bit value and apply rejection sampling before taking the remainder, avoiding modulo bias when the range does not divide 2^32.

Use a shared Fisher–Yates shuffle driven by that integer utility. Draw calculations and knockout placement import the same implementation. Allow deterministic integer functions to be supplied to calculation and shuffle functions for tests.

Keep every non-empty input row as a separate entry, including repeated names. Without-repetition selection tracks row positions rather than deduplicating displayed text. Do not make animation timing or presentation effects determine the selected value.

## Alternatives and tradeoffs

`Math.random()` would avoid the cryptographic API but would not provide the same source of unpredictability. Directly applying a remainder to every 32-bit sample would introduce bias for some ranges. An external randomness service would add a network dependency and is not used by the implemented tools.

## Consequences

- The application has one implementation to maintain and test for integer sampling and shuffling.
- Draws do not require an external randomness request.
- Duplicate labels can legitimately appear more than once because the input rows are distinct entries.
- The integer utility validates its supported range; callers must retain their own feature-specific input limits.
- Cryptographic randomness does not provide a public audit trail, reproducible seed, independent verification, or certification for regulated drawings.

## Implementation references

- [Shared random utilities](../../assets/random.js)
- [Draw calculations](../../assets/draw-core.js)
- [Knockout calculations](../../assets/matches-core.js)
- [Randomness and grouping tests](../../tests/architecture.test.cjs)
- [Knockout tests](../../tests/matches.test.cjs)
