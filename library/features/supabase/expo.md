# Supabase with Expo

## Native Session

Persist Supabase session material with the generated SecureStore adapter, never
AsyncStorage. Disable URL-session detection intended for browsers. Start/stop automatic
refresh with application foreground/background lifecycle when required by the installed
SDK version, and handle revoked/expired sessions without a retry loop.

Register exact deep-link schemes and callback URLs for sign-in, verification, recovery,
and OAuth. Validate in-app destinations. `EXPO_PUBLIC_` values are public; only the
Supabase URL and publishable key belong there.

RLS remains authorization. A decoded token or local role flag is not permission to access
a row. Test session restore, foreground refresh, logout, deep-link rejection, and secure
storage failures on Android and iOS.
