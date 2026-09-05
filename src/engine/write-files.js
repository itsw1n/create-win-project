import fs from 'fs-extra'
import path from 'node:path'
import { randomUUID } from 'node:crypto'

export async function projectDestinations(cwd, projectName) {
  const finalDestination = path.join(cwd, projectName)
  if (await fs.pathExists(finalDestination)) {
    throw new Error(`Destination already exists: ${finalDestination}`)
  }
  return {
    finalDestination,
    stagingDestination: path.join(cwd, `.${projectName}.tmp-${randomUUID()}`),
  }
}

export async function writeProjectAtomically({ finalDestination, stagingDestination, generate }) {
  try {
    await fs.ensureDir(stagingDestination)
    await generate(stagingDestination)
    await fs.move(stagingDestination, finalDestination, { overwrite: false })
  } catch (error) {
    await fs.remove(stagingDestination)
    throw error
  }
}

export async function writeFile(destination, filePath, content) {
  const fullPath = path.join(destination, filePath)
  await fs.ensureDir(path.dirname(fullPath))
  await fs.writeFile(fullPath, content, 'utf8')
}

// Generated documentation/file-content builders remain compatible during the migration.
export * from './project-files.js'
