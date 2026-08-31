# NativeWind — Styling (React Native)

> **Required for React Native.** NativeWind brings Tailwind CSS utility classes to
> React Native components. If you know Tailwind for web, you already know this.

---

# 1. Key Differences from Web Tailwind

| Web CSS / Tailwind | React Native / NativeWind |
|---|---|
| Cascade inheritance | No cascade — every component is isolated |
| `rem` units | No `rem` — use numeric scale (`text-base`, `p-4`) |
| `vh` / `vw` | Use `flex-1`, `w-screen`, or `Dimensions` |
| Media queries | `Platform.OS` checks or `ios:` / `android:` variants |
| `hover:` states | `active:` for press states on mobile |
| `<div>` | `<View>` |
| `<p>`, `<span>` | `<Text>` — ALL visible text must be in `<Text>` |
| `flexDirection: row` default | `flexDirection: column` default in RN |
| CSS `shadow` | `shadow-md` (iOS) + `elevation-*` (Android) |

---

# 2. Basic Component

```tsx
import { TouchableOpacity, Text } from 'react-native'

export function PrimaryButton({ title, onPress, disabled }: Props) {
  return (
    <TouchableOpacity
      className="bg-blue-600 px-4 py-3 rounded-xl active:opacity-75 disabled:opacity-50"
      onPress={onPress}
      disabled={disabled}
    >
      <Text className="text-white font-semibold text-base text-center">
        {title}
      </Text>
    </TouchableOpacity>
  )
}
```

---

# 3. Layout Patterns

```tsx
// Column (default in RN — no flex-col needed)
<View className="flex-1 px-4 py-6 gap-4">
  <Text className="text-2xl font-bold text-gray-900">Title</Text>
</View>

// Row
<View className="flex-row items-center justify-between px-4 py-3">
  <Text className="text-base font-medium">{label}</Text>
</View>

// Card
<View className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
  {children}
</View>
```

---

# 4. Safe Area — Always Required

```tsx
import { SafeAreaView } from 'react-native-safe-area-context'

export default function HomeScreen() {
  return (
    <SafeAreaView className="flex-1 bg-white">
      {/* content */}
    </SafeAreaView>
  )
}
```

Every screen root must be wrapped in `SafeAreaView` — handles notches and home indicators.

---

# 5. Platform Variants

```tsx
<View className="p-4 ios:pt-6 android:pt-4">
  {/* iOS gets extra top padding */}
</View>
```

---

# 6. Dark Mode

```tsx
<View className="bg-white dark:bg-gray-900">
  <Text className="text-gray-900 dark:text-white">Hello</Text>
</View>
```

NativeWind reads system color scheme automatically.

---

# 7. Design Tokens — tailwind.config.ts

Never use magic colors or spacing values in className strings. Extend the config:

```ts
// tailwind.config.ts
export default {
  content: ['./app/**/*.tsx', './features/**/*.tsx', './components/**/*.tsx'],
  theme: {
    extend: {
      colors: {
        brand: { DEFAULT: '#3B82F6', dark: '#1D4ED8' },
        surface: '#F9FAFB',
      },
      borderRadius: {
        card: '16px',
      },
    },
  },
}
```

```tsx
// Use token, not magic value
<View className="bg-brand rounded-card" />
```

---

# 8. When to Use StyleSheet Instead

Use `StyleSheet` only for what NativeWind cannot express: animated values, dynamic JS-computed styles.

```tsx
import { StyleSheet, Animated } from 'react-native'

// NativeWind for static layout, StyleSheet for animated value
<Animated.View
  className="bg-white rounded-2xl"
  style={[styles.shadow, { transform: [{ scale: animatedScale }] }]}
/>

const styles = StyleSheet.create({
  shadow: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 4,
  },
})
```

---

# 9. Rules

- Use NativeWind by default. `StyleSheet` only for animated or JS-computed styles.
- Do NOT mix inline `style={{}}` objects, `StyleSheet`, and `className` for the same concern.
- All visible text must be in `<Text>`. No bare strings in JSX.
- `flexDirection` defaults to `column` — opposite of web CSS.
- Use `active:` not `hover:` for press states.
- Wrap every screen root in `SafeAreaView`.
- Design tokens go in `tailwind.config.ts`. No magic values in JSX.

---

# 10. Agent Quick Reference

```text
New component?               → className with Tailwind classes
Press state?                 → active:opacity-75 (not hover:)
Row layout?                  → flex-row (column is the default)
Screen root?                 → SafeAreaView className="flex-1 bg-white"
Platform-specific style?     → ios: / android: variants
Animated style?              → StyleSheet alongside className
New color / spacing token?   → tailwind.config.ts theme.extend
Text not showing?            → wrap in <Text> — bare strings crash RN
```
