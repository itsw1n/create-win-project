import { describe, expect, it } from 'vitest'
import { classifyChanges } from '../../checks/classify-changes.js'

describe('compatibility change classifier', () => {
  it('skips generated checks for documentation-only changes', () => {
    expect(classifyChanges(['README.md', 'docs/ARCHITECTURE.md'])).toEqual({ scope: 'none' })
  })

  it('selects one changed stack', () => {
    expect(classifyChanges(['src/stacks/backends/laravel/generate.js'])).toEqual({ scope: 'stack', stack: 'laravel' })
  })

  it('uses full coverage for shared generation and tested versions', () => {
    expect(classifyChanges(['lib/generator.js'])).toEqual({ scope: 'full' })
    expect(classifyChanges(['library/tested-versions.json'])).toEqual({ scope: 'full' })
  })

  it('uses smoke coverage for ordinary or multi-stack changes', () => {
    expect(classifyChanges(['src/cli/display.js'])).toEqual({ scope: 'smoke' })
    expect(classifyChanges(['src/stacks/frontends/nextjs/generate.js', 'src/stacks/frontends/react-vite/generate.js'])).toEqual({ scope: 'smoke' })
  })
})
