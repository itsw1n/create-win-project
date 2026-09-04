import { createStackRegistry } from './registry.js'
import { laravelAdapter } from './laravel/index.js'

// This is the only place stack adapters are assembled. Entries stay explicit
// so adding a source file never silently changes supported generator behavior.
export const stackRegistry = createStackRegistry([
  laravelAdapter,
])
