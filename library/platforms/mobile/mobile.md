# Mobile Platform

## Device Boundary

An installed application cannot keep a server secret. Ship only public client identifiers; keep authorization and privileged operations on the server or in database policies. Store sessions in platform-protected secure storage, never plain preferences or AsyncStorage.

## Lifecycle and Links

Bind session refresh, subscriptions, and reconnect behavior to foreground/background lifecycle. Register exact application schemes and universal/app links. Validate every incoming deep link and allow only known destinations.

Design remote work for intermittent connectivity, retries, duplicate delivery, and cancellation. Large offline-capable applications require explicit conflict resolution and observable synchronization state.

## Device Experience

Respect safe areas, text scaling, accessibility roles, reduced motion, permissions, and platform navigation conventions. Test behavior on representative devices; a web export is useful but does not replace native verification.
