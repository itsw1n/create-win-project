const php = (value) => `${value.trim()}\n`

export function buildLaravelArchitectureFiles(stack) {
  if (stack.architecture === 'small') return {}
  const files = {}
  if (stack.architecture === 'large') {
    files['tests/Architecture/BoundariesTest.php'] = php(`<?php

arch('controllers do not depend on Eloquent models')
    ->expect('App\\Http\\Controllers')
    ->not->toUse('App\\Models');`)
  }
  return files
}

