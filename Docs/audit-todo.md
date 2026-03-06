# Audit TODO

This file tracks the implementation work coming out of the PRD/code audit.
Items are removed as they are completed and committed.

## Fixes

- [ ] Repair the delivery negotiation/manage flow, including missing backend endpoints and broken client fetch logic.
- [ ] Unify checkout driver selection with the real `driver_profiles` source instead of driver listings.
- [ ] Fix automated test configuration and stale schema expectations so unit tests reflect the current API shape.
- [ ] Move sensitive driver verification assets out of public listing storage.

## Missing PRD Features To Start After Fixes

- [ ] Persist feria follow/unfollow instead of local-only UI state.
- [ ] Add saved searches / alerts backlog entry implementation scaffold.
- [ ] Add translation / bilingual assistance backlog entry implementation scaffold.
- [ ] Add richer chat attachments backlog entry implementation scaffold.
- [ ] Add offline-first / queued action backlog entry implementation scaffold.
