# Product principles

These principles record the product direction agreed during development. They guide future changes; they are not claims of measured user behavior or fixed performance budgets. Architectural decisions are recorded separately in the [ADR index](adr/README.md).

## Keep the core task simple

Make it straightforward to enter options, prepare a draw, read the result, and repeat it. Every additional control should solve a concrete user need. Prefer relevant next steps over permanent settings for every possible use case.

The knockout action after grouped results is an example: it extends an existing result rather than adding a separate tournament setup tool to the main navigation.

## Keep the site free of advertising

Advertising is outside the agreed product direction. Do not introduce advertising scripts or promotional surfaces that compete with the tools.

## Protect fast loading

Keep the published application small and avoid unnecessary runtime dependencies and requests. Use the build to share and optimize code without requiring visitors to load development tools. No numerical loading-time or bundle-size target has been agreed; assess changes against this direction rather than claiming an invented budget.

## Design for mobile use

Mobile is the expected primary use case, not a usage share established by analytics. Keep preparation understandable on a small screen, controls usable by touch, and results easy to read. Maintain a consistent desktop experience as well.

## Keep reuse predictable

Preserve current input and relevant settings when moving between tools. Keep editing a draft separate from overwriting a named list. Make it clear when a new session starts and when a result is being continued.

## Make results clear and accessible

Give results visual priority and provide feedback for every successful draw, including repeated identical values. Support keyboard use and screen-reader announcements, and respect reduced-motion preferences. Decorative effects should not delay using the result or introduce extra steps.

## Let user testing guide expansion

The agreed next focus is testing existing flows with users. Candidate features found in competitor research are hypotheses, not a roadmap commitment or evidence that users need them. Add functionality when its value justifies the extra interaction and maintenance cost.
