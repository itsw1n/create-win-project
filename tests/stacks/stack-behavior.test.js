import { describe, expect, it } from 'vitest'
import path from 'node:path'
import { loadCatalog, resolveStack } from '../../src/engine/load-library.js'

const root = path.resolve(import.meta.dirname, '..', '..')

const existingStacks = [
  ['fullstack', 'nextjs', 'none', 'web', 'tailwind', 'nextjs', 'frontend'],
  ['fullstack', 'nextjs', 'postgres', 'web', 'tailwind', 'nextjs', 'postgres'],
  ['fullstack', 'nextjs', 'supabase', 'web', 'tailwind', 'nextjs', 'supabase'],
  ['fullstack', 'laravel-ui', 'laravel', 'web', 'tailwind', 'none', 'laravel'],
  ['separate', 'nextjs', 'springboot', 'web', 'tailwind', 'nextjs', 'springboot'],
  ['separate', 'nextjs', 'laravel', 'web', 'tailwind', 'nextjs', 'laravel'],
  ['separate', 'react', 'springboot', 'web', 'tailwind', 'vite', 'springboot'],
  ['separate', 'react', 'laravel', 'web', 'tailwind', 'vite', 'laravel'],
  ['separate', 'react', 'supabase', 'web', 'tailwind', 'vite', 'supabase'],
  ['api', 'no-frontend', 'springboot', 'api', null, 'none', 'springboot'],
  ['api', 'no-frontend', 'laravel', 'api', null, 'none', 'laravel'],
  ['mobile', 'react-native', 'none', 'mobile', 'native-styles', 'expo', null],
  ['mobile', 'react-native', 'supabase', 'mobile', 'native-styles', 'expo', null],
  ['mobile', 'react-native', 'springboot', 'mobile', 'native-styles', 'expo', null],
  ['mobile', 'react-native', 'laravel', 'mobile', 'native-styles', 'expo', null],
  ['frontend', 'react', 'none', 'web', 'tailwind', 'vite', 'frontend'],
]

describe('existing resolved stack behavior', () => {
  it.each(existingStacks)(
    'preserves %s: %s + %s',
    async (applicationShape, frontend, backend, platform, styleId, ciTemplate, makefileTemplate) => {
      const catalog = await loadCatalog(path.join(root, 'library'))
      const stack = resolveStack({ frontend, backend, applicationShape }, catalog)

      expect(stack).toMatchObject({
        key: `${frontend}-${backend}`,
        frontendKey: frontend,
        backendKey: backend,
        platform,
        styleId,
        ciTemplate,
        makefileTemplate,
        architecture: 'medium',
        supportedArchitectures: ['small', 'medium', 'large'],
      })
    },
  )
})
