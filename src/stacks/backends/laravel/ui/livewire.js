import { buildBladeUiComponents, buildLaravelAuthView, buildLaravelTailwindAssets, laravelLoginNavigation } from './shared.js'

const php = (value) => `${value.trim()}\n`

export const livewireUi = Object.freeze({
  id: 'livewire',
  label: 'Livewire',
  homeRoute: "Route::view('/', 'app');",
  composerPackages: Object.freeze(['livewire/livewire']),
  files(answers, stack) {
    const login = laravelLoginNavigation(stack.authentication)
    return {
      ...buildLaravelTailwindAssets(stack),
      ...buildBladeUiComponents(),
      ...buildLaravelAuthView(stack.authentication),
      'app/Livewire/HomePage.php': php(`<?php

namespace App\\Livewire;

use Illuminate\\View\\View;
use Livewire\\Component;

final class HomePage extends Component
{
    public int $count = 0;

    public function increment(): void
    {
        $this->count++;
    }

    public function render(): View
    {
        return view('livewire.home-page');
    }
}`),
      'resources/views/livewire/home-page.blade.php': `<main><x-layout.section ui="hero" class="min-h-screen"><x-layout.container class="space-y-4"><p class="text-sm font-semibold text-primary">create-win-project</p><h1 class="text-4xl font-bold tracking-tight sm:text-5xl">${answers.projectName}</h1><p>Count: {{ $count }}</p><x-common.button wire:click="increment">Increment</x-common.button></x-layout.container></x-layout.section></main>\n`,
      'resources/views/app.blade.php': `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>{{ config('app.name') }}</title>@vite('resources/css/app.css')@livewireStyles</head><body>${login}<livewire:home-page />@livewireScripts</body></html>\n`,
    }
  },
})
