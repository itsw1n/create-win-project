import fs from 'fs/promises'
import path from 'path'
import { fileURLToPath } from 'url'
import { describe, expect, it } from 'vitest'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..')

async function read(relativePath) {
  return fs.readFile(path.join(root, relativePath), 'utf8')
}

describe('backend stack architecture contracts', () => {
  it.each(['fastapi', 'springboot', 'laravel'])(
    '%s provides progressive placement and cleanup guidance',
    async (stackId) => {
      const structure = await read(`library/stacks/${stackId}/structure.md`)
      expect(structure).toContain('## Canonical Reference Tree')
      expect(structure).toContain('## Profile Differences')
      expect(structure).toContain('## File Placement')
      expect(structure).toContain('## Architecture Cleanup')
    },
  )

  it('documents paths represented by generated backend projects', async () => {
    const [fastapi, spring, laravel] = await Promise.all([
      read('tests/architecture/fixtures/generated-output/nextjs-fastapi.json'),
      read('tests/architecture/fixtures/generated-output/react-springboot.json'),
      read('tests/architecture/fixtures/generated-output/laravel-inertia-react.json'),
    ]).then((fixtures) => fixtures.map(JSON.parse))

    expect(fastapi).toHaveProperty('backend/app/features/status/router.py')
    expect(fastapi).toHaveProperty('backend/app/features/status/service.py')
    expect(fastapi).toHaveProperty('backend/app/features/status/repository.py')
    expect(spring).toHaveProperty(
      'backend/src/main/java/com/example/system/api/SystemStatusController.java',
    )
    expect(spring).toHaveProperty(
      'backend/src/main/java/com/example/system/service/SystemStatusService.java',
    )
    expect(laravel).toHaveProperty('app/Actions/GetSystemStatus.php')
    expect(laravel).toHaveProperty('app/Http/Controllers/HealthController.php')
  })
})
