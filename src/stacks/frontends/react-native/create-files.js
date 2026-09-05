export function buildReactNativeFiles(answers, stack, shared) {
  const files = {
    'package.json': shared.packageFile(answers, stack),
    '.node-version': `${stack.profile.runtimes.node}\n`,
    '.npmrc': 'engine-strict=true\n',
    'app.json': shared.json({ expo: { name: answers.projectName, slug: answers.projectName, version: '1.0.0', orientation: 'portrait', scheme: answers.projectName, userInterfaceStyle: 'automatic', plugins: stack.authentication === 'supabase' ? ['expo-router', 'expo-secure-store'] : ['expo-router'], experiments: { typedRoutes: true } } }),
    'tsconfig.json': shared.json({ extends: 'expo/tsconfig.base', compilerOptions: { strict: true, types: ['jest'], paths: { '@/*': ['./*'] } }, include: ['**/*.ts', '**/*.tsx', '.expo/types/**/*.ts', 'expo-env.d.ts'] }),
    'expo-env.d.ts': "/// <reference types=\"expo/types\" />\n",
    'app/_layout.tsx': stack.authentication === 'supabase'
      ? `import { Stack } from 'expo-router'\nimport { useEffect } from 'react'\nimport { bindSupabaseAuthLifecycle } from '@/lib/supabase-lifecycle'\n\nexport default function RootLayout() {\n  useEffect(() => bindSupabaseAuthLifecycle(), [])\n  return <Stack screenOptions={{ headerTitle: '${answers.projectName}' }} />\n}\n`
      : `import { Stack } from 'expo-router'\n\nexport default function RootLayout() { return <Stack screenOptions={{ headerTitle: '${answers.projectName}' }} /> }\n`,
    'app/index.tsx': stack.architecture === 'small'
      ? `import { StyleSheet, Text, View } from 'react-native'\nimport { SafeAreaView } from 'react-native-safe-area-context'\n\nexport default function HomeScreen() {\n  return <SafeAreaView style={styles.safe}><View style={styles.container}><Text>create-win-project</Text><Text accessibilityRole="header">Your starter is running</Text><Text>{${JSON.stringify(answers.projectDescription)}}</Text></View></SafeAreaView>\n}\nconst styles = StyleSheet.create({ safe: { flex: 1 }, container: { flex: 1, justifyContent: 'center', padding: 24, gap: 12 } })\n`
      : `import { StyleSheet, Text, View } from 'react-native'\nimport { SafeAreaView } from 'react-native-safe-area-context'\n${stack.architecture === 'large'
        ? "import { getStarterStatus, StarterStatus } from '@/features/status'"
        : "import { StarterStatus } from '@/features/status/components/StarterStatus'\nimport { getStarterStatus } from '@/features/status/services/getStarterStatus'"}\n\nexport default function HomeScreen() {\n  const status = getStarterStatus()\n  return <SafeAreaView style={styles.safe}><View style={styles.container}><Text>create-win-project</Text><StarterStatus status={status} /><Text>{${JSON.stringify(answers.projectDescription)}}</Text></View></SafeAreaView>\n}\nconst styles = StyleSheet.create({ safe: { flex: 1 }, container: { flex: 1, justifyContent: 'center', padding: 24, gap: 12 } })\n`,
  }
  shared.testFiles(files, '', stack, answers.testing || 'basic')
  Object.assign(files, shared.nativeStatusFeatureFiles(stack))
  return files
}
