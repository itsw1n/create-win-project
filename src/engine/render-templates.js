import { render } from '../../lib/template.js'
import { writeFile } from './write-files.js'

export * from '../../lib/template.js'

export async function writeRenderedFile(destination, filePath, content, variables) {
  await writeFile(destination, filePath, render(content, variables))
}
