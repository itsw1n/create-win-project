import { scaffoldProject } from '../stacks/shared/scaffold.js'

/**
 * Runs the generic project-creation pipeline. Stack-owned contributions are
 * composed behind the shared stack boundary and are migrated into their
 * individual adapters in the following phases.
 */
export async function generateProject(answers, cliRoot) {
  return scaffoldProject(answers, cliRoot)
}
