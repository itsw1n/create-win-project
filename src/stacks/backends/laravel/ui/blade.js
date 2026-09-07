import { buildBladeUiComponents, buildLaravelAuthView, buildLaravelTailwindAssets, laravelLoginNavigation } from './shared.js'

export const bladeUi = Object.freeze({
  id: 'blade',
  label: 'Blade',
  homeRoute: "Route::view('/', 'home');",
  composerPackages: Object.freeze([]),
  files(answers, stack) {
    const login = laravelLoginNavigation(stack.authentication)
    return {
      ...buildLaravelTailwindAssets(stack),
      ...buildBladeUiComponents(),
      ...buildLaravelAuthView(stack.authentication),
      'resources/views/home.blade.php': `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>{{ config('app.name') }}</title>@vite('resources/css/app.css')</head><body>${login}<main><x-layout.section ui="hero" class="min-h-screen"><x-layout.container class="space-y-4"><p class="text-sm font-semibold text-primary">create-win-project</p><h1 class="text-4xl font-bold tracking-tight sm:text-5xl">${answers.projectName}</h1><p class="max-w-2xl leading-7">Laravel Blade starter</p></x-layout.container></x-layout.section></main></body></html>\n`,
    }
  },
})
