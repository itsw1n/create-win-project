import { composerPackageVersion } from '../../compatibility.js'
import { usesLaravelSession } from './auth/session.js'
import { isSanctumSpa, sanctumSpaAuthentication } from './auth/sanctum.js'

export function buildLaravelComposer(answers, stack) {
  const version = (name) => composerPackageVersion(stack.profile, name, 'laravel scaffold')
  const require = {
    php: stack.profile.runtimes.php,
    'laravel/framework': version('laravel/framework'),
  }
  if (isSanctumSpa(stack.authentication)) {
    require[sanctumSpaAuthentication.composerPackage] = version(sanctumSpaAuthentication.composerPackage)
  }
  if (stack.authentication === 'laravel-oidc') require['auth0/login'] = version('auth0/login')
  if (stack.frontendKey === 'laravel-ui' && stack.laravelUi === 'livewire') require['livewire/livewire'] = version('livewire/livewire')
  if (stack.frontendKey === 'laravel-ui' && stack.laravelUi === 'inertia-react') require['inertiajs/inertia-laravel'] = version('inertiajs/inertia-laravel')
  const requireDev = {
    'laravel/pint': version('laravel/pint'),
    'larastan/larastan': version('larastan/larastan'),
    'mockery/mockery': version('mockery/mockery'),
    'pestphp/pest': version('pestphp/pest'),
    'pestphp/pest-plugin-laravel': version('pestphp/pest-plugin-laravel'),
  }
  if (usesLaravelSession(stack.authentication)) requireDev['fakerphp/faker'] = version('fakerphp/faker')
  return `${JSON.stringify({
    name: `app/${answers.projectName}`,
    type: 'project',
    description: answers.projectDescription,
    require,
    'require-dev': requireDev,
    autoload: { 'psr-4': { 'App\\': 'app/', 'Database\\Factories\\': 'database/factories/', 'Database\\Seeders\\': 'database/seeders/' } },
    'autoload-dev': { 'psr-4': { 'Tests\\': 'tests/' } },
    scripts: {
      'post-autoload-dump': ['Illuminate\\Foundation\\ComposerScripts::postAutoloadDump', '@php artisan package:discover --ansi'],
      test: 'php artisan test',
      format: 'pint',
      'format:check': 'pint --test',
      analyse: 'phpstan analyse --memory-limit=1G',
      check: ['@format:check', '@analyse', '@test'],
    },
    config: { 'optimize-autoloader': true, 'preferred-install': 'dist', 'sort-packages': true, 'allow-plugins': { 'pestphp/pest-plugin': true } },
    'minimum-stability': 'stable',
    'prefer-stable': true,
  }, null, 2)}\n`
}
