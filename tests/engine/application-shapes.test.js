import { describe, expect, it } from 'vitest'
import {
  applicationShapeChoices,
  combinationsForShape,
  inferApplicationShape,
  validateApplicationShape,
  frontendChoicesForShape,
  backendChoicesForShape,
} from '../../lib/application-shapes.js'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { loadCatalog } from '../../lib/catalog.js'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..')

describe('application shapes', () => {
  it('shows full-stack first with beginner-readable examples', () => {
    const choices = applicationShapeChoices()
    expect(choices[0].value).toBe('fullstack')
    expect(choices[0].name).toContain('Next.js or Laravel')
    expect(choices.find((choice) => choice.value === 'separate').name).toContain('React/Vite + Spring Boot')
  })

  it('keeps existing standalone Vite and Expo combinations', () => {
    expect(combinationsForShape('frontend')).toContainEqual({ frontend: 'react', backend: 'none' })
    expect(combinationsForShape('mobile')).toContainEqual({ frontend: 'react-native', backend: 'none' })
  })

  it('infers unambiguous legacy combinations', () => {
    expect(inferApplicationShape({ frontend: 'nextjs', backend: 'postgres' })).toBe('fullstack')
    expect(inferApplicationShape({ frontend: 'react', backend: 'springboot' })).toBe('separate')
    expect(inferApplicationShape({ frontend: 'react-native', backend: 'supabase' })).toBe('mobile')
  })

  it('rejects a combination outside its declared shape', () => {
    expect(() => validateApplicationShape('frontend', 'nextjs', 'springboot')).toThrow(/not valid/)
  })

  it('filters framework and backend choices by shape', async () => {
    const catalog = await loadCatalog(path.join(root, 'library'))
    expect(frontendChoicesForShape('fullstack', catalog).map((choice) => choice.value)).toEqual(['nextjs', 'laravel-ui'])
    expect(backendChoicesForShape('fullstack', 'nextjs', catalog).map((choice) => choice.value))
      .toEqual(['none', 'postgres', 'supabase'])
    expect(frontendChoicesForShape('mobile', catalog).map((choice) => choice.value)).toEqual(['react-native'])
    expect(frontendChoicesForShape('api', catalog).map((choice) => choice.value)).toEqual(['no-frontend'])
    expect(backendChoicesForShape('api', 'no-frontend', catalog).map((choice) => choice.value)).toEqual(['springboot', 'laravel'])
  })
})
