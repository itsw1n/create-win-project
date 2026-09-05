import { APPLICATION_SHAPES } from '../engine/project-shapes.js'
import { laravelUis } from '../stacks/backends/laravel/ui/index.js'

function option(args, name) {
  return args.find((argument) => argument.startsWith(`--${name}=`))?.split('=')[1]
}

export function parseArguments(args) {
  const profile = option(args, 'profile')
  const shape = option(args, 'shape')
  const frontendValue = option(args, 'frontend')
  const frontendAliases = { vite: 'react', expo: 'react-native', none: 'no-frontend' }
  const frontend = frontendAliases[frontendValue] || frontendValue
  const backend = option(args, 'backend')
  const architecture = option(args, 'architecture')
  const authentication = option(args, 'authentication')
  const authAudience = option(args, 'auth-audience')
  const laravelUi = option(args, 'laravel-ui')
  const install = args.includes('--install')
  const noInstall = args.includes('--no-install')

  if (shape && !APPLICATION_SHAPES[shape]) {
    throw new Error('--shape must be fullstack, separate, api, mobile, or frontend')
  }
  if (architecture && !['small', 'medium', 'large'].includes(architecture)) {
    throw new Error('--architecture must be small, medium, or large')
  }
  if (authentication && !['yes', 'not-yet', 'none'].includes(authentication)) {
    throw new Error('--authentication must be yes, not-yet, or none')
  }
  if (authAudience && !['website', 'multi-client'].includes(authAudience)) {
    throw new Error('--auth-audience must be website or multi-client')
  }
  if (laravelUi && !laravelUis.some((ui) => ui.id === laravelUi)) {
    throw new Error('--laravel-ui must be blade, livewire, or inertia-react')
  }
  if (install && noInstall) throw new Error('Use either --install or --no-install, not both')

  return Object.freeze({
    profile,
    shape,
    frontend,
    backend,
    architecture,
    authentication,
    authAudience,
    laravelUi,
    install,
    noInstall,
    doctor: args[0] === 'doctor' || args.includes('--doctor'),
  })
}
