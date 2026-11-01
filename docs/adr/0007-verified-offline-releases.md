# 0007 — Verify offline release files and expose waiting updates

- Status: Accepted
- Recorded: 2026-11-01

## Context

Offline users could unknowingly retain an older release. Although a cache name identified built content, recovery fetched unversioned URLs without verifying their bytes. Missing-file fallback could combine old HTML with new JavaScript, and repair could fill an old cache with current files.

## Decision

Keep the non-interrupting activation boundary from [0005](0005-non-interrupting-offline-updates.md). Do not call `skipWaiting()` or reload active pages. Show waiting updates outside result presentations and explain closing all controlled windows on the App page. Show the active offline worker's version for troubleshooting. Check on load, visibility, and reconnection, with a one-minute automatic throttle per page and an explicit retry.

Build SHA-256 integrity metadata from the final offline file bytes and embed it in the worker before deriving the release ID. Use request integrity during installation, missing-entry repair, and network fallback. Repair only missing entries. Reject mismatching or unavailable resources rather than serving incompatible code; retain the valid old cache when a new installation fails.

## Tradeoffs

A deleted old asset cannot be recovered from a server that only hosts a different version. The user may need to finish their round, close all windows, and reopen online to activate a new release. This is preferable to silently running a broken combination of releases. Immutable versioned hosting could allow full historical recovery but adds deployment and retention complexity to this small static site.

A waiting-update notice gives users control without a forced activation button that could affect another window's ongoing session. Legacy clients receive these protections only after their first normal upgrade to this implementation. Browser-managed storage remains subject to eviction, and saved lists are local data rather than a backup.

## Validation

Unit tests verify integrity metadata, throttling, waiting status, failed installation, and cache repair. Browser tests switch between two complete built releases, retain two old windows, check offline activation and saved lists, and reject failed or mismatched resources. Real-device Safari checks remain part of deployment verification.
