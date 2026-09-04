import { bladeUi } from './blade.js'
import { inertiaReactUi } from './inertia-react.js'
import { livewireUi } from './livewire.js'

export const laravelUis = Object.freeze([bladeUi, livewireUi, inertiaReactUi])

export function getLaravelUi(id) {
  const ui = laravelUis.find((candidate) => candidate.id === id)
  if (!ui) throw new Error(`Unsupported Laravel UI: ${id}`)
  return ui
}

export function laravelUiPromptContribution(argument) {
  return {
    slot: 'stack-options',
    questions: [{
      type: 'list',
      name: 'laravelUi',
      message: 'How should Laravel render the website?',
      choices: [
        { name: 'Blade (Recommended) — server-rendered pages with the fewest moving parts', value: bladeUi.id },
        { name: 'Livewire — interactive server-driven components with minimal JavaScript', value: livewireUi.id },
        { name: 'Inertia + React — React pages with Laravel routing and controllers', value: inertiaReactUi.id },
      ],
      default: bladeUi.id,
      when: (answers) => answers.frontend === 'laravel-ui' && !argument,
    }],
  }
}
