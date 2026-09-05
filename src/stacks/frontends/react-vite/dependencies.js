import { buildJavaScriptPackage } from '../../shared/javascript-package.js'

export function packageFile(answers, stack) {
  return buildJavaScriptPackage(answers, stack, 'react')
}
