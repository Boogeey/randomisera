# Publication and PWA updates

This guide describes the current build, release, and offline-update workflow. See [Architecture](Architecture.md) for source ownership and the [architecture decision records](adr/README.md) for the reasons behind the design.

## One-time GitHub Pages setup

In the repository's **Settings → Pages → Build and deployment**, select **GitHub Actions** as the publishing source. Keep the existing custom domain and HTTPS settings. A source-branch deployment does not run our build step; publish the generated artifact using the provided workflow.

The workflow runs on pushes to `main` and can also be started manually. It has separate build and deployment jobs and deploys only `_site/`. It does not publish source tooling, tests, local preview files, or documentation. Unit tests, the build, desktop/mobile Chromium interactions, and WebKit upgrade tests must pass before deployment. Browser failure diagnostics are retained as an Actions artifact for seven days.

## Normal release process

Use Node.js 22 or newer. Run `npm ci --ignore-scripts` after checkout or dependency changes. Install the test browsers with `npx playwright install chromium webkit` before running browser tests locally; CI installs both engines and their system dependencies automatically.

1. Edit shared tool markup in `templates/list-tool.html` or `templates/decision-tool.html`, headings in `assets/tool-content.js`, or route metadata in `scripts/list-pages.cjs`. Run `npm run generate` after those changes and include the generated HTML and sitemap changes. Other pages remain directly editable HTML.
2. If a public page or standalone public asset is added, moved, or removed, update the JSON `FILES` array in `sw.js`. Internal JavaScript modules imported by the controller are bundled into `assets/app.js`; do not add those source modules to `FILES` or as separate script tags.
3. Run `npm test`, `npm run build`, and `npm run test:browser`. The browser tests use the built `_site/` release and start their own server on port 4173; stop another local preview using that port first.
4. Review and commit the source changes, generated list pages, and any dependency lockfile changes, then push to `main`.
5. Wait for the **Publish website** workflow to finish. If browser tests fail, inspect the retained report, screenshots, and traces.
6. Verify installation, offline access, and an upgrade on real iPhone and Android devices. The automated Chromium tests do not verify Safari or native installation behavior on real phones.

**Never edit a cache version number manually.** The build renders list pages, bundles local controller modules, and minifies HTML, CSS, JavaScript, and the manifest. It hashes the minified worker template plus each offline file's path and final built contents. Identical final inputs produce the same ID; a change to those bytes or paths produces a new ID. Formatting-only source changes that produce the same output do not change the ID. Documentation and other files outside these hashed inputs do not change it either. Rebuilding a rollback with identical final inputs produces the same ID. The generated worker and offline files are uploaded in the same Pages artifact.

The source worker uses `randomisera-offline-development`. The generated worker has a name such as `randomisera-offline-a7c91e42f830d112`. `_site/` is disposable, ignored by Git, and recreated only after all required source files have been verified.

## Installation flow

- Ordinary first visits do not register a service worker or create offline preferences.
- The **App** page, linked from the footer, offers **Lägg till på hemskärmen** on mobile or **Lägg till som app** on desktop in browser windows.
- If the native installation prompt is available, the button opens it. Cancellation does not request offline preparation. Acceptance or the browser's `appinstalled` event starts preparation.
- Where no native prompt is exposed, the button displays platform instructions and requests offline preparation. Files can therefore be saved even if the user does not complete the manual installation.
- Opening an installed app prepares offline files unless the user previously disabled offline access.
- Installed windows hide the promotion using their real display mode. No persistent `installed` flag is used. A separate browser window may still offer installation; reliable cross-platform detection of installation elsewhere is unavailable.
- Preparation is silent on success. Readiness is shown only inside the expandable **Offlineinställningar** on the App page section. Failures open that section with a retry action.

## Cached releases and updates

1. Installation saves the complete offline file set. A failed download prevents activation of the new worker; the previous release remains available.
2. Once active, the worker serves its cached release immediately without waiting for the network. Query strings and explicit `index.html` links resolve to the same cached page.
3. Update checks occur independently of page rendering: after load, when the app becomes visible, and when the browser comes online. Automatic checks are limited to once a minute per open page, without a polling timer. The App page also offers an explicit retry. An internet connection is required to download a new release.
4. A new worker prepares its own cache and waits while windows controlled by the previous worker remain open. We do not call `skipWaiting()` and never reload an active page automatically.
5. After old controlled windows close, the new worker activates. It removes only older `randomisera-offline-` caches and claims eligible clients. Saved lists are never part of that cleanup.
6. Each built worker contains SHA-256 integrity metadata for every offline file. Both installation and recovery fetch with that integrity. Repair fills only missing entries and preserves valid cached entries. If the server has different bytes, recovery fails rather than combining releases. A missing entry's network fallback uses the same integrity check and returns a clear 503 recovery message on failure. This deliberately prefers a visible recovery failure to running incompatible code.

The first page used to request offline access may already have loaded from the network before a worker takes control. A previously installed legacy worker is also allowed to finish its session before the new worker takes over. Allow the update to download, close all relevant app windows and browser tabs, and reopen to verify the new release. Switching away from an app does not necessarily close it.

A waiting update is indicated by a small footer link outside the result presentation. The App page shows the active offline version, waiting status, a manual update-check button, and instructions to finish the current round and close all controlled windows. There is no forced activation or reload button: another open window may still contain an active result or tournament. A check that finds no waiting worker is not a guarantee that the browser has completed every pending download. Updates are not pushed to closed apps on a guaranteed schedule, and storage is not guaranteed to persist indefinitely.

The first release containing this improvement cannot retrofit its update UI or integrity checks into already open legacy pages/workers. Those users must complete the existing close-and-reopen update once. The version shown on the App page identifies the active worker's cached offline release, not every document that might already be open from the network.

## Offline controls and local storage

`randomisera-pwa-preferences` contains only `{offlineRequested: true}` or `{offlineRequested: false}`. Old `installed` properties are removed when read. An explicitly disabled offline choice is respected on later app launches. A user can enable offline again from **Offlineinställningar** on the App page.

Removing offline files unregisters this app's worker and removes only its cache prefix. It preserves saved lists and records the disabled choice. Users should restart the app to release any already running worker. Controls are disabled during preparation or removal to avoid conflicting operations. Storage failures are handled without preventing the randomization tools from working.

Named lists use the separate `randomisera-saved-lists-v1` key with `{version:1, lists:[{name,entries}]}`. Existing data remains compatible. Loading a list does not save edits automatically; updating a saved list or creating another one requires an explicit action. Result history is not persisted.

The current list draft and settings use `randomisera-list-draft-v1` in sessionStorage to survive same-tab navigation and reloads. Older drafts without a grouping method are restored as group counts. New sessions default to a maximum group size; explicit saved session choices take precedence. Results, history, dice locks, and knockout progress remain memory-only. See [storage compatibility](Architecture.md#storage-compatibility).

## Local preview

Run `npm run dev` to build and serve `_site/` at `http://127.0.0.1:4173`. It is not a watch server: stop and rerun it after source edits. Opening source HTML directly is not supported because the controller's local modules need bundling.

The local, Git-ignored Windows helper `start-local.cmd`, where present on this development machine, also builds before serving `_site/`. It is not supplied by a clean checkout. The repository-supported alternative is `npm run dev`.

For production-like offline checks, use the built release over HTTPS or localhost. Disable offline access on the local origin when checking ordinary code changes so a previous cached release does not hide edits. `localhost` and `127.0.0.1`, and different ports, are separate origins with separate browser storage and service-worker registrations.

## Test checklist after deployment

- [ ] Open the site over HTTPS and check tools, navigation, themes, and the footer.
- [ ] Test normal and cancelled installation in Android Chrome.
- [ ] Test Safari's Add to Home Screen flow and launch the installed iPhone app online.
- [ ] Verify that the installation button and its instruction panel are hidden inside the installed app. The static platform guides on the App page remain available.
- [ ] Expand **Offlineinställningar** on the App page and check readiness.
- [ ] Close and reopen in airplane mode; test every tool and page link.
- [ ] Save a named list, deploy a changed release, open online to download the update, close all old app windows/tabs, and reopen. Confirm the changed release is available offline and the saved list remains.
- [ ] Leave two windows open while an update downloads. Confirm the update notice and version information, no forced reload, and activation only after both old windows close.
- [ ] With an old worker active, remove one cache entry and publish different bytes for that file. Confirm fallback and repair fail safely instead of mixing releases, then close all windows to activate the complete new release.
- [ ] Remove offline files, restart, and check that they do not reappear automatically. Enable offline again and retry airplane mode.
- [ ] Check behavior with blocked localStorage and unavailable storage.
- [ ] Check that a current list and grouping settings survive switching tools, that saved lists remain intact, and that returning from a result to preparation starts a fresh session.

Safari and an installed iPhone app may have separate storage. Offline preparation and tests may need to happen inside the installed app. Clearing website data removes saved lists; uninstalling alone may not clear all website data. Automated WebKit upgrade tests complement, but do not replace, these real-device checks.

## Troubleshooting

- If deployment fails, check Actions and verify the Pages source is **GitHub Actions**.
- If offline preparation fails, check every URL in `FILES` and the browser's storage availability.
- If an old release remains, allow an online update check, close all controlled windows/tabs, and reopen. Do not force a reload during an active draw.
- If missing offline files cannot be restored, the server may no longer host that exact release. Use the App page to check for an update, finish the current round, close all windows, and reopen online. Do not clear all website data: that also removes saved lists.
- If changes appear in source but not in local preview, rebuild and restart the preview. Check offline settings on the exact local origin in use.
- If the generated-page consistency test fails, edit the list template or route metadata and run `npm run generate`; do not maintain the generated list pages independently.
- Do not delete or rename `sw.js` as a way to remove a worker. Existing clients keep their registration until it is explicitly unregistered.

## Publication minification

Source files remain readable and are never overwritten by the publication build. `npm run generate` separately refreshes the committed tool-page copies and sitemap from their shared sources. The publication build renders those pages directly from their templates and uses esbuild to bundle local controller dependencies into one browser script. esbuild also minifies JavaScript (including the service worker) and CSS; html-minifier-terser minifies HTML conservatively, preserving quoted attributes and optional tags. The web app manifest is compact JSON. Legal JavaScript/CSS notices are retained. Internal modules, minifiers, browser test tools, and node_modules files are not shipped as separate resources, and no source maps are published.

GitHub Actions installs dependencies from `package-lock.json`, runs `npm test`'s underlying Node test command, builds the site, installs Chromium and WebKit, and runs `npm run test:browser` before uploading the Pages artifact. Build and browser test tools are development dependencies only.
