# 0005 — Update offline releases without interrupting active use

- Status: Accepted
- Recorded: 2026-11-01, retrospectively

Follow-up: [0007](0007-verified-offline-releases.md) strengthens file recovery with per-file integrity and adds visible update status. The non-interruption and window-closing activation decision remains in effect.

## Context

Randomisera can be added from the browser and prepared for offline use. A user may be in the middle of a draw session or tournament when a new release becomes available. Refreshing automatically would discard memory-only results, history, and tournament progress.

## Decision

Cache release files together under a version derived from the final built assets and service-worker content. Do not manually increment cache versions.

Prepare a complete cache during worker installation. Do not call `skipWaiting()` or automatically reload active pages to apply an update. Let the new worker wait for the previous worker's controlled windows to close. Serve an available cached release immediately rather than waiting for the network. If a cached file is missing, attempt network recovery without writing it into the existing release cache.

Keep offline preparation associated with the installation flow, first installed-app launch, or an explicit offline action. Provide offline activation and removal on the App page. Removing offline files does not delete named lists.

## Alternatives and tradeoffs

Forcing worker activation and reloading pages would expose updates sooner but could interrupt ongoing use. Updating individual cached files independently could combine assets from different releases. A network-first request strategy would prioritize fresh responses but make cached startup depend on network latency.

## Consequences

- An active session is not deliberately interrupted to apply an update.
- Users may continue using the previous release until its controlled windows close.
- Offline preparation needs all allowlisted files to be available; an incomplete new installation must not remove the previous release.
- Offline availability remains subject to browser support, storage restrictions, and eviction.
- This is a release update strategy, not a guarantee that offline storage can never disappear or that every network fallback belongs to the cached release.

## Implementation references

- [Service worker](../../sw.js)
- [Installation and offline controls](../../assets/pwa.js)
- [Release hashing and packaging](../../scripts/build-site.cjs)
- [Service-worker tests](../../tests/service-worker.test.cjs)
- [Installation UI tests](../../tests/pwa-ui.test.cjs)
