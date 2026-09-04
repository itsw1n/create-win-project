import { buildLaravelAuthView, laravelLoginNavigation } from './shared.js'

const php = (value) => `${value.trim()}\n`

export const livewireUi = Object.freeze({
  id: 'livewire',
  label: 'Livewire',
  homeRoute: "Route::view('/', 'app');",
  composerPackages: Object.freeze(['livewire/livewire']),
  files(answers, stack) {
    const login = laravelLoginNavigation(stack.authentication)
    return {
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
      'resources/views/livewire/home-page.blade.php': `<main><h1>${answers.projectName}</h1><p>Count: {{ $count }}</p><button wire:click="increment">Increment</button></main>\n`,
      'resources/views/app.blade.php': `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>{{ config('app.name') }}</title>@livewireStyles</head><body>${login}<livewire:home-page />@livewireScripts</body></html>\n`,
    }
  },
})
