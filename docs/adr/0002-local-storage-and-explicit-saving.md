# 0002 — Store user lists locally with explicit saving

- Status: Accepted
- Recorded: 2026-11-01, retrospectively

## Context

Users need to reuse named lists and move between tools without losing their current input. Editing an input field should not silently overwrite a previously saved list. Existing users may already have lists and session drafts stored by earlier versions.

## Decision

Use browser storage with distinct responsibilities:

- **localStorage:** explicitly saved named lists, plus the separate offline preference.
- **sessionStorage:** the current list draft, mode, settings, and saved-list baseline for the same tab's session.
- **Memory:** results, draw history, dice locks, and knockout progress.
- **Cache Storage:** offline release files, separate from user lists.

Persist named-list changes only through explicit save actions. Clearing the editor does not delete a saved list. Preserve the existing storage keys and validate restored data through the storage adapter. Treat drafts predating the grouping-method field as group counts, retaining their original meaning.

If storage is unavailable or invalid, keep manual input and drawing usable and report relevant saved-list failures in the UI. Do not send list contents to an application backend.

## Alternatives and tradeoffs

Automatically updating named lists would reduce save actions but blur the distinction between a draft and a reusable list. Memory-only input would be lost when navigating between separate tool pages. Server storage could provide synchronization and backup but would require the server-side architecture and data handling excluded from the current design.

## Consequences

- Lists can be reused without accounts, while temporary edits remain separate.
- Changes to storage formats require compatibility handling and migration tests.
- Browser clearing, restrictions, eviction, and separate browser profiles affect availability. Local storage is not a backup or synchronization service.
- Browser session restoration can also restore sessionStorage; closing a tab is not a secure deletion guarantee.
- Reloading a page does not restore the previous draw session or tournament progress.

## Implementation references

- [Storage adapter and draft migration](../../assets/storage.js)
- [Saved-list UI](../../assets/saved-lists.js)
- [Storage and state tests](../../tests/architecture.test.cjs)
- [User-facing storage explanation](../../lagring-och-integritet/index.html)
