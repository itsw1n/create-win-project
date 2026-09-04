import { createStackRegistry } from './registry.js'
import { laravelAdapter } from './laravel/index.js'
import { nextjsAdapter } from './nextjs/index.js'
import { reactViteAdapter } from './react-vite/index.js'
import { reactNativeAdapter } from './react-native/index.js'
import { springbootAdapter } from './springboot/index.js'

// This is the only place stack adapters are assembled. Entries stay explicit
// so adding a source file never silently changes supported generator behavior.
export const stackRegistry = createStackRegistry([
  nextjsAdapter,
  reactViteAdapter,
  reactNativeAdapter,
  springbootAdapter,
  laravelAdapter,
])
