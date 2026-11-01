# 0001 — Keep the application static and framework-free

- Status: Accepted
- Recorded: 2026-11-01, retrospectively

## Context

Randomisera provides random choices, groups, shuffled lists, numbers, dice, and a knockout step from grouped results. The agreed product direction prioritizes simple interaction, fast loading, and no advertising. The implemented tools run in the browser without accounts or shared server state.

## Decision

Keep the application as a static website using HTML, CSS, and JavaScript, with no runtime UI framework, application server, or database. Perform draws and group calculations on the user's device. Publish the built static release through the existing GitHub Pages workflow.

Use development dependencies for generation, bundling, minification, and testing. These tools run during development and publication; they are not third-party runtime scripts loaded by visitors.

## Alternatives and tradeoffs

A UI framework could provide component and state conventions, but would introduce another runtime abstraction and dependency for the current interface. A server-backed application could support accounts and cross-device synchronization, but would add data handling, deployment, and operational responsibilities that the existing features do not require.

## Consequences

- The runtime remains small and can work from cached static assets.
- Source structure, accessibility, DOM updates, and application state remain our responsibility.
- There is no account-based synchronization, shared live session, or centrally stored list history.
- A future feature requiring server state needs a separate architectural decision; this record does not rule out such a change permanently.

## Implementation references

- [Runtime controller](../../assets/app.js)
- [Build script](../../scripts/build-site.cjs)
- [Publication workflow](../../.github/workflows/pages.yml)
- [Product principles](../Product-principles.md)
