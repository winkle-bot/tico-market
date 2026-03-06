# Next Focus Todo

Working rule: completed items get removed from this file when they land and are committed.

## 3. Feria Commerce Loop

- Add QR-based feria pickup completion
- Support feria-specific batching logic for delivery requests

## 4. Translation And Messaging

- Add translation provider configuration
- Add translation failure handling
- Add translation usage limits
- Add translation caching where privacy permits
- Improve quick replies for marketplace contexts
- Improve quick replies for feria contexts
- Extend translation controls to more listing surfaces
- Extend translation controls to more messaging surfaces
- Decide whether voice notes are the next attachment to ship

## 5. Notifications And Background Processing

- Move saved-search alert dispatch to background jobs
- Move other fan-out async work to background jobs
- Add delivery notification preference granularity
- Add order notification preference granularity
- Add search-alert notification preference granularity
- Audit push delivery reliability
- Clean up unsubscribe failures and stale subscriptions
- Add failure telemetry for push and async jobs
- Add structured operational logging for important async flows

## 6. Payments And Protection

- Design the Stripe-backed escrow and release model
- Tie disputes, evidence, and order-state history together more tightly
- Define the boundary between platform-facilitated and cash/SINPE flows
- Improve admin tooling for refunds
- Improve admin tooling for disputes
- Improve admin tooling for failed payment recovery
