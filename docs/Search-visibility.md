# Search visibility

## Scope

Search entry pages reuse the existing tools rather than introducing separate implementations. The homepage covers name selection; the group and shuffled-list addresses open their corresponding list modes. Coin flips, yes/no choices, and dice have separate default entry pages under the shared Quick choices tool.

Each generated entry page has its own title, description, canonical URL, visible heading, introduction, and short use-case explanation in the initial HTML. Meaningful text and related-tool links are available without JavaScript; drawing still requires JavaScript. Mode switching updates the visible heading and introduction. The explanation and related-tool links update from the same content source whenever the active mode changes, including restored list sessions and browser Back. All preparation content is hidden during result presentation.

## Source ownership

- `scripts/list-pages.cjs` defines list and quick-choice routes, metadata, template rendering, and sitemap URLs.
- `templates/list-tool.html` and `templates/decision-tool.html` define shared tool markup.
- `assets/tool-content.js` supplies headings, introductions, help text, use-case explanations, and related-tool destinations shared by generated HTML and runtime mode changes.
- `slumpa-nummer/index.html` remains a directly edited page with its own use-case text and related-tool links.

Run `npm run generate` after changing generated page content or route metadata. Include generated HTML and sitemap changes in the commit. The build renders generated tool pages from their templates; tests reject stale generated pages or sitemap content.

Related tools use ordinary HTML links to canonical directory URLs. Hash fragments remain local mode selectors, not independent search landing pages. The removed `slumpa-namn/` address is not reintroduced: the homepage covers that use case.

Generated pages include factual WebPage structured data, and the homepage also describes the WebSite. There are no fabricated ratings, reviews, FAQ entries, or guarantees of enhanced search results. Short use-case descriptions reflect implemented functionality; do not create near-identical pages for every keyword variation.

## Validation

`npm test` checks generated content, unique titles and descriptions, canonical URLs, sitemap consistency, structured-data syntax, local links, and inclusion of tool pages in the offline release. Browser tests check the new entry modes and browser Back behavior, visible initial content without JavaScript, runtime errors, and horizontal overflow.

These checks verify implementation, not search-engine indexing or ranking.

## After deployment

1. Confirm the canonical public URLs return the intended pages, including `ja-eller-nej/` and `kasta-tarning/`.
2. Submit `https://randomisera.se/sitemap.xml` in Google Search Console and Bing Webmaster Tools using the site's verified properties. A robots.txt sitemap reference already exists, but account-level submission and verification are separate actions.
3. Inspect important URLs in Search Console to check rendered content, indexing status, and Google's selected canonical. Check the corresponding diagnostics in Bing Webmaster Tools.
4. Follow actual impressions, search queries, and clicks before deciding on further entry pages or wording changes. No search-volume figures or ranking improvements have been established by the code changes.

No account-level submissions, indexing requests, or production deployment are performed merely by generating the site. Lighthouse SEO checks do not establish that a page is indexed or will rank highly.
