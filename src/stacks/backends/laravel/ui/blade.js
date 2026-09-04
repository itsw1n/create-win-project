import { buildLaravelAuthView, laravelLoginNavigation } from './shared.js'

export const bladeUi = Object.freeze({
  id: 'blade',
  label: 'Blade',
  homeRoute: "Route::view('/', 'home');",
  composerPackages: Object.freeze([]),
  files(answers, stack) {
    const login = laravelLoginNavigation(stack.authentication)
    return {
      ...buildLaravelAuthView(stack.authentication),
      'resources/views/home.blade.php': `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>{{ config('app.name') }}</title></head><body>${login}<main><h1>${answers.projectName}</h1><p>Laravel Blade starter</p></main></body></html>\n`,
    }
  },
})

