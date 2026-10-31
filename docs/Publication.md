# Deployment and PWA updates

## Important rule before every deployment

**Whenever a file listed in `FILES` in `sw.js` changes, give `CACHE` a new, unique version number.** This includes minor text changes, CSS, JavaScript, the manifest, and icons.

For example, change `randomisera-offline-v1` to `randomisera-offline-v2`. Always check the current value in `sw.js`; these version numbers are examples only.

The version must change because the browser detects service worker updates by changes to the worker file. Without a version change, users may receive current files online while retaining outdated offline files. Do not reuse a cache key for a new release.

## Checklist before committing and pushing

- [ ] Review the changes and test the affected tools.
- [ ] Increment `CACHE` in `sw.js` if any cached file changed.
- [ ] Update `FILES` in `sw.js` whenever a page or resource is added, moved, or removed.
- [ ] Verify that every URL in `FILES` can be fetched. A single failed request can prevent the entire new offline installation from completing.
- [ ] Deploy changed pages, assets, and `sw.js` together in the same commit/deployment.
- [ ] Review the diff and include new files, such as the manifest, service worker, and icons, in the commit.
- [ ] Push and wait for the GitHub Pages deployment to succeed.

## How users receive updates

Home screen installation and offline access are separate features. The service worker is registered only after the user chooses “Gör tillgänglig offline” (Make available offline).

1. When online, the app tries to fetch current files from the network. The browser's normal HTTP cache can affect when a new file is retrieved; immediate updates for every user are not guaranteed.
2. The browser checks the registered service worker for updates, typically while the website is being used. Updates are not pushed to a closed app on a guaranteed schedule.
3. When a changed `sw.js` is detected, the files in `FILES` are downloaded into the new version's cache.
4. The new worker normally waits until all windows and tabs controlled by the old worker have closed. We do not force a switch during a session with `skipWaiting()`.
5. When the new worker activates, it deletes old cache versions whose names start with `randomisera-offline-`.
6. When a network request fails or returns an HTTP error, the worker falls back to the active offline cache for URLs listed in `FILES`.

Users normally do not need to reinstall the app. Changes do not automatically appear in a page that is already open. Users need an internet connection to download a new version and may need to close all app windows and browser tabs before opening the app again. Simply switching to another app does not necessarily close the PWA window.

Online files and stored offline files may temporarily belong to different releases. Do not assume every user receives a new release at the same time. If strictly synchronized, version-consistent updates become necessary, the loading strategy will need further development.

## Verification after deployment

Test on both iPhone and Android, preferably including an upgrade from an already installed previous version:

- [ ] Open the website over HTTPS and check navigation, themes, and tools.
- [ ] Check home screen installation and the dice icon.
- [ ] Select “Gör tillgänglig offline” (Make available offline) and wait for confirmation.
- [ ] Close all relevant tabs and app windows, then reopen the app. For an upgrade, first allow the app to connect online and download the update.
- [ ] Enable airplane mode and reopen the app. Test every tool and navigation between pages.
- [ ] Verify that a change from the new release is actually visible offline. Merely opening the page is not sufficient to verify an update.
- [ ] Test “Ta bort offlinefiler” (Remove offline files) and restart the app. Downloading offline files again should require an explicit user action.

## Limitations and troubleshooting

- There is currently no update notification or button to activate a waiting update.
- Users or browsers can clear offline storage. It is not guaranteed to persist permanently.
- Safari and an installed iPhone web app may have separate storage. Offline access may need to be enabled within the installed app as well.
- Input lists and result history are not saved by the PWA cache. History disappears when the page is reloaded or closed.
- If an update appears stuck, check that `CACHE` changed, all `FILES` are deployed, and old app windows and tabs have closed.
- If necessary, users can remove offline files while online and download them again. Reinstalling the app should not be the first troubleshooting step.
- When rolling back to older code, still use a new cache version so the rollback is detected as a new release.
