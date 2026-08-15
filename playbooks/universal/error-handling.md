# Error Handling (Universal)

---

## Core Principle
```
Frontend: always route on error.code — never error.message
Backend:  always throw AppException — never raw RuntimeException
Both:     never expose system internals in error responses
```

---

## API Error Response Shape
```json
{
  "code": "ERROR_CODE",
  "message": "Human-readable, user-safe message",
  "details": [
    { "field": "email", "message": "Email is required" }
  ],
  "traceId": "7f2c9b18c6e4"
}
```

- `code` — stable across versions, never changes, frontend routes on this
- `message` — always user-safe, never a stack trace or SQL error
- `details` — only on VALIDATION_ERROR, one entry per invalid field
- `traceId` — opaque, maps to server logs, reveals nothing about system

---

## Error Code Registry
Every project maintains this in `docs/api/errors.md`.

### Universal Error Codes
| Code                    | Status | When                                         |
|-------------------------|--------|----------------------------------------------|
| `VALIDATION_ERROR`      | 400    | One or more fields failed validation         |
| `UNAUTHORIZED`          | 401    | Missing or invalid access token              |
| `INVALID_CREDENTIALS`   | 401    | Email or password is incorrect               |
| `INVALID_REFRESH_TOKEN` | 401    | Refresh token invalid or expired             |
| `TOKEN_REUSE_DETECTED`  | 401    | Refresh token already used (rotation)        |
| `FORBIDDEN`             | 403    | Valid token, insufficient permissions        |
| `NOT_FOUND`             | 404    | Resource does not exist                      |
| `CONFLICT`              | 409    | Resource already exists (e.g. EMAIL_TAKEN)   |
| `INTERNAL_ERROR`        | 500    | Unexpected server error                      |

Add project-specific codes to `docs/api/errors.md` as features are built.

---

## Frontend: AppError Class
```typescript
// lib/errors.ts
export class AppError extends Error {
  constructor(
    public readonly code: string,
    message: string,
    public readonly status: number = 500,
  ) {
    super(message)
    this.name = 'AppError'
  }
}

export function isAppError(error: unknown): error is AppError {
  return error instanceof AppError
}
```

---

## Frontend: Axios Interceptor (React + Vite)
```typescript
// lib/axios.ts
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const original = error.config

    // Auto-refresh on 401
    if (error.response?.status === 401 && !original._retry) {
      original._retry = true
      try {
        const { accessToken } = await refreshToken()
        setAccessToken(accessToken)
        original.headers.Authorization = `Bearer ${accessToken}`
        return api(original)
      } catch {
        clearAuth()
        window.location.href = '/login'
        return Promise.reject(error)
      }
    }

    // Normalize all errors to AppError
    const { code, message } = error.response?.data ?? {}
    throw new AppError(
      code ?? 'UNKNOWN_ERROR',
      message ?? 'Something went wrong',
      error.response?.status ?? 500
    )
  }
)
```

---

## Frontend: Error Handling in Hooks
```typescript
// features/auth/hooks/useLogin.ts
export function useLogin() {
  return useMutation({
    mutationFn: authApi.login,
    onError: (error) => {
      // Log, don't swallow
      logger.error('login failed:', error)
      // DO NOT handle UI here — let the component decide
    },
  })
}
```

```typescript
// features/auth/components/LoginForm.tsx
const { mutate: login, error } = useLogin()

// Route on code, never message
if (isAppError(error)) {
  switch (error.code) {
    case 'INVALID_CREDENTIALS':
      return <Alert>Invalid email or password</Alert>
    case 'UNAUTHORIZED':
      return <Alert>Session expired. Please log in again.</Alert>
    default:
      return <Alert>Something went wrong. Please try again.</Alert>
  }
}
```

---

## Frontend: Next.js Error Handling

### Server Action Errors
```typescript
// features/users/actions/createUser.action.ts
'use server'
export async function createUserAction(input: CreateUserInput) {
  try {
    const user = await userService.create(input)
    revalidatePath('/users')
    return { success: true, data: user }
  } catch (error) {
    if (isAppError(error)) {
      return { success: false, code: error.code, message: error.message }
    }
    return { success: false, code: 'INTERNAL_ERROR', message: 'Something went wrong' }
  }
}
```

### error.tsx (Route Error Boundary)
```typescript
// app/error.tsx
'use client'
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <div>
      <h2>Something went wrong</h2>
      <button onClick={reset}>Try again</button>
    </div>
  )
}
```

### not-found.tsx
```typescript
// app/not-found.tsx
export default function NotFound() {
  return <div>Page not found</div>
}
```

---

## Backend: AppException (Spring Boot)
```java
// common/exception/AppException.java
public class AppException extends RuntimeException {
  private final String code;
  private final HttpStatus status;

  public AppException(String code, HttpStatus status) {
    super(code);
    this.code = code;
    this.status = status;
  }

  public AppException(String code, HttpStatus status, String message) {
    super(message);
    this.code = code;
    this.status = status;
  }

  // Getters
  public String getCode() { return code; }
  public HttpStatus getStatus() { return status; }
}
```

### Throwing AppException
```java
// ✅ correct
throw new AppException("USER_NOT_FOUND", HttpStatus.NOT_FOUND);
throw new AppException("EMAIL_TAKEN", HttpStatus.CONFLICT, "An account with this email already exists.");

// ❌ never
throw new RuntimeException("user not found");
throw new IllegalArgumentException("email taken");
```

---

## Backend: GlobalExceptionHandler
```java
@RestControllerAdvice
public class GlobalExceptionHandler {

  private static final Logger log = LoggerFactory.getLogger(GlobalExceptionHandler.class);

  // Handles all AppException throws from services
  @ExceptionHandler(AppException.class)
  public ResponseEntity<ApiResponse<Void>> handleAppException(AppException ex, HttpServletRequest request) {
    log.warn("AppException [{}] on {}: {}", ex.getCode(), request.getRequestURI(), ex.getMessage());
    return ResponseEntity.status(ex.getStatus())
      .body(ApiResponse.error(ex.getCode(), ex.getMessage()));
  }

  // Handles @Valid validation failures
  @ExceptionHandler(MethodArgumentNotValidException.class)
  public ResponseEntity<ApiResponse<Void>> handleValidation(MethodArgumentNotValidException ex) {
    List<FieldError> errors = ex.getBindingResult().getFieldErrors().stream()
      .map(f -> new FieldError(f.getField(), f.getDefaultMessage()))
      .toList();
    return ResponseEntity.badRequest()
      .body(ApiResponse.validationError(errors));
  }

  // Catches anything unexpected — never leaks internals
  @ExceptionHandler(Exception.class)
  public ResponseEntity<ApiResponse<Void>> handleUnexpected(Exception ex, HttpServletRequest request) {
    log.error("Unexpected error on {}", request.getRequestURI(), ex);
    return ResponseEntity.internalServerError()
      .body(ApiResponse.error("INTERNAL_ERROR", "An unexpected error occurred"));
  }
}
```

---

## Security Rules for Errors
```
NEVER in error responses:
  → Stack traces
  → SQL error messages
  → Internal class names or package paths
  → Whether a user exists (use INVALID_CREDENTIALS not USER_NOT_FOUND for auth)
  → Database table or column names
  → File system paths
  → Server version or framework details

ALWAYS in error responses:
  → Stable error code
  → User-safe message
  → traceId for log correlation
  → HTTP status code matching the error type
```

---

## Agent Rules
```
New error condition in service?
  → throw new AppException("SPECIFIC_CODE", HttpStatus.XXX)
  → Add code to docs/api/errors.md registry
  → Add to frontend error code routing if user-facing

Frontend receives an error?
  → Route on error.code
  → NEVER route on error.message (messages can change)
  → NEVER show raw error message to user

401 received?
  → Interceptor handles refresh automatically
  → Component never sees 401 unless refresh also fails

Validation error?
  → Backend: @Valid on request DTO, GlobalExceptionHandler catches it
  → Frontend: Zod + React Hook Form catches it before submission
  → Both layers validate — never trust client-side only

New feature needs custom errors?
  → Add codes to error registry in docs/api/errors.md
  → Follow naming: SCREAMING_SNAKE_CASE
  → Keep codes stable — frontend depends on them
```
