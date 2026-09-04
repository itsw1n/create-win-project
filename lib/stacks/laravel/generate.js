import { buildLaravelComposer } from './composer.js'
import { buildLaravelArchitectureFiles } from './architecture.js'
import { buildPublicApiRoutes, buildUnauthenticatedWebRoutes } from './auth/public.js'
import { laravelSessionAuthentication, sessionEnvironment, usesLaravelSession } from './auth/session.js'
import { isSanctumSpa, sanctumSpaAuthentication } from './auth/sanctum.js'
import { isLaravelOidc, laravelOidcAuthentication } from './auth/oidc.js'
import { bladeUi } from './ui/blade.js'
import { livewireUi } from './ui/livewire.js'
import { inertiaReactUi } from './ui/inertia-react.js'

const php = (value) => `${value.trim()}\n`

function authFiles(stack) {
  const loginEnabled = usesLaravelSession(stack.authentication)
  if (isLaravelOidc(stack.authentication)) return {
    'config/auth0.php': php(`<?php

use Auth0\\Laravel\\Configuration;
use Auth0\\SDK\\Configuration\\SdkConfiguration;

return Configuration::VERSION_2 + [
    'registerGuards' => true,
    'registerMiddleware' => true,
    'registerAuthenticationRoutes' => false,
    'configurationPath' => null,
    'guards' => [
        'default' => [
            Configuration::CONFIG_STRATEGY => SdkConfiguration::STRATEGY_NONE,
            Configuration::CONFIG_DOMAIN => Configuration::get(Configuration::CONFIG_DOMAIN),
            Configuration::CONFIG_AUDIENCE => Configuration::get(Configuration::CONFIG_AUDIENCE),
        ],
        'api' => [Configuration::CONFIG_STRATEGY => SdkConfiguration::STRATEGY_API],
    ],
    'routes' => [],
];`),
    'tests/Feature/OidcAuthorizationTest.php': php(`<?php

it('rejects a request without an access token', function () {
    $this->getJson('/api/me')->assertUnauthorized();
});`),
  }
  if (!loginEnabled) return {}
  return {
    'app/Models/User.php': php(`<?php

namespace App\\Models;

use Database\\Factories\\UserFactory;
use Illuminate\\Database\\Eloquent\\Factories\\HasFactory;
use Illuminate\\Foundation\\Auth\\User as Authenticatable;
use Illuminate\\Notifications\\Notifiable;

final class User extends Authenticatable
{
    /** @use HasFactory<UserFactory> */
    use HasFactory, Notifiable;

    protected $fillable = ['name', 'email', 'password'];

    protected $hidden = ['password', 'remember_token'];

    protected function casts(): array
    {
        return ['email_verified_at' => 'datetime', 'password' => 'hashed'];
    }
}`),
    'app/Http/Controllers/AuthController.php': php(`<?php

namespace App\\Http\\Controllers;

use App\\Models\\User;
use Illuminate\\Http\\JsonResponse;
use Illuminate\\Http\\Request;
use Illuminate\\Support\\Facades\\Auth;
use Illuminate\\Validation\\ValidationException;

final class AuthController
{
    public function register(Request $request): JsonResponse
    {
        $data = $request->validate(['name' => ['required', 'string', 'max:100'], 'email' => ['required', 'email', 'max:255', 'unique:users,email'], 'password' => ['required', 'string', 'min:12', 'confirmed']]);
        $user = User::create($data);
        Auth::login($user);
        $request->session()->regenerate();

        return response()->json(['user' => $user->only(['id', 'name', 'email'])], 201);
    }

    public function login(Request $request): JsonResponse
    {
        $credentials = $request->validate(['email' => ['required', 'email'], 'password' => ['required', 'string']]);
        if (! Auth::attempt($credentials)) {
            throw ValidationException::withMessages(['email' => ['The supplied credentials are invalid.']]);
        }
        $request->session()->regenerate();

        return response()->json(['user' => $request->user()->only(['id', 'name', 'email'])]);
    }

    public function logout(Request $request): JsonResponse
    {
        Auth::guard('web')->logout();
        $request->session()->invalidate();
        $request->session()->regenerateToken();

        return response()->json(null, 204);
    }
}`),
    'config/auth.php': php(`<?php

use App\\Models\\User;

return ['defaults' => ['guard' => 'web', 'passwords' => 'users'], 'guards' => ['web' => ['driver' => 'session', 'provider' => 'users']], 'providers' => ['users' => ['driver' => 'eloquent', 'model' => User::class]], 'passwords' => ['users' => ['provider' => 'users', 'table' => 'password_reset_tokens', 'expire' => 60, 'throttle' => 60]], 'password_timeout' => 10800];`),
    'config/session.php': php(`<?php

return ['driver' => env('SESSION_DRIVER', 'database'), 'lifetime' => (int) env('SESSION_LIFETIME', 120), 'expire_on_close' => false, 'encrypt' => true, 'files' => storage_path('framework/sessions'), 'connection' => env('SESSION_CONNECTION'), 'table' => 'sessions', 'store' => env('SESSION_STORE'), 'lottery' => [2, 100], 'cookie' => env('SESSION_COOKIE', 'app_session'), 'path' => '/', 'domain' => env('SESSION_DOMAIN'), 'secure' => env('SESSION_SECURE_COOKIE', true), 'http_only' => true, 'same_site' => env('SESSION_SAME_SITE', 'lax')];`),
    'database/migrations/0001_01_01_000000_create_users_table.php': php(`<?php

use Illuminate\\Database\\Migrations\\Migration;
use Illuminate\\Database\\Schema\\Blueprint;
use Illuminate\\Support\\Facades\\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('users', function (Blueprint $table) {
            $table->id();
            $table->string('name');
            $table->string('email')->unique();
            $table->timestamp('email_verified_at')->nullable();
            $table->string('password');
            $table->rememberToken();
            $table->timestamps();
        });
        Schema::create('password_reset_tokens', function (Blueprint $table) {
            $table->string('email')->primary();
            $table->string('token');
            $table->timestamp('created_at')->nullable();
        });
        Schema::create('sessions', function (Blueprint $table) {
            $table->string('id')->primary();
            $table->foreignId('user_id')->nullable()->index();
            $table->string('ip_address', 45)->nullable();
            $table->text('user_agent')->nullable();
            $table->longText('payload');
            $table->integer('last_activity')->index();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('sessions');
        Schema::dropIfExists('password_reset_tokens');
        Schema::dropIfExists('users');
    }
};`),
    'database/factories/UserFactory.php': php(`<?php

namespace Database\\Factories;

use Illuminate\\Database\\Eloquent\\Factories\\Factory;
use Illuminate\\Support\\Facades\\Hash;
use Illuminate\\Support\\Str;

final class UserFactory extends Factory
{
    public function definition(): array
    {
        return ['name' => fake()->name(), 'email' => fake()->unique()->safeEmail(), 'email_verified_at' => now(), 'password' => Hash::make('a-secure-test-password'), 'remember_token' => Str::random(10)];
    }
}`),
    'tests/Feature/AuthenticationTest.php': php(`<?php

use App\\Models\\User;
use Illuminate\\Foundation\\Testing\\RefreshDatabase;

uses(RefreshDatabase::class);

it('rotates the session after login', function () {
    $user = User::factory()->create(['password' => 'a-secure-test-password']);
    $before = session()->getId();
    $this->postJson('/login', ['email' => $user->email, 'password' => 'a-secure-test-password'])->assertOk();
    expect(session()->getId())->not->toBe($before);
});

it('rejects an unauthenticated protected request', function () {
    $this->getJson('/api/me')->assertUnauthorized();
});

it('invalidates authentication on logout', function () {
    $user = User::factory()->create();
    $this->actingAs($user)->postJson('/logout')->assertNoContent();
    $this->getJson('/api/me')->assertUnauthorized();
});`),
  }
}

function apiRoutes(stack) {
  const publicRoutes = buildPublicApiRoutes(stack.authentication)
  if (publicRoutes) return publicRoutes
  const middleware = isSanctumSpa(stack.authentication)
    ? sanctumSpaAuthentication.apiMiddleware
    : laravelSessionAuthentication.apiMiddleware
  if (usesLaravelSession(stack.authentication)) {
    return php(`<?php

use App\\Http\\Controllers\\HealthController;
use Illuminate\\Http\\Request;
use Illuminate\\Support\\Facades\\Route;

Route::get('/health', HealthController::class);
Route::get('/me', fn (Request $request) => response()->json(['user' => $request->user()->only(['id', 'name', 'email'])]))->middleware('${middleware}');`)
  }
  if (isLaravelOidc(stack.authentication)) return php(`<?php

use Illuminate\\Http\\Request;
use Illuminate\\Support\\Facades\\Auth;
use Illuminate\\Support\\Facades\\Route;

Route::get('/health', fn () => response()->json(['status' => 'ok']));
Auth::shouldUse('${laravelOidcAuthentication.guard}');
Route::get('/me', fn (Request $request) => response()->json(['subject' => $request->user()?->getAuthIdentifier()]))->middleware('${laravelOidcAuthentication.apiMiddleware}');`)
  throw new Error(`Unsupported Laravel authentication model: ${stack.authentication}`)
}

function webRoutes(stack) {
  const home = stack.frontendKey !== 'laravel-ui'
    ? "Route::get('/', fn () => response()->json(['application' => config('app.name')]));"
    : stack.laravelUi === 'inertia-react'
      ? "Route::get('/', fn () => Inertia\\Inertia::render('Home'));"
      : stack.laravelUi === 'livewire'
        ? "Route::view('/', 'app');"
        : "Route::view('/', 'home');"
  if (!usesLaravelSession(stack.authentication)) {
    return buildUnauthenticatedWebRoutes(home)
  }
  return php(`<?php

use App\\Http\\Controllers\\AuthController;
use Illuminate\\Support\\Facades\\Route;

${home}
Route::view('/login', 'auth.login')->middleware('guest')->name('login');
Route::post('/register', [AuthController::class, 'register'])->middleware('throttle:6,1');
Route::post('/login', [AuthController::class, 'login'])->middleware('throttle:6,1');
Route::post('/logout', [AuthController::class, 'logout'])->middleware('auth');`)
}

function uiFiles(answers, stack) {
  if (stack.frontendKey !== 'laravel-ui') return {}
  if (stack.laravelUi === bladeUi.id) return bladeUi.files(answers, stack)
  if (stack.laravelUi === livewireUi.id) return livewireUi.files(answers, stack)
  if (stack.laravelUi === inertiaReactUi.id) return inertiaReactUi.files(answers, stack)
  throw new Error(`Unsupported Laravel UI: ${stack.laravelUi}`)
}

export function buildLaravelFiles(answers, stack) {
  if (stack.backendKey !== 'laravel') return {}
  const root = stack.frontendKey === 'laravel-ui' || stack.frontendKey === 'no-frontend' ? '' : 'backend/'
  const at = (path) => `${root}${path}`
  const files = {
    [at('composer.json')]: buildLaravelComposer(answers, stack),
    [at('artisan')]: php(`#!/usr/bin/env php
<?php

define('LARAVEL_START', microtime(true));
require __DIR__.'/vendor/autoload.php';
$status = (require_once __DIR__.'/bootstrap/app.php')->handleCommand(new Symfony\\Component\\Console\\Input\\ArgvInput);
exit($status);`),
    [at('bootstrap/app.php')]: (() => {
      const middlewareLines = []
      if (isSanctumSpa(stack.authentication)) middlewareLines.push(sanctumSpaAuthentication.middleware)
      if (stack.frontendKey === 'laravel-ui' && stack.laravelUi === 'inertia-react') middlewareLines.push('        $middleware->web(append: [HandleInertiaRequests::class]);')
      const middlewareBlock = middlewareLines.length ? `function (Middleware $middleware): void {\n${middlewareLines.join('\n')}\n    }` : 'function (Middleware $middleware): void {}'
      return php(`<?php

${stack.frontendKey === 'laravel-ui' && stack.laravelUi === 'inertia-react' ? 'use App\\Http\\Middleware\\HandleInertiaRequests;\n' : ''}use Illuminate\\Foundation\\Application;
use Illuminate\\Foundation\\Configuration\\Exceptions;
use Illuminate\\Foundation\\Configuration\\Middleware;

return Application::configure(basePath: dirname(__DIR__))
    ->withRouting(web: __DIR__.'/../routes/web.php', api: __DIR__.'/../routes/api.php', commands: __DIR__.'/../routes/console.php', health: '/up')
    ->withMiddleware(${middlewareBlock})
    ->withExceptions(fn (Exceptions $exceptions) => null)
    ->create();`);
    })(),
    [at('bootstrap/providers.php')]: php(`<?php

use App\\Providers\\AppServiceProvider;

return [AppServiceProvider::class];`),
    [at('public/index.php')]: php(`<?php

use Illuminate\\Http\\Request;

define('LARAVEL_START', microtime(true));
require __DIR__.'/../vendor/autoload.php';
(require_once __DIR__.'/../bootstrap/app.php')->handleRequest(Request::capture());`),
    [at('app/Providers/AppServiceProvider.php')]: php(`<?php

namespace App\\Providers;

use Illuminate\\Support\\ServiceProvider;

final class AppServiceProvider extends ServiceProvider
{
    public function register(): void {}

    public function boot(): void {}
}`),
    [at('app/Http/Controllers/HealthController.php')]: php(`<?php

namespace App\\Http\\Controllers;

${stack.architecture === 'small' ? '' : 'use App\\Actions\\GetSystemStatus;\n'}use Illuminate\\Http\\JsonResponse;

final class HealthController
{
    public function __invoke(): JsonResponse
    {
        ${stack.architecture === 'small' ? "return response()->json(['status' => 'ok']);" : 'return response()->json(app(GetSystemStatus::class)->handle());'}
    }
}`),
    [at('routes/api.php')]: apiRoutes(stack),
    [at('routes/web.php')]: webRoutes(stack),
    [at('routes/console.php')]: php(`<?php

use Illuminate\\Support\\Facades\\Artisan;

Artisan::command('about:starter', fn () => $this->info('Generated by create-win-project'));`),
    [at('config/app.php')]: php(`<?php

return ['name' => env('APP_NAME', '${answers.projectName}'), 'env' => env('APP_ENV', 'production'), 'debug' => (bool) env('APP_DEBUG', false), 'url' => env('APP_URL', 'http://localhost:8000'), 'key' => env('APP_KEY'), 'cipher' => 'AES-256-CBC'];`),
    [at('config/database.php')]: php(`<?php

return ['default' => 'pgsql', 'connections' => ['pgsql' => ['driver' => 'pgsql', 'host' => env('DB_HOST', '127.0.0.1'), 'port' => env('DB_PORT', '5432'), 'database' => env('DB_DATABASE', '${answers.projectName.replaceAll('-', '_')}'), 'username' => env('DB_USERNAME', 'postgres'), 'password' => env('DB_PASSWORD', '')]], 'migrations' => ['table' => 'migrations']];`),
    [at('phpunit.xml')]: `<?xml version="1.0" encoding="UTF-8"?>\n<phpunit bootstrap="vendor/autoload.php" colors="true"><testsuites><testsuite name="Application"><directory>tests</directory></testsuite></testsuites><php><env name="APP_ENV" value="testing"/><env name="APP_KEY" value="base64:AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA="/><env name="SESSION_DRIVER" value="array"/><env name="CACHE_STORE" value="array"/><env name="QUEUE_CONNECTION" value="sync"/></php></phpunit>\n`,
    [at('phpstan.neon')]: `includes:\n  - vendor/larastan/larastan/extension.neon\nparameters:\n  paths:\n    - app\n  level: 6\n`,
    [at('tests/TestCase.php')]: php(`<?php

namespace Tests;

use Illuminate\\Foundation\\Testing\\TestCase as BaseTestCase;

abstract class TestCase extends BaseTestCase {}`),
    [at('tests/Pest.php')]: php(`<?php

use Tests\\TestCase;

pest()->extend(TestCase::class)->in('Feature');`),
    [at('tests/Feature/HealthTest.php')]: php(`<?php

it('reports application health', function () {
    $this->getJson('/api/health')->assertOk()->assertJsonPath('status', 'ok');
});`),
    [at('.env.example')]: `APP_NAME=${answers.projectName}\nAPP_ENV=local\nAPP_KEY=\nAPP_DEBUG=true\nAPP_URL=http://localhost:8000\nDB_CONNECTION=pgsql\nDB_HOST=127.0.0.1\nDB_PORT=5432\nDB_DATABASE=${answers.projectName.replaceAll('-', '_')}\nDB_USERNAME=postgres\nDB_PASSWORD=change-me\n${sessionEnvironment(stack.authentication).map((line) => `${line}\n`).join('')}${isSanctumSpa(stack.authentication) ? sanctumSpaAuthentication.environment.map((line) => `${line}\n`).join('') : ''}${isLaravelOidc(stack.authentication) ? laravelOidcAuthentication.environment.map((line) => `${line}\n`).join('') : ''}`,
    [at('.gitignore')]: `/vendor/\n/node_modules/\n.env\n.phpunit.result.cache\n/public/build/\n/storage/*.key\n`,
    [at('storage/framework/cache/.gitignore')]: "*\n!.gitignore\n",
    [at('storage/framework/sessions/.gitignore')]: "*\n!.gitignore\n",
    [at('storage/framework/views/.gitignore')]: "*\n!.gitignore\n",
    [at('storage/logs/.gitignore')]: "*\n!.gitignore\n",
    [at('bootstrap/cache/.gitignore')]: "*\n!.gitignore\n",
  }
  for (const [path, content] of Object.entries(buildLaravelArchitectureFiles(stack))) files[at(path)] = content
  for (const [path, content] of Object.entries(authFiles(stack))) files[at(path)] = content
  for (const [path, content] of Object.entries(uiFiles(answers, stack))) files[at(path)] = content
  files['README.md'] = `# ${answers.projectName}\n\n> ${answers.projectDescription}\n\n## Start Laravel\n\n\`\`\`bash\n${root ? `cd ${root.slice(0, -1)}\n` : ''}cp .env.example .env\ncomposer install\nphp artisan key:generate\nphp artisan serve\n\`\`\`\n\nHealth: \`GET /api/health\`\n\n## Validate\n\n\`\`\`bash\ncomposer check\n\`\`\`\n`
  return files
}
