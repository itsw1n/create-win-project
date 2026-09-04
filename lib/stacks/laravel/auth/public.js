const php = (value) => `${value.trim()}\n`

export function buildPublicApiRoutes(authentication) {
  if (authentication === 'public') return php(`<?php

use App\\Http\\Controllers\\HealthController;
use Illuminate\\Support\\Facades\\Route;

Route::get('/health', HealthController::class);`)

  if (authentication === 'undecided') return php(`<?php

use App\\Http\\Controllers\\HealthController;
use Illuminate\\Support\\Facades\\Route;

Route::get('/health', HealthController::class);
Route::fallback(fn () => response()->json(['message' => 'Authentication is not configured.'], 403));`)

  return null
}

export function buildUnauthenticatedWebRoutes(home) {
  return php(`<?php

use Illuminate\\Support\\Facades\\Route;

${home}`)
}
