# Randomisera

A lightweight static website for choosing random options, generating numbers, creating groups, shuffling lists, and flipping a coin.

## PWA

All tool pages link to the app manifest and icons. The footer button opens the installation prompt when supported; otherwise, it displays installation instructions. Test over HTTPS or localhost. Installation is not available through `file://`.

Offline files are stored only after the user explicitly chooses to enable offline access. Input lists and results are not saved. Test installation and offline functionality on both iPhone and Android after deployment. An installed iPhone web app may use storage separate from Safari, so offline access may need to be enabled from within the installed app as well.

When cached files change, increment `CACHE` in `sw.js`. Old offline files are replaced when the new service worker activates after the old tabs and app windows close. Online requests try the network first.

## Before every deployment

**Increment the cache version in `sw.js` whenever cached files change.** Follow the [deployment checklist and PWA update guide](docs/Publication.md).
