# Testing (Universal)

---

## Testing Layers
```
E2E (Playwright)
  → Full user journeys in real browser
  → Login, checkout, critical flows
  → Slowest, fewest tests

Component (React Testing Library)
  → Individual components in isolation
  → User interactions, conditional rendering
  → Medium speed

Unit (Vitest / JUnit)
  → Functions, hooks, services, utilities
  → Fast, no browser, no DOM
  → Most tests
```

Rule: test behavior, not implementation. Tests should survive refactors.

---

## Frontend: Vitest Setup
```typescript
// vitest.config.ts
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test/setup.ts'],
  },
  resolve: {
    alias: { '@': path.resolve(__dirname, './src') },
  },
})
```

```typescript
// src/test/setup.ts
import '@testing-library/jest-dom'
```

---

## Frontend: Test File Placement
```
features/users/
  hooks/
    useUsers.ts
    useUsers.test.ts      ← colocated with the hook
  components/
    UserCard/
      UserCard.tsx
      UserCard.test.tsx   ← colocated with the component
  api/
    userApi.ts
    userApi.test.ts
```

---

## Frontend: What to Test

### Always test:
- Custom hooks (TanStack Query hooks, Zustand stores)
- Utility functions (formatters, validators, transformers)
- Form validation schemas (Zod)
- Error handling logic

### Test when complex:
- Components with conditional rendering
- Components with user interactions (click, submit, input)
- Error and loading states

### Skip:
- Simple presentational components with no logic
- Page components (thin composers)
- Direct API calls (mock them in hook tests)
- Implementation details (internal state, method calls)

---

## Frontend: Hook Testing Pattern
```typescript
// features/users/hooks/useUsers.test.ts
import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useUsers } from './useUsers'
import { userApi } from '../api/userApi'

// Mock API layer — not implementation
vi.mock('../api/userApi')

const wrapper = ({ children }: { children: React.ReactNode }) => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
}

describe('useUsers', () => {
  it('returns users on success', async () => {
    const mockUsers = [{ id: '1', name: 'Alice', email: 'alice@example.com' }]
    vi.mocked(userApi.getAll).mockResolvedValue(mockUsers)

    const { result } = renderHook(() => useUsers(), { wrapper })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data).toEqual(mockUsers)
  })

  it('handles error state', async () => {
    vi.mocked(userApi.getAll).mockRejectedValue(new Error('NETWORK_ERROR'))

    const { result } = renderHook(() => useUsers(), { wrapper })

    await waitFor(() => expect(result.current.isError).toBe(true))
  })
})
```

---

## Frontend: Component Testing Pattern
```typescript
// features/auth/components/LoginForm/LoginForm.test.tsx
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { LoginForm } from './LoginForm'

describe('LoginForm', () => {
  it('shows validation errors when submitted empty', async () => {
    render(<LoginForm />)

    await userEvent.click(screen.getByRole('button', { name: /login/i }))

    expect(screen.getByText(/invalid email/i)).toBeInTheDocument()
  })

  it('calls onSubmit with correct values', async () => {
    const onSubmit = vi.fn()
    render(<LoginForm onSubmit={onSubmit} />)

    await userEvent.type(screen.getByLabelText(/email/i), 'alice@example.com')
    await userEvent.type(screen.getByLabelText(/password/i), 'password123')
    await userEvent.click(screen.getByRole('button', { name: /login/i }))

    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalledWith({
        email: 'alice@example.com',
        password: 'password123',
      })
    })
  })
})
```

---

## Frontend: Zod Schema Testing

Test Zod schemas **when** this project has forms to test. If the project has no such need, this section does not apply — the rules are optional.

```typescript
// features/auth/schemas/login.schema.test.ts
import { loginSchema } from './login.schema'

describe('loginSchema', () => {
  it('accepts valid input', () => {
    const result = loginSchema.safeParse({
      email: 'alice@example.com',
      password: 'password123',
    })
    expect(result.success).toBe(true)
  })

  it('rejects invalid email', () => {
    const result = loginSchema.safeParse({ email: 'notanemail', password: 'password123' })
    expect(result.success).toBe(false)
    expect(result.error?.issues[0].path).toContain('email')
  })

  it('rejects short password', () => {
    const result = loginSchema.safeParse({ email: 'alice@example.com', password: 'short' })
    expect(result.success).toBe(false)
  })
})
```

---

## Frontend: E2E with Playwright
```typescript
// e2e/auth.spec.ts
import { test, expect } from '@playwright/test'

test.describe('Authentication', () => {
  test('user can log in successfully', async ({ page }) => {
    await page.goto('/login')

    await page.getByLabel('Email').fill('alice@example.com')
    await page.getByLabel('Password').fill('password123')
    await page.getByRole('button', { name: 'Login' }).click()

    await expect(page).toHaveURL('/dashboard')
    await expect(page.getByText('Welcome, Alice')).toBeVisible()
  })

  test('shows error on invalid credentials', async ({ page }) => {
    await page.goto('/login')

    await page.getByLabel('Email').fill('wrong@example.com')
    await page.getByLabel('Password').fill('wrongpassword')
    await page.getByRole('button', { name: 'Login' }).click()

    await expect(page.getByText(/invalid email or password/i)).toBeVisible()
  })
})
```

```typescript
// playwright.config.ts
import { defineConfig } from '@playwright/test'

export default defineConfig({
  testDir: './e2e',
  use: {
    baseURL: 'http://localhost:5173',
    trace: 'on-first-retry',
  },
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:5173',
    reuseExistingServer: !process.env.CI,
  },
})
```

---

## Backend: JUnit + Spring Boot

### Unit Test (Service) — No DB, No HTTP
```java
// auth/AuthServiceTest.java
@ExtendWith(MockitoExtension.class)
class AuthServiceTest {

  @Mock private UserRepository userRepository;
  @Mock private PasswordEncoder passwordEncoder;
  @Mock private JwtService jwtService;

  @InjectMocks private AuthService authService;

  @Test
  void login_whenValidCredentials_returnsAuthResponse() {
    User user = User.builder()
      .id("1")
      .email("alice@example.com")
      .password("hashedPassword")
      .build();

    when(userRepository.findByEmail("alice@example.com")).thenReturn(Optional.of(user));
    when(passwordEncoder.matches("password123", "hashedPassword")).thenReturn(true);
    when(jwtService.generateAccessToken("1")).thenReturn("accessToken");

    AuthResponse response = authService.login(new LoginRequest("alice@example.com", "password123"));

    assertThat(response.accessToken()).isEqualTo("accessToken");
  }

  @Test
  void login_whenInvalidCredentials_throwsAppException() {
    when(userRepository.findByEmail(any())).thenReturn(Optional.empty());

    assertThatThrownBy(() -> authService.login(new LoginRequest("wrong@example.com", "pass")))
      .isInstanceOf(AppException.class)
      .hasFieldOrPropertyWithValue("code", "INVALID_CREDENTIALS");
  }
}
```

### Integration Test (Controller) — Real HTTP + DB
```java
// auth/AuthControllerIntegrationTest.java
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
@ActiveProfiles("test")
@AutoConfigureMockMvc
class AuthControllerIntegrationTest {

  @Autowired private MockMvc mockMvc;
  @Autowired private ObjectMapper objectMapper;
  @Autowired private UserRepository userRepository;

  @BeforeEach
  void setUp() {
    userRepository.deleteAll();
  }

  @Test
  void register_withValidInput_returns201() throws Exception {
    mockMvc.perform(post("/api/auth/register")
        .contentType(MediaType.APPLICATION_JSON)
        .content(objectMapper.writeValueAsString(
          new RegisterRequest("Alice", "alice@example.com", "password123")
        )))
      .andExpect(status().isCreated())
      .andExpect(jsonPath("$.success").value(true))
      .andExpect(jsonPath("$.data.user.email").value("alice@example.com"));
  }

  @Test
  void register_withDuplicateEmail_returns409() throws Exception {
    // Setup: create user first
    authService.register(new RegisterRequest("Alice", "alice@example.com", "password123"));

    mockMvc.perform(post("/api/auth/register")
        .contentType(MediaType.APPLICATION_JSON)
        .content(objectMapper.writeValueAsString(
          new RegisterRequest("Alice2", "alice@example.com", "password456")
        )))
      .andExpect(status().isConflict())
      .andExpect(jsonPath("$.code").value("EMAIL_TAKEN"));
  }
}
```

### Test Naming Convention
```java
// methodName_whenCondition_thenExpected
void login_whenValidCredentials_returnsAuthResponse()
void login_whenInvalidCredentials_throwsAppException()
void register_withDuplicateEmail_returns409()
void getUser_whenNotFound_returns404()
```

---

## CI Test Behavior
```yaml
# Frontend CI
- npm run test         # Vitest — must pass
- npm run build        # confirms no TS errors

# Backend CI
- ./mvnw test          # JUnit — uses real PostgreSQL
- SPRING_PROFILES_ACTIVE: test
```

Tests must pass before any merge to dev.

---

## Package.json Test Scripts
```json
{
  "scripts": {
    "test": "vitest run",
    "test:watch": "vitest",
    "test:coverage": "vitest run --coverage",
    "test:e2e": "playwright test",
    "test:e2e:ui": "playwright test --ui"
  }
}
```

---

## Agent Rules
```
New service method (backend)?
  → Unit test: methodName_whenCondition_thenExpected
  → Mock all dependencies with @Mock
  → Test both success and failure paths

New controller endpoint (backend)?
  → Integration test with MockMvc
  → Test 2xx success case
  → Test error cases (404, 409, 401, 400)
  → Clean DB in @BeforeEach

New hook (frontend)?
  → Vitest test with renderHook
  → Mock at API layer (vi.mock the api file)
  → Test success, error, and loading states

New form component?
  → RTL test for validation errors
  → RTL test for successful submission
  → Use userEvent not fireEvent for interactions

New Zod schema?
  → Test valid input passes
  → Test each invalid case fails with correct field

New E2E test needed?
  → Only for critical user flows (auth, checkout, core feature)
  → Use page.getByRole / getByLabel (accessible queries only)
  → Never use CSS selectors or data-testid unless no other option
```
