# Randomisera

A small static website for random choices, numbers, groups, shuffled lists, and coin flips. No framework, package installation, database, or account is required.

## Development

Edit the HTML and the shared files in `assets/`. Open `index.html` directly for basic preview, or use a localhost server for shared local storage and PWA testing. This machine's `start-local.cmd` is local-only and excluded from Git.

Run the automated checks and create the deployment folder with Node.js 22 or newer:

```sh
node --test tests/*.test.cjs
node scripts/build-site.cjs
```

The build creates `_site/`, containing only public website files. It generates a deterministic cache ID from all offline assets and the service worker. **Do not increment cache versions manually.** `_site/` is not committed.

## Publication

The workflow in `.github/workflows/pages.yml` tests, builds, and deploys `_site/` on pushes to `main`.

**One-time setup:** in the repository's **Settings → Pages → Build and deployment**, choose **GitHub Actions** as the source. Keep the existing custom domain. See the [publication and PWA guide](docs/Publication.md).

## PWA

The footer offers **Lägg till på hemskärmen** on mobile or **Lägg till som app** on desktop. Supported browsers open their native installation prompt; other browsers show instructions. Installed app windows hide the installation action based on their actual display mode, not a saved installation flag.

Offline preparation follows the installation request or first launch of the installed app. Cached files are served immediately as one release; a new worker prepares the next release in the background and waits until old controlled windows close. No automatic reload interrupts an active session. Offline storage and removal are available in a small expandable footer section.

Use HTTPS or localhost and test the generated `_site/` build when checking PWA updates. The source worker uses a fixed development cache name and is not a release artifact. This machine's local server also supports `node .local/serve.cjs 4173 --built` after a build. Browser storage restrictions and eviction can affect offline availability.

## Saved lists and privacy

Choose, Groups, and List share named lists through `randomisera-saved-lists-v1` in localStorage. Only explicit Save or Save changes actions persist input. Names are normalized to avoid duplicates, and replacement/deletion requires confirmation. Input overwrite and cross-tab conflicts are confirmed before proceeding. Result history remains in memory only.

The separate `randomisera-pwa-preferences` key stores only the offline choice, never whether installation is presumed to have succeeded. Previous installation flags are migrated away. Removing offline files does not remove saved lists. Storage may be separate between Safari and an installed iPhone app; nothing is synchronized between devices.
