# Architecture decision records

These records explain the reasons and tradeoffs behind Randomisera's architecture. [Architecture](../Architecture.md) describes the current implementation; [Product principles](../Product-principles.md) describes the product direction.

The initial six records were written retrospectively on 2026-11-01, following the UI work and architecture refactoring. They document decisions already made and implemented, rather than new proposals. The recording date is not a claim about when each original decision was first made. Alternative approaches are described to clarify tradeoffs, not to claim that they were prototyped or formally evaluated.

| Record | Status |
| --- | --- |
| [0001 — Keep the application static and framework-free](0001-static-framework-free-application.md) | Accepted |
| [0002 — Store user lists locally with explicit saving](0002-local-storage-and-explicit-saving.md) | Accepted |
| [0003 — Separate preparation from result presentation](0003-separate-preparation-and-presentation.md) | Accepted |
| [0004 — Generate static releases from shared source modules and templates](0004-shared-sources-and-static-build-output.md) | Accepted |
| [0005 — Update offline releases without interrupting active use](0005-non-interrupting-offline-updates.md) | Accepted |
| [0006 — Use one cryptographic random source](0006-shared-cryptographic-randomness.md) | Accepted |
| [0007 — Verify offline release files and expose waiting updates](0007-verified-offline-releases.md) | Accepted |

## Maintaining the records

Use sequential numbers and descriptive English filenames. Keep the text focused on context, decision, alternatives, and consequences. Link to implementation and tests rather than copying details likely to change.

For a proposed architectural change, add a record with status **Proposed**. Mark it **Accepted** when the decision is agreed. If it replaces an earlier decision, retain the earlier record, mark it **Superseded**, and link both records. Do not rewrite the history to make an old decision appear to have been different.

Routine UI wording, default values, and numeric feature limits belong in implementation documentation and tests unless they introduce a wider architectural decision.
