const php = (value) => `${value.trim()}\n`

export function buildLaravelArchitectureFiles(stack) {
  if (stack.architecture === 'small') return {}
  const files = {}
  if (stack.architecture === 'large') {
    files['tests/Architecture/BoundariesTest.php'] = php(`<?php

arch('models do not depend on HTTP controllers')
    ->expect('App\\Models')
    ->not->toUse('App\\Http\\Controllers');`)
  }
  return files
}

