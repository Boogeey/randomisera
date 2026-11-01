# Architecture

For the reasons and tradeoffs behind this structure, see the [architecture decision records](adr/README.md). The [product principles](Product-principles.md) describe the agreed product direction.

Randomisera remains a static website. Runtime code has no external dependencies, server, database, or account requirement. Node.js tooling generates HTML, bundles local JavaScript modules, runs tests, and prepares the offline release.

## Source ownership

| Source | Responsibility |
| --- | --- |
| `templates/list-tool.html`, `templates/decision-tool.html` | Shared list and quick-choice preparation/presentation markup |
| `scripts/list-pages.cjs` | Tool routes, metadata, use-case text, related links, template rendering, and sitemap URLs |
| `assets/tool-content.js` | Visible headings and introductions shared by generation and mode changes |
| `assets/app.js` | Tool initialization, input events, navigation, focus, and orchestration |
| `assets/workspace-state.js` | Independent workspace settings and round state; round reset preserves settings |
| `assets/draw-core.js` | Number, list, group, and dice calculations, grouping plans, and result text |
| `assets/random.js` | The single unbiased integer generator and Fisher–Yates shuffle implementation |
| `assets/result-view.js` | Result rendering, presentation context, animations, and clipboard behavior |
| `assets/storage.js` | Storage formats, validation, legacy draft migration, and injected storage adapters |
| `assets/saved-lists.js` | Saved-list UI; receives a workspace contract rather than accessing controller variables |
| `assets/matches-core.js` | Bracket construction, advancement, and downstream invalidation |
| `assets/matches.js` | Knockout UI; initialized explicitly and returns its reset/setGroups contract |
| `assets/style.css` | Shared tokens and component styles, with responsive exceptions |
| `assets/pwa.js`, `sw.js` | Installation and release-level offline management |

Runtime modules use explicit CommonJS imports and exports. esbuild bundles the local dependency graph into one browser-compatible `assets/app.js` in `_site`. Module scope prevents controller state from leaking onto `window`. The source modules are not separate script tags or offline requests.

The knockout UI uses team objects containing an ID, display name, and members. It does not recover identity by parsing a translated label. The result view receives the active list name through the saved-list interface rather than reading it back from formatted UI text.

## Generated pages

Edit the tool templates or route configuration, then run:

```sh
npm run generate
```

The generated `index.html`, `dela-in-i-grupper/index.html`, `slumpa-lista/index.html`, `singla-slant/index.html`, `ja-eller-nej/index.html`, and `kasta-tarning/index.html` remain committed for discoverability. They are not independently maintained sources. Unit tests reject stale generated pages and sitemap content, and the publication build renders pages directly from their templates. Changes must not be made only to a generated file.

Other tool and information pages remain ordinary HTML files. They reuse the same bundled controller and CSS where appropriate.

## Storage compatibility

Existing storage keys and named-list format are preserved. The session draft parser accepts the original version-1 format. Drafts predating `grouping` are interpreted as **group counts**, preserving the original meaning of `counts.groups`. New sessions default to a maximum of four people per group. Drafts containing an explicit grouping choice retain it.

The storage adapter throws on malformed or unavailable storage; the UI catches those errors and keeps manual input usable. Session restoration selects a mode without first capturing the pre-restoration input as a setting. Named-list writes remain explicit. Results, dice locks, history, and knockout progress remain memory-only.

## Development and checks

```sh
npm ci --ignore-scripts
npm run generate
npm test
npm run build
npx playwright install chromium
npm run test:browser
npm run dev
```

`npm run dev` builds and serves `_site` at `http://127.0.0.1:4173`. Rebuild and refresh after edits. Source JavaScript uses module imports and must be bundled before browser preview; opening source HTML directly is not a supported development workflow.

Fast Node tests cover calculation invariants, migrations, storage, UI orchestration, template consistency, service-worker behavior, and build packaging. UI unit tests use lightweight DOM doubles; they are complemented by Playwright tests against the **built release** in desktop and mobile Chromium contexts. Tests cover input retention, focus, saved lists, legacy migration, tournament continuation, keyboard-operated dice locks, reduced motion, and runtime errors on every published page. These tests do not substitute for real-device Safari checks.

GitHub Actions runs both suites before deployment and retains browser failure diagnostics. Browser downloads and Playwright are development-only. There are no additional third-party runtime scripts.

## Build and offline boundaries

The `FILES` list in `sw.js` is the public release allowlist. The build bundles local controller dependencies, minifies assets, and hashes the final release files. Internal modules, templates, test files, and Node packages are not published. Do not increment cache versions manually or add unbundled source modules to the offline allowlist.

The service worker keeps existing release-update semantics: it prepares a complete release and waits for old controlled windows to close. Refactoring storage or PWA code must preserve existing user data and this update boundary.
