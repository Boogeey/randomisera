# 0004 — Generate static releases from shared source modules and templates

- Status: Accepted
- Recorded: 2026-11-01, retrospectively

## Context

The three list-tool addresses share almost all markup. Maintaining them independently required repeated edits and risked inconsistencies. Runtime scripts also depended on shared controller variables and script ordering. The architecture refactoring addressed those maintenance risks while retaining static delivery.

## Decision

Use one list-tool HTML template with route metadata for titles, descriptions, canonical URLs, relative paths, and initial modes. Keep generated source pages in the repository, mark them as generated, and test that they match the template. The publication build renders those pages directly from the template. Other tool and information pages remain ordinary HTML.

Use explicit local CommonJS modules for calculations, randomness, workspace state, storage, result rendering, and knockout behavior. Initialize UI modules through explicit interfaces rather than shared private variables. Bundle the controller dependency graph into one browser-compatible script with esbuild.

Generate `_site/` as the publication output. Only the public files allowlisted in `sw.js`, the generated worker, and the build script's explicitly copied site metadata are published. Source modules, templates, tests, and Node packages are not additional browser resources.

## Alternatives and tradeoffs

Independent HTML copies avoid generation but retain duplicate maintenance. Loading every source module separately would retain the module boundaries but require additional browser resources. A larger site generator or framework could manage these concerns but is not used for the current, limited page set.

## Consequences

- Shared changes have a single source of truth, with automated checks for stale generated HTML.
- Editing only a generated page is insufficient and will fail the consistency check.
- Local preview requires a build; source HTML with unbundled controller code is not a supported preview.
- Build tools and their lockfile become part of the development workflow, while visitors still receive static files.
- Internal module boundaries can evolve without adding browser requests for those modules.

## Implementation references

- [List template](../../templates/list-tool.html)
- [Route metadata and generation](../../scripts/list-pages.cjs)
- [Build script](../../scripts/build-site.cjs)
- [Template consistency tests](../../tests/architecture.test.cjs)
- [Build packaging tests](../../tests/build.test.cjs)
