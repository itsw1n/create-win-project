# Expo Runtime

## Lifecycle and Remote State

- Re-evaluate session and stale remote state when the app returns to the foreground.
- Cancel work that outlives a screen; do not retry writes without idempotency analysis.
- Design loading, offline, empty, error, retry, and conflict states.
- Persist only the minimum state that must survive termination.
- Use route params for navigation state, a query cache for remote state when justified,
  and a client store only for genuinely cross-screen client state.
- Every `EXPO_PUBLIC_` value is embedded in the application and is not secret.

Web export proves bundling, not native correctness. Test Android and iOS behavior before
release, including permissions, safe areas, text scaling, links, and background changes.
