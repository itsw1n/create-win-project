function version(profile, name, capability) {
  const configured = profile.packages[name]
  const resolved = typeof configured === 'string'
    ? configured
    : configured?.overrides?.[capability] || configured?.default
  if (!resolved) throw new Error(`${capability} requires ${name} in compatibility profile ${profile.id}`)
  return resolved
}

export function json(value) {
  return `${JSON.stringify(value, null, 2)}\n`
}

export function html(value) {
  return String(value).replaceAll('&', '&amp;').replaceAll('"', '&quot;').replaceAll('<', '&lt;').replaceAll('>', '&gt;')
}

export function buildJavaScriptPackage(answers, stack, owner) {
  const level = answers.testing || 'basic'
  const scripts = { ...stack.scripts, start: owner === 'nextjs' ? 'next start' : undefined }
  const devDependencies = { ...stack.devDeps }

  if (level === 'none') delete scripts.test
  if (level !== 'none') {
    if (owner === 'react-native') {
      Object.assign(devDependencies, {
        jest: version(stack.profile, 'jest', owner),
        '@types/jest': version(stack.profile, '@types/jest', owner),
        'jest-expo': version(stack.profile, 'jest-expo', owner),
        '@testing-library/react-native': version(stack.profile, '@testing-library/react-native', owner),
      })
    } else {
      Object.assign(devDependencies, {
        vitest: version(stack.profile, 'vitest', owner),
        jsdom: version(stack.profile, 'jsdom', owner),
        '@testing-library/react': version(stack.profile, '@testing-library/react', owner),
        '@testing-library/jest-dom': version(stack.profile, '@testing-library/jest-dom', owner),
      })
    }
  }
  if (level === 'full' && owner !== 'react-native') {
    scripts['test:e2e'] = 'playwright test'
    devDependencies['@playwright/test'] = version(stack.profile, '@playwright/test', owner)
  }

  scripts.typecheck = 'tsc --noEmit'
  scripts.format = 'prettier --write .'
  scripts['format:check'] = 'prettier --check .'
  if (owner !== 'react-native') scripts.lint = 'eslint .'
  if (stack.architecture === 'large') scripts['check:boundaries'] = 'node scripts/check-boundaries.mjs'
  if (stack.backendKey === 'supabase') {
    const workdir = owner === 'react' ? ' --workdir ..' : ''
    scripts['supabase:start'] = `supabase${workdir} start`
    scripts['supabase:stop'] = `supabase${workdir} stop`
    scripts['supabase:status'] = `supabase${workdir} status`
    scripts['supabase:reset'] = `supabase${workdir} db reset`
    scripts['supabase:test'] = `supabase${workdir} test db`
    const typePath = owner === 'react-native' ? 'types/database.types.ts' : 'src/types/database.types.ts'
    scripts['supabase:types'] = `supabase${workdir} gen types typescript --local > ${typePath}`
  }
  if (stack.backendKey === 'postgres') {
    scripts['db:generate'] = 'prisma generate'
    scripts['db:migrate'] = 'prisma migrate dev'
    scripts['db:deploy'] = 'prisma migrate deploy'
    scripts['db:studio'] = 'prisma studio'
  }
  const boundary = stack.architecture === 'large' ? ' && npm run check:boundaries' : ''
  scripts.check = owner === 'react-native'
    ? `npm run format:check && npm run typecheck${level === 'none' ? '' : ' && npm test -- --runInBand'}${boundary}`
    : `npm run format:check && npm run lint && npm run typecheck${level === 'none' ? '' : ' && npm test'}${boundary}`
  Object.keys(scripts).forEach((key) => scripts[key] === undefined && delete scripts[key])

  if (stack.styleId === 'tailwind') {
    devDependencies.tailwindcss = version(stack.profile, 'tailwindcss', owner)
    if (owner === 'nextjs') devDependencies['@tailwindcss/postcss'] = version(stack.profile, '@tailwindcss/postcss', owner)
    if (owner === 'react') devDependencies['@tailwindcss/vite'] = version(stack.profile, '@tailwindcss/vite', owner)
  }
  const dependencies = { ...stack.deps }
  if (owner !== 'nextjs') delete dependencies['@supabase/ssr']
  if (owner === 'react-native' && stack.authentication === 'supabase') {
    dependencies['expo-secure-store'] = version(stack.profile, 'expo-secure-store', owner)
  }

  const packageJson = {
    name: answers.projectName,
    version: '0.1.0',
    private: true,
    type: 'module',
    packageManager: `npm@${stack.profile.runtimes.npmMinimum}`,
    engines: {
      node: `>=${stack.profile.runtimes.nodeMinimum}`,
      npm: `>=${stack.profile.runtimes.npmMinimum}`,
    },
    main: owner === 'react-native' ? 'expo-router/entry' : undefined,
    scripts,
    dependencies,
    devDependencies,
  }
  if (!packageJson.main) delete packageJson.main
  return json(packageJson)
}
