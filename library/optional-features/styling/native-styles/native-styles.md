# React Native StyleSheet

## Default

Use React Native's built-in `StyleSheet` for the starter. It runs without a CSS compiler, Babel plugin, or platform-specific setup and keeps the generated Expo project immediately runnable.

```tsx
import { StyleSheet, Text, View } from 'react-native'

export function EmptyState() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Nothing here yet</Text>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { padding: 24 },
  title: { fontSize: 20, fontWeight: '600' },
})
```

## Rules

- Keep styles next to a component until several components share the same design primitive.
- Use theme tokens for repeated colors, spacing, radius, and typography; do not create a global stylesheet of screen-specific rules.
- Test layout on Android, iOS, and web before assuming platform behavior is identical.
- Add NativeWind or another styling system only as an explicit project decision, including its complete Expo configuration and build verification.
