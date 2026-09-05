import path from 'node:path'

export function isInsideDirectory(candidate, parent) {
  const relative = path.relative(path.resolve(parent), path.resolve(candidate))
  return relative === '' || (!relative.startsWith('..') && !path.isAbsolute(relative))
}

export function projectLocationNotice({ cwd, cliRoot, projectName }) {
  if (!isInsideDirectory(cwd, cliRoot)) return null

  const generatedPath = path.join(path.resolve(cwd), projectName)
  const suggestedPath = path.join(path.dirname(path.resolve(cliRoot)), projectName)
  return {
    generatedPath,
    suggestedPath,
    message: `This project was created inside the create-win-project repository. Move or cut the generated folder to your normal projects folder outside this repository before you start committing application work.`,
  }
}
