import { describe, expect, it } from 'vitest'
import path from 'node:path'
import { composerPackageVersion, loadCompatibility, resolvePackages, validateCompatibility } from '../../lib/compatibility.js'
import { loadCatalog, resolveStack } from '../../lib/catalog.js'

const root = path.resolve(import.meta.dirname, '..', '..')
const profilesFile = path.join(root, 'library/tested-versions.json')

describe('compatibility profiles', () => {
  it('loads current by default and previous explicitly', async () => {
    const current = await loadCompatibility(profilesFile)
    const previous = await loadCompatibility(profilesFile, '2026.08')
    expect(current.profile.id).toBe(current.catalog.defaultProfile)
    expect(current.profile.status).toBe('current')
    expect(previous.profile.status).toBe('previous')
  })

  it('rejects ranges and unknown package references', async () => {
    const { catalog, profile } = await loadCompatibility(profilesFile)
    const invalid = structuredClone(catalog)
    invalid.profiles[invalid.defaultProfile].packages.next = '^16.3.4'
    expect(() => validateCompatibility(invalid)).toThrow(/exact versions/)
    const invalidComposer = structuredClone(catalog)
    invalidComposer.profiles[invalidComposer.defaultProfile].composerPackages['laravel/framework'] = '^13.0'
    expect(() => validateCompatibility(invalidComposer)).toThrow(/Composer package.*exact version/)
    expect(() => resolvePackages(['not-a-real-package'], profile, 'fixture.deps')).toThrow(/missing/)
  })

  it('supports capability-specific versions without duplicate ownership', async () => {
    const { profile } = await loadCompatibility(profilesFile)
    expect(resolvePackages(['react'], profile, 'nextjs.deps').react).toBe('19.2.8')
    expect(resolvePackages(['react'], profile, 'react-native.deps').react).toBe('19.2.3')
    expect(composerPackageVersion(profile, 'laravel/framework')).toMatch(/^\d+\.\d+\.\d+$/)
  })

  it('resolves every direct dependency to an exact profile version', async () => {
    const { profile } = await loadCompatibility(profilesFile)
    const catalog = await loadCatalog(path.join(root, 'library'), profile)
    const stacks = [
      ['nextjs', 'supabase', 'tailwind'], ['nextjs', 'springboot', 'css-modules'],
      ['nextjs', 'postgres', 'tailwind'], ['react', 'supabase', 'tailwind'],
      ['react', 'springboot', 'css-modules'], ['react-native', 'supabase'],
      ['react-native', 'springboot'], ['react-native', 'none'],
    ]
    for (const [frontend, backend, styling] of stacks) {
      const stack = resolveStack({ frontend, backend, styling }, catalog)
      for (const version of [...Object.values(stack.deps), ...Object.values(stack.devDeps)]) {
        expect(version).toMatch(/^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?$/)
      }
    }
  })
})
