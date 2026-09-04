const php = (value) => `${value.trim()}\n`

export function buildLaravelArchitectureFiles(stack) {
  if (stack.architecture === 'small') return {}
  const files = {
    'app/Actions/GetSystemStatus.php': php(`<?php

namespace App\\Actions;

final class GetSystemStatus
{
    /** @return array{status: string, architecture: string} */
    public function handle(): array
    {
        return ['status' => 'ok', 'architecture' => '${stack.architecture}'];
    }
}`),
  }
  if (stack.architecture === 'large') {
    files['tests/Architecture/BoundariesTest.php'] = php(`<?php

arch('application does not depend on http adapters')
    ->expect('App\\Actions')
    ->not->toUse('App\\Http');`)
  }
  return files
}

