import chalk from 'chalk'

const W1N = [
  ' ██╗    ██╗  ██╗ ███╗  ██╗',
  ' ██║    ██║ ███║ ████╗ ██║',
  ' ██║ █╗ ██║ ╚██║ ██╔██╗██║',
  ' ██║███╗██║  ██║ ██║╚████║',
  ' ╚███╔███╔╝  ██║ ██║ ╚███║',
  '  ╚══╝╚══╝   ╚═╝ ╚═╝  ╚══╝',
]

const PROJECT = [
  ' █▀█ █▀█ █▀█   █ █▀▀ █▀▀ ▀█▀',
  ' █▀▀ █▀█ █ █   █ █▀  █    █ ',
  ' █   █ █ █▄█ █▄█ █▄▄ █▄▄  █ ',
]

function plain() {
  return [...W1N, '', ...PROJECT].join('\n')
}

function colored() {
  const w1n = W1N.map((l) => chalk.bold.cyan(l)).join('\n')
  const proj = PROJECT.map((l) => chalk.bold.white(l)).join('\n')
  return `${w1n}\n${proj}`
}

export function w1nBanner() {
  const noColor = process.env.NO_COLOR !== undefined || process.env.FORCE_COLOR === '0'
  const isTTY = process.stdout.isTTY
  const width = process.stdout.columns || 80

  // Fallback for narrow terminals or non-TTY (CI/logs): plain single-line wordmark
  if (!isTTY || width < 80 || noColor) {
    // Keep stacked plain for README consistency, but without colors
    if (width < 60) return 'W1N PROJECT'
    return plain()
  }

  return colored()
}

export const bannerRaw = plain()
export const W1N_ART = W1N.join('\n')
export const PROJECT_ART = PROJECT.join('\n')
