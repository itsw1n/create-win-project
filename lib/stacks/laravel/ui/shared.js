import { usesLaravelSession } from '../auth/session.js'

export function buildLaravelAuthView(authentication) {
  if (!usesLaravelSession(authentication)) return {}
  return {
    'resources/views/auth/login.blade.php': '<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>Log in</title></head><body><main><h1>Log in</h1><form method="POST" action="/login">@csrf<label>Email <input name="email" type="email" autocomplete="email" required></label><label>Password <input name="password" type="password" autocomplete="current-password" required></label><button>Log in</button></form></main></body></html>\n',
  }
}

export function laravelLoginNavigation(authentication) {
  return usesLaravelSession(authentication)
    ? '<nav>@auth <form method="POST" action="/logout">@csrf<button>Log out</button></form> @else <a href="/login">Log in</a> @endauth</nav>'
    : ''
}
