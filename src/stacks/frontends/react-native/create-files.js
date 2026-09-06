import { json } from '../../shared/javascript-package.js'
import { addTestingFiles } from '../../shared/testing-files.js'
import { packageFile } from './dependencies.js'

export function buildReactNativeFiles(answers, stack, shared) {
  const files = {
    'package.json': packageFile(answers, stack),
    '.node-version': `${stack.profile.runtimes.node}\n`,
    '.npmrc': 'engine-strict=true\n',
    'app.json': json({ expo: { name: answers.projectName, slug: answers.projectName, version: '1.0.0', orientation: 'portrait', scheme: answers.projectName, userInterfaceStyle: 'automatic', runtimeVersion: { policy: 'appVersion' }, updates: { checkAutomatically: 'ON_LOAD', fallbackToCacheTimeout: 0 }, plugins: stack.authentication === 'supabase' ? ['expo-router', 'expo-secure-store'] : ['expo-router'], experiments: { typedRoutes: true } } }),
    'eas.json': json({ cli: { version: '>= 16.0.0', appVersionSource: 'remote' }, build: { development: { developmentClient: true, distribution: 'internal', channel: 'development' }, preview: { distribution: 'internal', channel: 'preview' }, production: { autoIncrement: true, channel: 'production' } }, submit: { production: {} } }),
    'lib/deep-links.ts': `const allowedRoutes = new Set(['/', '/login'])\n\nexport function acceptDeepLink(value: string, scheme = '${answers.projectName}') {\n  try {\n    const url = new URL(value)\n    if (url.protocol !== \`${'${scheme}'}:\`) return false\n    const route = \`/${'${url.host}'}${'${url.pathname}'}\`.replace(/\\/$/, '') || '/'\n    return allowedRoutes.has(route)\n  } catch { return false }\n}\n`,
    'docs/mobile/production.md': `# Mobile production\n\nEAS development, preview, and production builds use separate channels and environment variables. Keep signing credentials, service-role keys, and privileged operations outside the client. Sessions use platform SecureStore where authentication is enabled. Only allowlisted custom-scheme routes are accepted.\n\nRuntime compatibility follows the app version; publish updates only after testing the matching native runtime. Request the minimum native permissions and keep store privacy disclosures aligned with actual collection. Verify authentication, deep links, notifications, permissions, updates, and offline behavior on physical iOS and Android devices before release.\n`,
    'tsconfig.json': json({ extends: 'expo/tsconfig.base', compilerOptions: { strict: true, types: ['jest'], paths: { '@/*': ['./*'] } }, include: ['**/*.ts', '**/*.tsx', '.expo/types/**/*.ts', 'expo-env.d.ts'] }),
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
  addTestingFiles(files, '', stack, answers.testing || 'basic')
  Object.assign(files, shared.nativeStatusFeatureFiles(stack))
  return files
}
