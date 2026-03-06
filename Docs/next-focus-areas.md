# Tico Market — Next Areas Of Focus

This document picks up after the audit, security fixes, and PRD-gap implementation pass completed on March 6, 2026.

The current codebase now covers:
- checkout and order-flow hardening
- delivery privacy and negotiation fixes
- driver document privacy
- persisted feria follows
- saved searches with alert dispatch
- bilingual translation scaffolding
- richer chat attachments
- offline queued mutation scaffolding

The next phase should shift from broad gap-closing to depth, reliability, and launch readiness.

## 1. Stabilize The New Features We Just Added

Why this matters:
- Several important PRD features now exist in first usable form, but they still need deeper QA and operational hardening.
- This is the fastest way to improve real user trust before adding more surface area.

Focus:
- run browser QA on feria follows, saved searches, translation, chat attachments, and offline queue replay
- test reconnect edge cases, duplicate replay prevention, and stale optimistic UI recovery
- verify storage migrations and buckets in every deployed environment
- add e2e coverage for the new user-facing flows

Exit criteria:
- each new feature has at least one end-to-end happy-path test
- offline queue replay is deterministic and does not create duplicate writes
- attachment uploads, signed URLs, and saved-search alerts work in staging

## 2. Complete Delivery Trust And Coordination

Why this matters:
- Delivery is one of the product's core differentiators.
- The current flow is much healthier than before, but it still lacks the full PRD coordination layer.

Focus:
- implement three-way buyer/seller/driver delivery chat
- add real-time driver tracking in active orders
- add clearer delivery state transitions and ETA updates in account/order views
- improve queued/offline behavior for delivery-request creation and status updates

Exit criteria:
- an active delivery opens a shared communication channel for all participants
- buyer and seller can see live driver progress during active fulfillment
- delivery actions remain usable with intermittent connectivity

## 3. Finish The Feria Commerce Loop

Why this matters:
- Feria commerce is the strongest product differentiator in the PRD.
- The discovery layer exists, but the transaction loop inside the feria model is still incomplete.

Focus:
- build feria vendor storefront depth and weekly availability publishing
- implement feria pre-orders and reservation confirmation
- add QR-based feria pickup completion
- support feria-specific batching logic for delivery requests

Exit criteria:
- a buyer can reserve a feria item before market day
- a seller can confirm pickup at the feria with a QR handoff
- feria vendors can publish what they will bring this week

## 4. Make Translation And Messaging Production-Ready

Why this matters:
- bilingual assistance is now scaffolded, but it is still best-effort and provider-dependent.
- messaging is central to conversion, especially for expats and tourists.

Focus:
- add provider configuration, failure handling, and usage limits for translation
- add translation caching where privacy permits
- improve quick replies for marketplace and feria contexts
- extend translation controls to more listing and messaging surfaces
- decide whether voice notes are the next messaging attachment to ship

Exit criteria:
- translation behavior is predictable when the provider is configured and graceful when it is not
- high-frequency chat/listing translation does not create avoidable repeated API cost
- seller quick replies cover the most common marketplace and feria cases

## 5. Tighten Notifications, Jobs, And Background Processing

Why this matters:
- saved-search alerts, push notifications, and queued replay all depend on background reliability.
- these systems should not stay request-bound forever.

Focus:
- move alert dispatch and other fan-out work to background jobs
- add delivery/order/search-alert preference granularity in notification settings
- audit push delivery, unsubscribe cleanup, and failure telemetry
- introduce structured operational logging for important async flows

Exit criteria:
- saved-search alerts and notification fan-out do not depend on foreground request timing
- users can control which notification categories they receive
- async delivery failures are visible and diagnosable

## 6. Build The Payment And Protection Layer Out Further

Why this matters:
- the current purchase flow is safer than before, but the PRD vision includes stronger transaction protection.
- this becomes more important as delivery, feria reservations, and platform-facilitated payments deepen.

Focus:
- design the practical escrow/release model for Stripe-backed transactions
- connect disputes, evidence, and order-state history more tightly
- define the boundary between platform-facilitated and cash/SINPE-only flows
- improve admin tooling around refunds, disputes, and failed payment recovery

Exit criteria:
- payment-handled orders have a clear hold/release/dispute path
- admins can investigate and resolve transaction failures without manual database work

## Recommended Order

1. Stabilize the new features already shipped in this pass
2. Complete delivery coordination and tracking
3. Finish the feria transaction loop
4. Productionize translation and messaging
5. Move notifications and alerts into background processing
6. Deepen payment protection and dispute handling

## Suggested Working Rule

For the next phase, avoid opening large new product surfaces until each newly added feature has:
- browser QA
- at least one e2e test
- clear failure behavior
- deploy/staging verification

That tradeoff is worth it now. The platform has enough breadth; the next win is confidence and conversion quality.
