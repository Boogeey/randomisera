# Randomisera

A small static website for random choices, numbers, groups, shuffled lists, and coin flips. No runtime framework, database, or account is required. Build dependencies are used only for publication.

The shared list workspace has three modes: **Välj**, **Gruppera**, and **Blanda**. Switching modes keeps the input, saved-list selection, and individual count settings, and resets the draw session. Named lists use the existing storage format. Clearing input is undoable and never deletes a saved list. Numbers and coin flips remain separate tools.

Every non-empty row is a separate entry, including identical names. “Without repetitions” prevents drawing the same row twice in a round; identical names on different rows can still appear more than once. No automatic deduplication is performed.

Grouping supports either a number of groups or a maximum number of people per group. New sessions default to a maximum of four people per group; an explicit choice in the session draft takes precedence. The latter calculates the required group count and distributes participants evenly without exceeding the chosen size. A live preview explains the resulting sizes. Both count settings and the grouping method survive mode changes and same-tab navigation using the existing session draft; older drafts remain supported.

Legacy URLs (`dela-in-i-grupper/` and `slumpa-lista/`) open the shared workspace in their corresponding mode. Fragment links (`#valj`, `#gruppera`, and `#blanda`) and browser Back switch modes without reloading the list.

List tools use a two-step flow. Preparation contains the list and settings; a successful draw opens a dedicated presentation with Copy, Edit, and a repeat action. Returning to preparation clears drawn entries, results, and history, while preserving the list, saved-list selection, and settings. Only the presentation continues a draw session. When a batch exceeds the remaining pool, the repeat action draws the remaining entries before offering a new round, preserving the configured batch size. History is collapsed in the presentation, and remains in memory only. Desktop preparation places settings beside the list; mobile stacks them. Numbers and Slumpval use the same two-step presentation.

## Development

See the [architecture decision records](docs/adr/README.md) for the reasons behind the main technical choices and [product principles](docs/Product-principles.md) for the agreed product direction.

`assets/app.js` coordinates tool input and the preparation/presentation flow. Local modules separate calculations, workspace state, storage, result rendering, and knockout behavior. esbuild bundles them into a single browser script. See [Architecture](docs/Architecture.md) for module responsibilities and storage compatibility.

Edit `templates/list-tool.html` for the shared list UI and run `npm run generate` to refresh its three generated pages. Other pages remain directly editable HTML. Use `npm run dev` to build and preview the site locally; source JavaScript must be bundled before it runs in a browser.

Run the automated checks and create the deployment folder with Node.js 22 or newer:

```sh
npm ci --ignore-scripts
npm run generate
npm test
npm run build
npx playwright install chromium
npm run test:browser
```

The build creates `_site/`, containing only public website files. It generates a deterministic cache ID from the final minified offline assets and service worker. **Do not increment cache versions manually.** `_site/` is not committed.

## Publication

The workflow in `.github/workflows/pages.yml` runs unit tests, builds, runs desktop/mobile browser tests, and deploys `_site/` on pushes to `main`. Browser failures retain screenshots and traces.

**One-time setup:** in the repository's **Settings → Pages → Build and deployment**, choose **GitHub Actions** as the source. Keep the existing custom domain. See the [publication and PWA guide](docs/Publication.md).

## Numbers

The Number tool prepares an inclusive integer range, count, and a per-draw uniqueness choice, then opens the shared presentation. Repeated draws retain settings, and Edit clears the round while retaining the configured range. Uniqueness applies within a single draw, not across repeated draws. Both single and multiple results use the shared large text, counter, fade, accessible announcement, copying, and collapsed history.

## Slumpval

In dice presentations, each die is a native toggle button. Clicking or pressing Enter/Space locks its current value; rerolls replace only unlocked dice. Pressed state, a padlock mark, and a separate polite announcement make locks perceivable without changing the draw counter or history. The reroll action is disabled when all dice are locked, and Unlock all appears while any lock is active. Locked dice do not fade during rerolls. Returning to preparation clears all locks and values, while retaining die settings.

Every successful presentation draw shows an independent “Slumpning N” counter and briefly fades the result in over 240ms, even when the value repeats. Reduced-motion preferences disable the fade. A single polite status region announces the counter together with the result, so repeated identical values remain distinguishable for screen readers. Returning to preparation resets the counter; clearing history does not. Animations are canceled before a new draw or editing, without delaying the random result or blocking rapid clicks.

The existing `singla-slant/` address now hosts **Slumpval**, with **Singla slant**, **Ja eller nej**, and **Kasta tärning** modes. Preparation and presentation use the same flow as list tools. Dice default to one six-sided die; users can choose 1–100 dice with 4, 6, 8, 10, 12, 20, or 100 sides. Each die is sampled independently using the existing unbiased cryptographic integer generator. Results show each die and the total, including in copied text and history. Returning to preparation clears the current session while retaining die settings. Mode fragments support direct links and browser Back. No new storage is used.

## PWA

The footer contains **Kontakt · Lagring och integritet · App**. The separate `app/` page offers **Lägg till på hemskärmen** on mobile or **Lägg till som app** on desktop, manual iPhone/Android/desktop instructions, and offline settings. Supported browsers open their native installation prompt; other browsers show instructions. Installed app windows hide the installation action based on their actual display mode, not a saved installation flag. Tool pages retain background worker maintenance without any installation controls. Presentations hide the footer entirely.

Offline preparation follows the installation request or first launch of the installed app. Cached files are served immediately as one release; a new worker prepares the next release in the background and waits until old controlled windows close. No automatic reload interrupts an active session. Offline storage and removal are available under Offlineinställningar on the App page.

Use HTTPS or localhost and test the generated `_site/` build when checking PWA updates. The source worker uses a fixed development cache name and is not a release artifact. This machine's local server also supports `node .local/serve.cjs 4173 --built` after a build. Browser storage restrictions and eviction can affect offline availability.

## Saved lists and privacy

The current list draft (raw text, list mode, per-mode counts, repetition setting, and the loaded saved-list baseline) is automatically kept in `randomisera-list-draft-v1` in sessionStorage. It survives same-tab tool navigation and reloads. Named lists are never updated automatically. Clearing the editor also clears the stored draft text; undo restores it. Results and history are not stored. Storage restrictions and malformed drafts fall back to the normal editor. Browser session restoration can restore sessionStorage, so closing a tab is not a guaranteed secure deletion mechanism.

Choose, Groups, and List share named lists through `randomisera-saved-lists-v1` in localStorage. Only explicit Save or Save changes actions persist input. Names are normalized to avoid duplicates, and replacement/deletion requires confirmation. Input overwrite and cross-tab conflicts are confirmed before proceeding. Result history remains in memory only.

The separate `randomisera-pwa-preferences` key stores only the offline choice, never whether installation is presumed to have succeeded. Previous installation flags are migrated away. Removing offline files does not remove saved lists. Storage may be separate between Safari and an installed iPhone app; nothing is synchronized between devices.

## Publication minification

Source files remain readable and are never overwritten by the publication build. List HTML is rendered from its shared template. esbuild bundles local controller modules and minifies JavaScript (including the service worker) and CSS; html-minifier-terser minifies HTML conservatively, preserving quoted attributes and optional tags. The web app manifest is compact JSON. Legal JavaScript/CSS notices are retained. No minifier or node_modules files are shipped to visitors, and no source maps are published.

Run `npm ci --ignore-scripts` once after checkout or dependency changes, then `npm test` and `npm run build`. GitHub Actions performs these steps automatically using the pinned package-lock.json. Build and browser test tools are development dependencies only. Formatting-only changes that produce identical output do not change the cache ID.

## Knockout tournaments from groups

After grouping, the Create knockout tournament action is available for 4–32 groups. The existing groups become Team 1, Team 2, and so on, with their members visible. Unequal team sizes are allowed with a short notice. Team positions are randomized, byes are handled automatically, and users select winners in the presentation. Back to teams preserves the group results, bracket, and selected winners; regrouping or returning to preparation resets the tournament. Tournament state stays in memory and can be copied as text.
