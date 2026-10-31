# Randomisera

A lightweight static website for choosing random options, generating numbers, creating groups, shuffling lists, and flipping a coin.

## PWA

All tool pages link to the app manifest and icons. The footer button opens the installation prompt when supported; otherwise, it displays installation instructions. Test over HTTPS or localhost. Installation is not available through `file://`.

Offline files are prepared as part of the user-requested installation flow. On iPhone, opening the installed app also prepares offline files unless the user previously removed them. Local storage remembers installation and offline preferences; it does not store input lists or results. Explicitly saved lists use a separate localStorage key. Input lists are saved only when the user chooses Save list; result history is not persisted. Test installation and offline functionality on both iPhone and Android after deployment. An installed iPhone web app may use storage separate from Safari, so offline access may need to be enabled from within the installed app as well.

When cached files change, increment `CACHE` in `sw.js`. Old offline files are replaced when the new service worker activates after the old tabs and app windows close. Online requests try the network first.

## Before every deployment

**Increment the cache version in `sw.js` whenever cached files change.** Follow the [deployment checklist and PWA update guide](docs/Publication.md).

## Saved lists

The Choose, Groups, and List tools share named lists through the `randomisera-saved-lists-v1` localStorage key. Data uses `{version: 1, lists: [{name, entries}]}`. Nothing is saved automatically. Names are compared after Unicode normalization, trimming, whitespace normalization, and case folding. Replacing an existing list, deleting it, and loading into a different nonempty input require confirmation. Loading resets the current selection through the input event but preserves result history.

Lists remain local to the current browser/storage context and are not synchronized between devices. Clearing website data removes them. An installed iPhone app may have separate storage from Safari. Storage errors are reported without overwriting input or unreadable saved data. Removing offline files does not delete saved lists; use each list's Delete action to remove it.

## Local preview

Open `index.html` directly to preview the tools and navigation. Internal links explicitly include `index.html`. PWA installation and service workers require HTTPS or a localhost server. For reliable shared saved lists, use localhost: localStorage behavior for `file://` URLs varies by browser and may be separate for each file. Canonical URLs keep the public directory addresses.

### Saved-list interface

Load list opens a picker with each list's name, item count, Use, and Delete actions. Save list opens a separate naming panel. After loading or saving, the active list name is shown; Save changes is enabled only when the entries differ from the loaded snapshot. Save as new list opens an empty name field. Existing localStorage data remains compatible. Updates detect conflicting changes made in another tab and ask before replacing them. No edits are saved automatically.
