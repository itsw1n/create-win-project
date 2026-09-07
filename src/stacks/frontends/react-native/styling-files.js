export function addReactNativeStylingFiles(files, answers, stack) {
  Object.assign(files, {
    'theme/tokens.ts': `export const colors = {
  background: '#f8fafc',
  foreground: '#0f172a',
  surface: '#ffffff',
  muted: '#e2e8f0',
  primary: '#2563eb',
  primaryForeground: '#ffffff',
} as const

export const spacing = { small: 8, medium: 16, large: 24, section: 48 } as const
export const radii = { control: 8 } as const
`,
    'components/layout/Screen.tsx': `import type { ReactNode } from 'react'
import { StyleSheet } from 'react-native'
import { SafeAreaView, type SafeAreaViewProps } from 'react-native-safe-area-context'
import { colors } from '@/theme/tokens'

type ScreenProps = SafeAreaViewProps & { children: ReactNode }

export function Screen({ children, style, ...props }: ScreenProps) {
  return <SafeAreaView style={[styles.screen, style]} {...props}>{children}</SafeAreaView>
}

const styles = StyleSheet.create({ screen: { flex: 1, backgroundColor: colors.background } })
`,
    'components/layout/Content.tsx': `import { StyleSheet, View, type ViewProps } from 'react-native'
import { spacing } from '@/theme/tokens'

export function Content({ style, ...props }: ViewProps) {
  return <View style={[styles.content, style]} {...props} />
}

const styles = StyleSheet.create({ content: { flex: 1, justifyContent: 'center', gap: spacing.medium, padding: spacing.large } })
`,
    'components/common/Button.tsx': `import type { ReactNode } from 'react'
import { Pressable, StyleSheet, Text, type PressableProps } from 'react-native'
import { colors, radii, spacing } from '@/theme/tokens'

type ButtonProps = Omit<PressableProps, 'children'> & {
  children: ReactNode
  variant?: 'primary' | 'secondary'
}

export function Button({ children, disabled, style, variant = 'primary', ...props }: ButtonProps) {
  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled}
      style={(state) => [
        styles.button,
        styles[variant],
        state.pressed && styles.pressed,
        disabled && styles.disabled,
        typeof style === 'function' ? style(state) : style,
      ]}
      {...props}
    >
      <Text style={[styles.label, variant === 'secondary' && styles.secondaryLabel]}>{children}</Text>
    </Pressable>
  )
}

const styles = StyleSheet.create({
  button: { minHeight: 44, alignItems: 'center', justifyContent: 'center', borderRadius: radii.control, paddingHorizontal: spacing.medium },
  primary: { backgroundColor: colors.primary },
  secondary: { backgroundColor: colors.muted },
  pressed: { opacity: 0.8 },
  disabled: { opacity: 0.5 },
  label: { color: colors.primaryForeground, fontWeight: '600' },
  secondaryLabel: { color: colors.foreground },
})
`,
    'app/index.tsx': homeScreen(answers, stack),
  })

  if ((answers.testing || 'basic') !== 'none') {
    files['components/common/Button.test.tsx'] = `import { fireEvent, render } from '@testing-library/react-native'
import { Button } from './Button'

test('runs its accessible press action', async () => {
  const onPress = jest.fn()
  const view = await render(<Button onPress={onPress}>Save</Button>)
  fireEvent.press(view.getByRole('button', { name: 'Save' }))
  expect(onPress).toHaveBeenCalledTimes(1)
})
`
  }

  if (stack.architecture !== 'small') {
    files['features/status/components/StarterStatus.tsx'] = `import { StyleSheet, Text, View } from 'react-native'
import { colors, spacing } from '@/theme/tokens'
import type { StarterStatus as Status } from '../types'

export function StarterStatus({ status }: { status: Status }) {
  return <View style={styles.status}><Text accessibilityRole="header" style={styles.heading}>{status.heading}</Text><Text style={styles.profile}>Architecture: {status.profile}</Text></View>
}

const styles = StyleSheet.create({
  status: { gap: spacing.small },
  heading: { color: colors.foreground, fontSize: 36, fontWeight: '700' },
  profile: { color: colors.primary, fontWeight: '600' },
})
`
  }
}

function homeScreen(answers, stack) {
  const featureImports = stack.architecture === 'small'
    ? ''
    : stack.architecture === 'large'
      ? "\nimport { getStarterStatus, StarterStatus } from '@/features/status'"
      : "\nimport { StarterStatus } from '@/features/status/components/StarterStatus'\nimport { getStarterStatus } from '@/features/status/services/getStarterStatus'"
  const statusSetup = stack.architecture === 'small' ? '' : '  const status = getStarterStatus()\n'
  const heading = stack.architecture === 'small'
    ? '<Text accessibilityRole="header" style={styles.heading}>Your starter is running</Text>'
    : '<StarterStatus status={status} />'

  return `import { StyleSheet, Text } from 'react-native'\nimport { Content } from '@/components/layout/Content'\nimport { Screen } from '@/components/layout/Screen'\nimport { colors } from '@/theme/tokens'${featureImports}\n\nexport default function HomeScreen() {\n${statusSetup}  return <Screen><Content><Text style={styles.eyebrow}>create-win-project</Text>${heading}<Text style={styles.description}>{${JSON.stringify(answers.projectDescription)}}</Text></Content></Screen>\n}\n\nconst styles = StyleSheet.create({\n  eyebrow: { color: colors.primary, fontWeight: '600' },\n  heading: { color: colors.foreground, fontSize: 36, fontWeight: '700' },\n  description: { color: colors.foreground, lineHeight: 24 },\n})\n`
}
