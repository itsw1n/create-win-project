// Transitional entry point. Phase 3 will move CLI orchestration here while
// root index.js remains the stable executable.
export async function runCli() {
  return import('../../index.js')
}
