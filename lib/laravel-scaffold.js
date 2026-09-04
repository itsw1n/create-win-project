import { composerPackageVersion } from './compatibility.js'

const php = (value) => `${value.trim()}\n`
const json = (value) => `${JSON.stringify(value, null, 2)}\n`

function composerFile(answers, stack) {
  const version = (name) => composerPackageVersion(stack.profile, name, 'laravel scaffold')
  const require = {
    php: stack.profile.runtimes.php,
    'laravel/framework': version('laravel/framework'),
  }
  if (stack.authentication === 'sanctum-spa') require['laravel/sanctum'] = version('laravel/sanctum')
  return json({
    name: `app/${answers.projectName}`,
    type: 'project',
    description: answers.projectDescription,
    require,
    'require-dev': {
      'laravel/pint': version('laravel/pint'),
      'larastan/larastan': version('larastan/larastan'),
      'pestphp/pest': version('pestphp/pest'),
      'pestphp/pest-plugin-laravel': version('pestphp/pest-plugin-laravel'),
    },
    autoload: { 'psr-4': { 'App\\': 'app/', 'Database\\Factories\\': 'database/factories/', 'Database\\Seeders\\': 'database/seeders/' } },
    'autoload-dev': { 'psr-4': { 'Tests\\': 'tests/' } },
    scripts: {
      test: 'php artisan test',
      format: 'pint',
      'format:check': 'pint --test',
      analyse: 'phpstan analyse --memory-limit=1G',
      check: ['@format:check', '@analyse', '@test'],
    },
    config: { 'optimize-autoloader': true, 'preferred-install': 'dist', 'sort-packages': true, 'allow-plugins': { 'pestphp/pest-plugin': true } },
    'minimum-stability': 'stable',
    'prefer-stable': true,
  })
}

function architectureFiles(stack) {
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

function authFiles(stack) {
  const loginEnabled = ['laravel-session', 'sanctum-spa'].includes(stack.authentication)
  if (!loginEnabled) return {}
  return {
    'app/Models/User.php': php(`<?php

namespace App\\Models;

use Illuminate\\Database\\Eloquent\\Factories\\HasFactory;
use Illuminate\\Foundation\\Auth\\User as Authenticatable;
use Illuminate\\Notifications\\Notifiable;

final class User extends Authenticatable
{
    use HasFactory, Notifiable;

    protected $fillable = ['name', 'email', 'password'];
    protected $hidden = ['password', 'remember_token'];
    protected function casts(): array { return ['email_verified_at' => 'datetime', 'password' => 'hashed']; }
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
        if (! Auth::attempt($credentials)) throw ValidationException::withMessages(['email' => ['The supplied credentials are invalid.']]);
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

return ['defaults' => ['guard' => 'web', 'passwords' => 'users'], 'guards' => ['web' => ['driver' => 'session', 'provider' => 'users']], 'providers' => ['users' => ['driver' => 'eloquent', 'model' => App\\Models\\User::class]], 'passwords' => ['users' => ['provider' => 'users', 'table' => 'password_reset_tokens', 'expire' => 60, 'throttle' => 60]], 'password_timeout' => 10800];`),
    'config/session.php': php(`<?php

return ['driver' => env('SESSION_DRIVER', 'database'), 'lifetime' => (int) env('SESSION_LIFETIME', 120), 'expire_on_close' => false, 'encrypt' => true, 'files' => storage_path('framework/sessions'), 'connection' => env('SESSION_CONNECTION'), 'table' => 'sessions', 'store' => env('SESSION_STORE'), 'lottery' => [2, 100], 'cookie' => env('SESSION_COOKIE', 'app_session'), 'path' => '/', 'domain' => env('SESSION_DOMAIN'), 'secure' => env('SESSION_SECURE_COOKIE', true), 'http_only' => true, 'same_site' => env('SESSION_SAME_SITE', 'lax')];`),
    'database/migrations/0001_01_01_000000_create_users_table.php': php(`<?php

use Illuminate\\Database\\Migrations\\Migration;
use Illuminate\\Database\\Schema\\Blueprint;
use Illuminate\\Support\\Facades\\Schema;

return new class extends Migration {
    public function up(): void {
        Schema::create('users', function (Blueprint $table) { $table->id(); $table->string('name'); $table->string('email')->unique(); $table->timestamp('email_verified_at')->nullable(); $table->string('password'); $table->rememberToken(); $table->timestamps(); });
        Schema::create('password_reset_tokens', function (Blueprint $table) { $table->string('email')->primary(); $table->string('token'); $table->timestamp('created_at')->nullable(); });
        Schema::create('sessions', function (Blueprint $table) { $table->string('id')->primary(); $table->foreignId('user_id')->nullable()->index(); $table->string('ip_address', 45)->nullable(); $table->text('user_agent')->nullable(); $table->longText('payload'); $table->integer('last_activity')->index(); });
    }
    public function down(): void { Schema::dropIfExists('sessions'); Schema::dropIfExists('password_reset_tokens'); Schema::dropIfExists('users'); }
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
  const middleware = stack.authentication === 'sanctum-spa' ? 'auth:sanctum' : 'auth'
  if (['laravel-session', 'sanctum-spa'].includes(stack.authentication)) {
    return php(`<?php

use App\\Http\\Controllers\\HealthController;
use Illuminate\\Http\\Request;
use Illuminate\\Support\\Facades\\Route;

Route::get('/health', HealthController::class);
Route::get('/me', fn (Request $request) => response()->json(['user' => $request->user()->only(['id', 'name', 'email'])]))->middleware('${middleware}');`)
  }
  if (stack.authentication === 'public') return php(`<?php

use App\\Http\\Controllers\\HealthController;
use Illuminate\\Support\\Facades\\Route;

Route::get('/health', HealthController::class);`)
  return php(`<?php

use App\\Http\\Controllers\\HealthController;
use Illuminate\\Support\\Facades\\Route;

Route::get('/health', HealthController::class);
Route::fallback(fn () => response()->json(['message' => 'Authentication is not configured.'], 403));`)
}

function webRoutes(stack) {
  if (!['laravel-session', 'sanctum-spa'].includes(stack.authentication)) {
    return php(`<?php

use Illuminate\\Support\\Facades\\Route;

Route::get('/', fn () => response()->json(['application' => config('app.name')]));`)
  }
  return php(`<?php

use App\\Http\\Controllers\\AuthController;
use Illuminate\\Support\\Facades\\Route;

Route::post('/register', [AuthController::class, 'register'])->middleware('throttle:6,1');
Route::post('/login', [AuthController::class, 'login'])->middleware('throttle:6,1');
Route::post('/logout', [AuthController::class, 'logout'])->middleware('auth');`)
}

export function buildLaravelFiles(answers, stack) {
  if (stack.backendKey !== 'laravel') return {}
  const root = stack.frontendKey === 'laravel-ui' || stack.frontendKey === 'no-frontend' ? '' : 'backend/'
  const at = (path) => `${root}${path}`
  const files = {
    [at('composer.json')]: composerFile(answers, stack),
    [at('artisan')]: php(`#!/usr/bin/env php
<?php

define('LARAVEL_START', microtime(true));
require __DIR__.'/vendor/autoload.php';
$status = (require_once __DIR__.'/bootstrap/app.php')->handleCommand(new Symfony\\Component\\Console\\Input\\ArgvInput);
exit($status);`),
    [at('bootstrap/app.php')]: php(`<?php

use Illuminate\\Foundation\\Application;
use Illuminate\\Foundation\\Configuration\\Exceptions;
use Illuminate\\Foundation\\Configuration\\Middleware;

return Application::configure(basePath: dirname(__DIR__))
    ->withRouting(web: __DIR__.'/../routes/web.php', api: __DIR__.'/../routes/api.php', commands: __DIR__.'/../routes/console.php', health: '/up')
    ->withMiddleware(function (Middleware $middleware): void {${stack.authentication === 'sanctum-spa' ? '\n        $middleware->statefulApi();' : ''}
    })
    ->withExceptions(fn (Exceptions $exceptions) => null)
    ->create();`),
    [at('bootstrap/providers.php')]: php(`<?php

return [App\\Providers\\AppServiceProvider::class];`),
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

use App\\Actions\\GetSystemStatus;
use Illuminate\\Http\\JsonResponse;

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
    [at('phpunit.xml')]: `<?xml version="1.0" encoding="UTF-8"?>\n<phpunit bootstrap="vendor/autoload.php" colors="true"><testsuites><testsuite name="Application"><directory>tests</directory></testsuite></testsuites><php><env name="APP_ENV" value="testing"/><env name="APP_KEY" value="base64:AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA="/></php></phpunit>\n`,
    [at('phpstan.neon')]: `includes:\n  - vendor/larastan/larastan/extension.neon\nparameters:\n  paths:\n    - app\n  level: 6\n`,
    [at('tests/TestCase.php')]: php(`<?php

namespace Tests;

use Illuminate\\Foundation\\Testing\\TestCase as BaseTestCase;

abstract class TestCase extends BaseTestCase {}`),
    [at('tests/Pest.php')]: php(`<?php

pest()->extend(Tests\\TestCase::class)->in('Feature');`),
    [at('tests/Feature/HealthTest.php')]: php(`<?php

it('reports application health', function () {
    $this->getJson('/api/health')->assertOk()->assertJsonPath('status', 'ok');
});`),
    [at('.env.example')]: `APP_NAME=${answers.projectName}\nAPP_ENV=local\nAPP_KEY=\nAPP_DEBUG=true\nAPP_URL=http://localhost:8000\nDB_CONNECTION=pgsql\nDB_HOST=127.0.0.1\nDB_PORT=5432\nDB_DATABASE=${answers.projectName.replaceAll('-', '_')}\nDB_USERNAME=postgres\nDB_PASSWORD=change-me\n${['laravel-session', 'sanctum-spa'].includes(stack.authentication) ? 'SESSION_DRIVER=database\nSESSION_DOMAIN=localhost\nSESSION_SECURE_COOKIE=false\n' : ''}${stack.authentication === 'sanctum-spa' ? 'SANCTUM_STATEFUL_DOMAINS=localhost:5173\nCORS_ALLOWED_ORIGINS=http://localhost:5173\n' : ''}${stack.authentication === 'laravel-oidc' ? 'OIDC_ISSUER_URI=\nOIDC_AUDIENCE=\n' : ''}`,
    [at('.gitignore')]: `/vendor/\n/node_modules/\n.env\n.phpunit.result.cache\n/public/build/\n/storage/*.key\n`,
    [at('storage/framework/cache/.gitignore')]: "*\n!.gitignore\n",
    [at('storage/framework/sessions/.gitignore')]: "*\n!.gitignore\n",
    [at('storage/framework/views/.gitignore')]: "*\n!.gitignore\n",
    [at('storage/logs/.gitignore')]: "*\n!.gitignore\n",
  }
  for (const [path, content] of Object.entries(architectureFiles(stack))) files[at(path)] = content
  for (const [path, content] of Object.entries(authFiles(stack))) files[at(path)] = content
  files['README.md'] = `# ${answers.projectName}\n\n> ${answers.projectDescription}\n\n## Start Laravel\n\n\`\`\`bash\n${root ? `cd ${root.slice(0, -1)}\n` : ''}cp .env.example .env\ncomposer install\nphp artisan key:generate\nphp artisan serve\n\`\`\`\n\nHealth: \`GET /api/health\`\n\n## Validate\n\n\`\`\`bash\ncomposer check\n\`\`\`\n`
  return files
}
