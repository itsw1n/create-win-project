import { describe, expect, it } from 'vitest'
import {
  architectureOverview,
  buildSourceTree,
} from '../../src/stacks/shared/architecture-documentation.js'

describe('generated architecture documentation', () => {
  it('builds a stable tree from generated application files only', () => {
    const tree = buildSourceTree([
      'package.json',
      'docs/guides/setup.md',
      'src/app/page.tsx',
      'src/app/globals.css',
      'src/features/status/types.ts',
      'backend/app/main.py',
      'backend/app/features/status/router.py',
      'backend/tests/test_health.py',
    ], 'my-project')

    expect(tree).toMatch(/^my-project\//)
    expect(tree).toContain('├── backend/')
    expect(tree).toContain('└── src/')
    expect(tree).toContain('globals.css')
    expect(tree).toContain('features/status/')
    expect(tree).toContain('test_health.py')
    expect(tree).not.toContain('package.json')
    expect(tree).not.toContain('docs/')
  })

  it('links the selected stack structure playbooks', () => {
    const overview = architectureOverview({
      frontendLabel: 'Next.js',
      backendLabel: 'FastAPI',
      platform: 'web',
      architecture: 'medium',
      authentication: 'oidc',
      playbooks: [
        'stack/nextjs/structure.md',
        'stack/fastapi/structure.md',
        'universal/security.md',
      ],
    }, ['src/app/globals.css', 'backend/app/main.py'])

    expect(overview).toContain('## Generated source map')
    expect(overview).toContain('src/app/')
    expect(overview).toContain('globals.css')
    expect(overview).toContain('playbooks/stack/nextjs/structure.md')
    expect(overview).toContain('playbooks/stack/fastapi/structure.md')
    expect(overview).not.toContain('playbooks/universal/security.md')
    expect(overview).toContain('exact generated source tree')
    expect(overview).toContain('complete reference architecture')
    expect(overview).toContain('ask for approval')
  })
})
