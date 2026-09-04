# Expo Testing

## Test Layers

- Unit-test schemas, state transitions, and pure sync/conflict policies.
- Use React Native Testing Library for accessible screen behavior.
- Contract-test API/data functions and offline/error normalization.
- Test SecureStore through an adapter, never by exposing real session material.
- Test foreground/background expiry and ensure refresh failures cannot loop.
- Large projects add native-device E2E for critical flows.

Every profile passes typecheck, Jest, `expo install --check`, and web export. These checks
do not replace Android and iOS release verification.
