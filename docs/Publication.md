# Publication and PWA updates

## One-time GitHub Pages setup

After committing and pushing these changes, open **Settings → Pages → Build and deployment** and select **GitHub Actions** as the publishing source. Keep the existing custom domain and HTTPS settings. A source-branch deployment does not run our cache-ID build step; publish the generated artifact using the provided workflow.

The workflow uses `main`, has separate build and deployment jobs, and deploys only `_site/`. It does not publish source tooling, tests, local preview files, or documentation.

## Normal release process

1. Review and test the changes: `node --test tests/*.test.cjs`.
2. If a page or asset is added, moved, or removed, update the JSON `FILES` array in `sw.js`.
3. Run `node scripts/build-site.cjs` locally if you want to inspect the generated release.
4. Commit the source changes and push to `main`.
5. Wait for the **Publish website** workflow to finish.
6. Verify installation, offline access, and an upgrade on real iPhone and Android devices.

**Never edit a cache version number manually.** The build hashes the service worker template plus each offline file's path and contents. Unchanged inputs produce the same ID; changes to any input produce a new ID. Rolling back produces the ID of that release's contents. The generated worker and offline files are uploaded in the same Pages artifact.

The source worker uses `randomisera-offline-development`. The generated worker has a name such as `randomisera-offline-a7c91e42f830d112`. `_site/` is disposable, ignored by Git, and recreated only after all required source files have been verified.

## Installation flow

- Ordinary first visits do not register a service worker or create offline preferences.
- The footer offers **Lägg till på hemskärmen** on mobile or **Lägg till som app** on desktop in browser windows.
- If the native installation prompt is available, the button opens it. Cancellation does not request offline preparation. Acceptance or the browser's `appinstalled` event starts preparation.
- Where no native prompt is exposed, the button displays platform instructions and requests offline preparation. Files can therefore be saved even if the user does not complete the manual installation.
- Opening an installed app prepares offline files unless the user previously disabled offline access.
- Installed windows hide the promotion using their real display mode. No persistent `installed` flag is used. A separate browser window may still offer installation; reliable cross-platform detection of installation elsewhere is unavailable.
- Preparation is silent on success. Readiness is shown only inside the expandable **Offlinelagring** section. Failures open that section with a retry action.

## Cached releases and updates

1. Installation saves the complete offline file set. A failed download prevents activation of the new worker; the previous release remains available.
2. Once active, the worker serves its cached release immediately without waiting for the network. Query strings and explicit `index.html` links resolve to the same cached page.
3. Update checks occur independently of page rendering, including a background `registration.update()` check after load. An internet connection is required to download a new release.
4. A new worker prepares its own cache and waits while windows controlled by the previous worker remain open. We do not call `skipWaiting()` and never reload an active page automatically.
5. After old controlled windows close, the new worker activates. It removes only older `randomisera-offline-` caches and claims eligible clients. Saved lists are never part of that cleanup.
6. If storage is evicted, the client can ask the active worker to rebuild its complete cache. A missing individual cache entry can be retrieved online without putting newer assets into the old cache.

The first page used to request offline access may already have loaded from the network before a worker takes control. A previously installed legacy worker is also allowed to finish its session before the new worker takes over. Allow the update to download, close all relevant app windows and browser tabs, and reopen to verify the new release. Switching away from an app does not necessarily close it.

There is no update notification yet. Updates are not pushed to closed apps on a guaranteed schedule, and storage is not guaranteed to persist indefinitely.

## Offline controls and local storage

`randomisera-pwa-preferences` contains only `{offlineRequested: true}` or `{offlineRequested: false}`. Old `installed` properties are removed when read. An explicitly disabled offline choice is respected on later app launches. A user can enable offline again from **Offlinelagring**.

Removing offline files unregisters this app's worker and removes only its cache prefix. It preserves saved lists and records the disabled choice. Users should restart the app to release any already running worker. Controls are disabled during preparation or removal to avoid conflicting operations. Storage failures are handled without preventing the randomization tools from working.

Named lists use the separate `randomisera-saved-lists-v1` key with `{version:1, lists:[{name,entries}]}`. Existing data remains compatible. Loading a list does not save edits automatically; updating a saved list or creating another one requires an explicit action. Result history is not persisted.

## Test checklist after deployment

- [ ] Open the site over HTTPS and check tools, navigation, themes, and the footer.
- [ ] Test normal and cancelled installation in Android Chrome.
- [ ] Test Safari's Add to Home Screen flow and launch the installed iPhone app online.
- [ ] Verify that installation instructions are hidden inside the installed app.
- [ ] Expand **Offlinelagring** and check readiness.
- [ ] Close and reopen in airplane mode; test every tool and page link.
- [ ] Save a named list, deploy a changed release, open online to download the update, close all old app windows/tabs, and reopen. Confirm the changed release is available offline and the saved list remains.
- [ ] Remove offline files, restart, and check that they do not reappear automatically. Enable offline again and retry airplane mode.
- [ ] Check behavior with blocked localStorage and unavailable storage.

Safari and an installed iPhone app may have separate storage. Offline preparation and tests may need to happen inside the installed app. Clearing website data removes saved lists; uninstalling alone may not clear all website data.

## Troubleshooting

- If deployment fails, check Actions and verify the Pages source is **GitHub Actions**.
- If offline preparation fails, check every URL in `FILES` and the browser's storage availability.
- If an old release remains, allow an online update check, close all controlled windows/tabs, and reopen. Do not force a reload during an active draw.
- When testing locally, serve `_site/` for production-like PWA behavior. For ordinary source editing, disable offline access on localhost so an old development cache does not hide edits.
- Do not delete or rename `sw.js` as a way to remove a worker. Existing clients keep their registration until it is explicitly unregistered.
