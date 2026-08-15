# Stack: Spring Boot (Java 21)

Used in: React + Spring Boot, Next.js + Spring Boot combos.

> **Purpose:** Architectural rulebook for AI/agentic coding in a production Spring Boot API.
> **Core philosophy:** Start simple. Keep boundaries clear. Add layers only when complexity justifies them.

---

# 1. The One-Sentence Mental Model

```
HTTP Request
     │
     ▼
Controller        ← entry point only, HTTP concern
     │
     ▼
Service           ← business logic lives here
     │
     ▼
Repository        ← database access lives here
     │
     ▼
Database
```

This is a **responsibility map**, not a rule that every feature needs every layer.
Small features can skip layers. Complexity earns abstraction.

---

# 2. Golden Rules

1. Controller handles HTTP only — no business logic, no DB calls
2. Service handles business logic only — no HTTP, no @RequestMapping
3. Repository handles DB only — no logic, no HTTP
4. DTOs always — never expose Entity in API responses
5. Constructor injection always — never @Autowired on fields
6. AppException always — never throw raw RuntimeException
7. Never reveal system internals in error responses
8. Validate at the boundary — never trust input from the client
9. Authorization enforced on the server — never trust the client
10. Keep features self-contained in their own package
11. Start simple — one class per layer, add abstraction when justified
12. Follow existing patterns — don't introduce new ones without reason

---

# 3. The Most Important Distinction: Entry Point vs Business Operation

```
CONTROLLER
= How an HTTP request enters server-side application code
= Entry point only

SERVICE
= What the application actually does
= Business operation

REPOSITORY
= How persistent data is accessed
= Database concern only
```

Example:

```
POST /api/orders
     │
     ▼
OrderController.createOrder()     ← entry point, parses HTTP request
     │
     ▼
OrderService.createOrder()        ← business: validate, calculate, orchestrate
     │
     ├── InventoryRepository      ← DB: check stock
     ├── PricingService           ← logic: calculate total
     ├── OrderRepository          ← DB: save order
     └── NotificationService      ← logic: send email
```

The Controller is not the business operation. It is the entry point.

---

# 4. Layer Responsibilities

## Controller — HTTP Only

What it does:
- Parse the HTTP request
- Call the appropriate service method
- Wrap result in ApiResponse
- Return ResponseEntity

What it does NOT do:
- Business logic
- Direct repository calls
- Complex conditionals
- Data transformation beyond DTO mapping

```java
// ✅ correct controller
@RestController
@RequestMapping("/api/users")
@RequiredArgsConstructor
public class UserController {

    private final UserService userService;

    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<UserResponse>> getById(
            @PathVariable String id) {
        return ResponseEntity.ok(
            ApiResponse.success(userService.getById(id))
        );
    }

    @PostMapping
    public ResponseEntity<ApiResponse<UserResponse>> create(
            @Valid @RequestBody CreateUserRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED)
            .body(ApiResponse.success(userService.create(request)));
    }
}

// ❌ wrong — business logic in controller
@PostMapping
public ResponseEntity<?> create(@RequestBody CreateUserRequest request) {
    if (userRepository.existsByEmail(request.email())) {  // ← direct repo call
        throw new RuntimeException("Email taken");         // ← wrong exception
    }
    User user = new User();
    user.setEmail(request.email());                        // ← manual mapping
    return ResponseEntity.ok(userRepository.save(user));   // ← direct repo call
}
```

---

## Service — Business Logic Only

What it does:
- Enforce business rules
- Orchestrate multiple repositories
- Call other services when needed
- Throw AppException for business rule violations
- Transform data between layers

What it does NOT do:
- Parse HTTP requests
- Return ResponseEntity
- Have @RequestMapping
- Know about HTTP status codes directly

```java
// ✅ correct service
@Service
@RequiredArgsConstructor
public class UserService {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private static final Logger log = LoggerFactory.getLogger(UserService.class);

    public UserResponse create(CreateUserRequest request) {
        if (userRepository.existsByEmail(request.email())) {
            throw new AppException("EMAIL_TAKEN", HttpStatus.CONFLICT,
                "An account with this email already exists.");
        }

        User user = User.builder()
            .id(UUID.randomUUID().toString())
            .email(request.email())
            .password(passwordEncoder.encode(request.password()))
            .name(request.name())
            .build();

        User saved = userRepository.save(user);
        log.info("User created: {}", saved.getId());
        return UserResponse.from(saved);
    }

    public UserResponse getById(String id) {
        return userRepository.findById(id)
            .map(UserResponse::from)
            .orElseThrow(() -> new AppException("USER_NOT_FOUND", HttpStatus.NOT_FOUND));
    }
}
```

---

## Repository — DB Only

What it does:
- Extends JpaRepository for standard CRUD
- Adds custom @Query methods when needed
- Returns Entity or Optional<Entity>

What it does NOT do:
- Business logic
- Data transformation
- Exception throwing

```java
// ✅ correct repository
@Repository
public interface UserRepository extends JpaRepository<User, String> {

    Optional<User> findByEmail(String email);

    boolean existsByEmail(String email);

    @Query("SELECT u FROM User u WHERE u.role = :role ORDER BY u.createdAt DESC")
    List<User> findAllByRole(@Param("role") String role);

    @Query("SELECT u FROM User u WHERE u.name LIKE %:query% OR u.email LIKE %:query%")
    Page<User> searchUsers(@Param("query") String query, Pageable pageable);
}
```

---

## DTO — Data Shapes Only

```java
// Request DTO — what comes IN from client
public record CreateUserRequest(
    @NotBlank(message = "Name is required")
    String name,

    @NotBlank(message = "Email is required")
    @Email(message = "Invalid email format")
    String email,

    @NotBlank(message = "Password is required")
    @Size(min = 8, message = "Password must be at least 8 characters")
    String password
) {}

// Response DTO — what goes OUT to client
public record UserResponse(
    String id,
    String name,
    String email,
    String role,
    LocalDateTime createdAt
) {
    // Static factory — maps from Entity
    public static UserResponse from(User user) {
        return new UserResponse(
            user.getId(),
            user.getName(),
            user.getEmail(),
            user.getRole(),
            user.getCreatedAt()
        );
    }
}
```

Rules:
- Always Java records (Java 21)
- Request DTOs: Bean Validation annotations on every field
- Response DTOs: static `from(Entity)` factory method
- Never include sensitive fields (password, tokens) in response DTOs
- Never expose Entity directly — always map to DTO

---

## Entity — DB Mapping Only

```java
@Entity
@Table(name = "users")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class User extends BaseEntity {

    @Id
    private String id;

    @Column(nullable = false, unique = true)
    private String email;

    @Column(nullable = false)
    private String password;

    @Column(nullable = false)
    private String name;

    @Column(nullable = false)
    private String role = "USER";

    @PrePersist
    protected void onCreate() {
        if (id == null) id = UUID.randomUUID().toString();
    }
}

// BaseEntity — always extend this
@MappedSuperclass
@EntityListeners(AuditingEntityListener.class)
@Data
public abstract class BaseEntity {

    @CreatedDate
    @Column(nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @LastModifiedDate
    @Column(nullable = false)
    private LocalDateTime updatedAt;
}
```

Rules:
- Always extend BaseEntity
- Lombok allowed: @Data, @Builder, @NoArgsConstructor, @AllArgsConstructor
- @PrePersist for UUID generation
- No business logic in entities
- No service calls from entities

---

# 5. Do I Need a Service?

```
Is there business logic beyond "save this to DB"?
  YES → Service needed

Do multiple repositories need to be coordinated?
  YES → Service needed

Does this operation need to throw a business exception?
  YES → Service needed

Is this literally just "find by id, return DTO"?
  NO → Controller can be thin, service is still correct layer
       but keep it — consistency matters more than skipping layers
```

---

# 6. Do I Need a Repository Method?

```
Does JpaRepository already have this?
  findById(), findAll(), save(), delete(), existsById()
  YES → use it directly, don't add a method

Does it need a WHERE clause?
  YES → add findBy[Field] or findBy[Field]And[Field] method
        Spring Data generates the query automatically

Is the Spring Data method name too long or complex?
  YES → add @Query method

Does it need pagination?
  YES → return Page<Entity> and accept Pageable parameter
```

---

# 7. When Should You Throw AppException?

```
Resource not found?
  → throw new AppException("RESOURCE_NOT_FOUND", HttpStatus.NOT_FOUND)

Business rule violated?
  → throw new AppException("SPECIFIC_CODE", HttpStatus.CONFLICT or BAD_REQUEST)

Unauthorized action?
  → throw new AppException("FORBIDDEN", HttpStatus.FORBIDDEN)

Invalid state?
  → throw new AppException("INVALID_STATE", HttpStatus.BAD_REQUEST)

Unexpected technical error?
  → let it bubble up to GlobalExceptionHandler as Exception
  → never throw INTERNAL_ERROR manually

Never:
  → throw new RuntimeException(...)
  → throw new IllegalArgumentException(...)
  → throw new Exception(...)
```

---

# 8. Package Structure

```
src/main/java/com/app/
├── [feature]/                          one package per domain
│   ├── [Feature]Controller.java
│   ├── [Feature]Service.java
│   ├── [Feature]Repository.java
│   ├── dto/
│   │   ├── [Create/Update]Request.java
│   │   └── [Feature]Response.java
│   └── entity/
│       └── [Feature].java
│
├── auth/                               always present
│   ├── AuthController.java
│   ├── AuthService.java
│   ├── dto/
│   │   ├── LoginRequest.java
│   │   ├── RegisterRequest.java
│   │   └── AuthResponse.java
│   └── entity/
│       ├── User.java
│       └── RefreshToken.java
│
├── config/
│   ├── SecurityConfig.java
│   ├── CorsConfig.java
│   └── AppConfig.java
│
└── common/
    ├── exception/
    │   ├── AppException.java
    │   └── GlobalExceptionHandler.java
    ├── response/
    │   └── ApiResponse.java
    ├── jwt/
    │   ├── JwtService.java
    │   └── JwtFilter.java
    └── audit/
        └── BaseEntity.java
```

---

# 9. Progressive Complexity

## Small Feature (simple CRUD)
```
One Controller + One Service + One Repository
No extra abstraction needed

com/app/category/
  CategoryController.java
  CategoryService.java
  CategoryRepository.java
  dto/
    CreateCategoryRequest.java
    CategoryResponse.java
  entity/
    Category.java
```

## Medium Feature (multiple concerns)
```
One Controller + One Service + Multiple Repositories
When the feature touches 2-3 tables

com/app/order/
  OrderController.java
  OrderService.java          ← orchestrates multiple repos
  OrderRepository.java
  OrderItemRepository.java
  dto/
    CreateOrderRequest.java
    OrderResponse.java
    OrderItemResponse.java
  entity/
    Order.java
    OrderItem.java
```

## Large Feature (complex domain)
```
Multiple Services when business logic is too big for one class
When a service method exceeds ~50 lines with real logic
When sub-domains emerge within the feature

com/app/order/
  OrderController.java
  OrderService.java          ← orchestrates sub-services
  PricingService.java        ← pricing logic only
  InventoryService.java      ← stock checking only
  NotificationService.java   ← notification logic only
  OrderRepository.java
  ...
```

Rule: start with small, evolve to medium or large only when needed.

---

# 10. Anti-Patterns

## Anti-Pattern: Business Logic in Controller
```java
// ❌
@PostMapping("/login")
public ResponseEntity<?> login(@RequestBody LoginRequest request) {
    Optional<User> user = userRepository.findByEmail(request.email()); // ← repo call
    if (user.isEmpty()) return ResponseEntity.status(401).build();     // ← business rule
    if (!passwordEncoder.matches(request.password(), user.get().getPassword())) {
        return ResponseEntity.status(401).build();                     // ← business rule
    }
    String token = jwtService.generateAccessToken(user.get().getId()); // ← token logic
    return ResponseEntity.ok(token);
}

// ✅
@PostMapping("/login")
public ResponseEntity<ApiResponse<AuthResponse>> login(
        @Valid @RequestBody LoginRequest request) {
    return ResponseEntity.ok(ApiResponse.success(authService.login(request)));
}
```

## Anti-Pattern: Repository Call in Controller
```java
// ❌ controller calling repository directly
@GetMapping("/{id}")
public ResponseEntity<?> getUser(@PathVariable String id) {
    return userRepository.findById(id)
        .map(ResponseEntity::ok)
        .orElse(ResponseEntity.notFound().build());
}

// ✅
@GetMapping("/{id}")
public ResponseEntity<ApiResponse<UserResponse>> getUser(@PathVariable String id) {
    return ResponseEntity.ok(ApiResponse.success(userService.getById(id)));
}
```

## Anti-Pattern: Exposing Entity in Response
```java
// ❌ entity directly returned — exposes password, internal IDs, etc.
@GetMapping("/me")
public ResponseEntity<User> getMe(@AuthenticationPrincipal String userId) {
    return ResponseEntity.ok(userRepository.findById(userId).get());
}

// ✅
@GetMapping("/me")
public ResponseEntity<ApiResponse<UserResponse>> getMe(
        @AuthenticationPrincipal String userId) {
    return ResponseEntity.ok(ApiResponse.success(userService.getById(userId)));
}
```

## Anti-Pattern: Field Injection
```java
// ❌ field injection — hidden dependencies, hard to test
@Service
public class UserService {
    @Autowired
    private UserRepository userRepository;
}

// ✅ constructor injection — explicit, testable
@Service
@RequiredArgsConstructor
public class UserService {
    private final UserRepository userRepository;
}
```

## Anti-Pattern: Raw RuntimeException
```java
// ❌ uncontrolled exception — leaks internals, wrong HTTP status
throw new RuntimeException("User not found with id: " + id);

// ✅ controlled exception — correct status, safe message
throw new AppException("USER_NOT_FOUND", HttpStatus.NOT_FOUND,
    "The requested user does not exist.");
```

## Anti-Pattern: Fat Service
```java
// ❌ one service doing everything
@Service
public class UserService {
    // user CRUD...
    // password reset logic...
    // email sending...
    // role management...
    // audit logging...
    // report generation...
    // 800 lines of mixed concerns
}

// ✅ split by responsibility when a service exceeds ~150 lines with real logic
UserService.java           → user CRUD
PasswordService.java       → password reset flow
UserNotificationService.java → notifications for user events
```

---

# 11. Pagination Pattern

## Repository
```java
Page<User> findAll(Pageable pageable);

Page<User> findAllByRole(String role, Pageable pageable);

@Query("SELECT u FROM User u WHERE u.name LIKE %:query%")
Page<User> search(@Param("query") String query, Pageable pageable);
```

## Service
```java
public Page<UserResponse> getAll(int page, int size, String sortBy) {
    Pageable pageable = PageRequest.of(page, size, Sort.by(sortBy).descending());
    return userRepository.findAll(pageable).map(UserResponse::from);
}
```

## Controller
```java
@GetMapping
public ResponseEntity<ApiResponse<Page<UserResponse>>> getAll(
        @RequestParam(defaultValue = "0") int page,
        @RequestParam(defaultValue = "20") int size,
        @RequestParam(defaultValue = "createdAt") String sortBy) {
    return ResponseEntity.ok(
        ApiResponse.success(userService.getAll(page, size, sortBy))
    );
}
```

## Response Shape
```json
{
  "success": true,
  "data": {
    "content": [...],
    "totalElements": 100,
    "totalPages": 5,
    "number": 0,
    "size": 20,
    "first": true,
    "last": false
  }
}
```

## Frontend Consumption (React)
```typescript
// features/users/hooks/useUsers.ts
export function useUsers({ page = 0, size = 20 } = {}) {
  return useQuery({
    queryKey: ['users', { page, size }],
    queryFn: () => userApi.getAll({ page, size }),
    placeholderData: keepPreviousData,  // smooth pagination
  })
}
```

---

# 12. Role-Based Authorization

## Method-Level (preferred for feature-specific rules)
```java
// Enable in SecurityConfig
@Configuration
@EnableMethodSecurity
public class SecurityConfig { ... }

// Use on service or controller methods
@PreAuthorize("hasRole('ADMIN')")
public void deleteUser(String id) { ... }

@PreAuthorize("hasRole('ADMIN') or #userId == authentication.principal")
public UserResponse getById(String userId) { ... }

@PreAuthorize("hasAnyRole('ADMIN', 'MODERATOR')")
public Page<UserResponse> getAll(Pageable pageable) { ... }
```

## Route-Level (for broad protection)
```java
// SecurityConfig — broad rules
.authorizeHttpRequests(auth -> auth
    .requestMatchers("/api/auth/**").permitAll()
    .requestMatchers("/api/admin/**").hasRole("ADMIN")
    .requestMatchers(HttpMethod.DELETE).hasRole("ADMIN")
    .anyRequest().authenticated()
)
```

## Custom Auth Check in Service
```java
public UserResponse getById(String requesterId, String targetId) {
    User requester = userRepository.findById(requesterId)
        .orElseThrow(() -> new AppException("UNAUTHORIZED", HttpStatus.UNAUTHORIZED));

    // User can only access their own data unless admin
    if (!requesterId.equals(targetId) && !requester.getRole().equals("ADMIN")) {
        throw new AppException("FORBIDDEN", HttpStatus.FORBIDDEN,
            "You do not have permission to access this resource.");
    }

    return userRepository.findById(targetId)
        .map(UserResponse::from)
        .orElseThrow(() -> new AppException("USER_NOT_FOUND", HttpStatus.NOT_FOUND));
}
```

## Role Enum Pattern
```java
public enum Role {
    USER, ADMIN, MODERATOR;

    public String withPrefix() {
        return "ROLE_" + this.name();
    }
}
```

---

# 13. Validation

## Bean Validation on Request DTOs
```java
public record CreateUserRequest(
    @NotBlank(message = "Name is required")
    @Size(max = 100, message = "Name must not exceed 100 characters")
    String name,

    @NotBlank(message = "Email is required")
    @Email(message = "Email must be a valid email address")
    String email,

    @NotBlank(message = "Password is required")
    @Size(min = 8, max = 100, message = "Password must be 8-100 characters")
    String password,

    @NotNull(message = "Role is required")
    @Pattern(regexp = "USER|ADMIN", message = "Role must be USER or ADMIN")
    String role
) {}
```

## Always Use @Valid on Controller Parameters
```java
public ResponseEntity<?> create(@Valid @RequestBody CreateUserRequest request) {
    // if @Valid fails → GlobalExceptionHandler catches MethodArgumentNotValidException
    // → returns 400 with VALIDATION_ERROR code and field details
}
```

## Custom Validator (when needed)
```java
@Constraint(validatedBy = UniqueEmailValidator.class)
@Target(ElementType.FIELD)
@Retention(RetentionPolicy.RUNTIME)
public @interface UniqueEmail {
    String message() default "Email is already taken";
    Class<?>[] groups() default {};
    Class<? extends Payload>[] payload() default {};
}

@Component
@RequiredArgsConstructor
public class UniqueEmailValidator implements ConstraintValidator<UniqueEmail, String> {
    private final UserRepository userRepository;

    @Override
    public boolean isValid(String email, ConstraintValidatorContext context) {
        return email != null && !userRepository.existsByEmail(email);
    }
}
```

---

# 14. Transaction Rules

```java
// When to use @Transactional:
// → Multiple DB writes that must succeed or fail together
// → Read-modify-write operations
// → Operations spanning multiple repositories

@Transactional
public OrderResponse createOrder(CreateOrderRequest request) {
    // If any of these fail, ALL are rolled back
    Order order = orderRepository.save(buildOrder(request));
    inventoryRepository.decrementStock(request.productId(), request.quantity());
    auditRepository.save(buildAuditLog(order));
    return OrderResponse.from(order);
}

// Read-only queries — add readOnly = true for performance
@Transactional(readOnly = true)
public Page<UserResponse> getAll(Pageable pageable) {
    return userRepository.findAll(pageable).map(UserResponse::from);
}

// Single write — @Transactional not required
// JpaRepository.save() is already transactional
public UserResponse create(CreateUserRequest request) {
    User user = userRepository.save(buildUser(request));
    return UserResponse.from(user);
}
```

---

# 15. Logging Rules

```java
// One logger per class
private static final Logger log = LoggerFactory.getLogger(UserService.class);

// What to log per layer:
// Controller — log nothing (GlobalExceptionHandler logs errors)
// Service — log business events (created, updated, deleted)
// Repository — log nothing (JPA handles query logging)

// ✅ correct logging
log.info("User created: id={}, email={}", user.getId(), user.getEmail());
log.warn("Login attempt failed for email: {}", email);
log.error("Failed to send notification for userId: {}", userId, exception);

// ❌ never log sensitive data
log.info("User password: {}", password);        // never
log.info("JWT token: {}", token);               // never
log.info("Full request body: {}", request);     // never — may contain passwords

// Log levels:
// INFO  → normal business events (user created, order placed)
// WARN  → expected problems (login failed, resource not found)
// ERROR → unexpected problems (DB connection failed, third-party API down)
// DEBUG → development only, never in production
```

---

# 16. Testing Strategy

## Unit Test — Service Layer
```java
@ExtendWith(MockitoExtension.class)
class UserServiceTest {

    @Mock private UserRepository userRepository;
    @Mock private PasswordEncoder passwordEncoder;

    @InjectMocks private UserService userService;

    @Test
    void create_whenEmailAvailable_returnsUserResponse() {
        when(userRepository.existsByEmail("alice@test.com")).thenReturn(false);
        when(passwordEncoder.encode("password123")).thenReturn("hashed");
        when(userRepository.save(any(User.class))).thenAnswer(i -> i.getArgument(0));

        UserResponse result = userService.create(
            new CreateUserRequest("Alice", "alice@test.com", "password123")
        );

        assertThat(result.email()).isEqualTo("alice@test.com");
        assertThat(result.name()).isEqualTo("Alice");
    }

    @Test
    void create_whenEmailTaken_throwsAppException() {
        when(userRepository.existsByEmail("alice@test.com")).thenReturn(true);

        assertThatThrownBy(() -> userService.create(
            new CreateUserRequest("Alice", "alice@test.com", "password123")
        ))
        .isInstanceOf(AppException.class)
        .hasFieldOrPropertyWithValue("code", "EMAIL_TAKEN");
    }
}
```

## Integration Test — Controller Layer
```java
@SpringBootTest(webEnvironment = RANDOM_PORT)
@ActiveProfiles("test")
@AutoConfigureMockMvc
class UserControllerIntegrationTest {

    @Autowired private MockMvc mockMvc;
    @Autowired private ObjectMapper objectMapper;
    @Autowired private UserRepository userRepository;

    @BeforeEach
    void setUp() { userRepository.deleteAll(); }

    @Test
    void createUser_withValidInput_returns201() throws Exception {
        mockMvc.perform(post("/api/users")
            .contentType(APPLICATION_JSON)
            .content(objectMapper.writeValueAsString(
                new CreateUserRequest("Alice", "alice@test.com", "password123")
            )))
            .andExpect(status().isCreated())
            .andExpect(jsonPath("$.success").value(true))
            .andExpect(jsonPath("$.data.email").value("alice@test.com"))
            .andExpect(jsonPath("$.data.password").doesNotExist()); // never expose
    }

    @Test
    void createUser_withDuplicateEmail_returns409() throws Exception {
        // Setup existing user
        userService.create(new CreateUserRequest("Alice", "alice@test.com", "pass"));

        mockMvc.perform(post("/api/users")
            .contentType(APPLICATION_JSON)
            .content(objectMapper.writeValueAsString(
                new CreateUserRequest("Alice2", "alice@test.com", "pass456")
            )))
            .andExpect(status().isConflict())
            .andExpect(jsonPath("$.code").value("EMAIL_TAKEN"));
    }
}
```

## Test Naming Convention
```
methodName_whenCondition_thenExpected

create_whenEmailAvailable_returnsUserResponse
create_whenEmailTaken_throwsAppException
getById_whenUserExists_returnsUserResponse
getById_whenUserNotFound_throwsAppException
login_whenValidCredentials_returnsAuthResponse
login_whenWrongPassword_throwsAppException
```

## What To Test Per Layer
```
Service (unit tests):
  → Every public method
  → Success path
  → Every AppException case
  → Mock all dependencies

Controller (integration tests):
  → Every endpoint
  → 2xx success case
  → 4xx error cases (400, 401, 403, 404, 409)
  → Verify response shape matches ApiResponse contract
  → Verify sensitive fields never appear in response

Repository:
  → Only test custom @Query methods
  → Standard JpaRepository methods: trust Spring Data
```

---

# 17. Async Operations

```java
// Enable async in config
@Configuration
@EnableAsync
public class AppConfig {

    @Bean
    public TaskExecutor taskExecutor() {
        ThreadPoolTaskExecutor executor = new ThreadPoolTaskExecutor();
        executor.setCorePoolSize(5);
        executor.setMaxPoolSize(10);
        executor.setQueueCapacity(25);
        executor.setThreadNamePrefix("async-");
        executor.initialize();
        return executor;
    }
}

// Use @Async for fire-and-forget operations
@Service
public class NotificationService {

    @Async
    public void sendWelcomeEmail(String email, String name) {
        // runs in separate thread — caller doesn't wait
        emailSender.send(buildWelcomeEmail(email, name));
    }
}

// Call from service (not controller)
@Transactional
public UserResponse create(CreateUserRequest request) {
    User user = userRepository.save(buildUser(request));
    notificationService.sendWelcomeEmail(user.getEmail(), user.getName()); // async
    return UserResponse.from(user);
}
```

When to use @Async:
- Email sending
- Push notifications
- Audit logging
- External webhook calls
- Any operation where the user doesn't need to wait for the result

---

# 18. Common Patterns

## Soft Delete
```java
// Entity
@Column(nullable = false)
private boolean deleted = false;

private LocalDateTime deletedAt;

// Repository
@Query("SELECT u FROM User u WHERE u.deleted = false")
List<User> findAllActive();

// Or use @Where (Hibernate)
@Where(clause = "deleted = false")
@Entity
public class User extends BaseEntity { ... }

// Service
public void delete(String id) {
    User user = userRepository.findById(id)
        .orElseThrow(() -> new AppException("USER_NOT_FOUND", HttpStatus.NOT_FOUND));
    user.setDeleted(true);
    user.setDeletedAt(LocalDateTime.now());
    userRepository.save(user);
}
```

## Search + Filter
```java
// Repository
@Query("""
    SELECT u FROM User u
    WHERE (:query IS NULL OR u.name LIKE %:query% OR u.email LIKE %:query%)
    AND (:role IS NULL OR u.role = :role)
    AND u.deleted = false
    """)
Page<User> search(
    @Param("query") String query,
    @Param("role") String role,
    Pageable pageable
);

// Service
public Page<UserResponse> search(String query, String role, int page, int size) {
    Pageable pageable = PageRequest.of(page, size, Sort.by("createdAt").descending());
    return userRepository.search(query, role, pageable).map(UserResponse::from);
}
```

## File Upload
```java
@PostMapping("/avatar")
public ResponseEntity<ApiResponse<String>> uploadAvatar(
        @AuthenticationPrincipal String userId,
        @RequestParam("file") MultipartFile file) {
    String url = userService.uploadAvatar(userId, file);
    return ResponseEntity.ok(ApiResponse.success(url));
}

// Service
public String uploadAvatar(String userId, MultipartFile file) {
    if (file.isEmpty()) throw new AppException("EMPTY_FILE", HttpStatus.BAD_REQUEST);

    String extension = getExtension(file.getOriginalFilename());
    if (!List.of("jpg", "jpeg", "png", "webp").contains(extension)) {
        throw new AppException("INVALID_FILE_TYPE", HttpStatus.BAD_REQUEST);
    }

    if (file.getSize() > 5 * 1024 * 1024) { // 5MB
        throw new AppException("FILE_TOO_LARGE", HttpStatus.BAD_REQUEST);
    }

    String filename = userId + "-avatar." + extension;
    Path destination = Path.of(uploadDir, filename);
    file.transferTo(destination);
    return "/uploads/" + filename;
}
```

---

# 19. AppException + GlobalExceptionHandler

```java
// AppException.java
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
}

// GlobalExceptionHandler.java
@RestControllerAdvice
public class GlobalExceptionHandler {

    private static final Logger log = LoggerFactory.getLogger(GlobalExceptionHandler.class);

    @ExceptionHandler(AppException.class)
    public ResponseEntity<ApiResponse<Void>> handleAppException(
            AppException ex, HttpServletRequest request) {
        log.warn("AppException [{}] on {}: {}", ex.getCode(),
            request.getRequestURI(), ex.getMessage());
        return ResponseEntity.status(ex.getStatus())
            .body(ApiResponse.error(ex.getCode(), ex.getMessage()));
    }

    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<ApiResponse<Void>> handleValidation(
            MethodArgumentNotValidException ex) {
        List<FieldError> errors = ex.getBindingResult().getFieldErrors().stream()
            .map(f -> new FieldError(f.getField(), f.getDefaultMessage()))
            .toList();
        return ResponseEntity.badRequest()
            .body(ApiResponse.validationError(errors));
    }

    @ExceptionHandler(Exception.class)
    public ResponseEntity<ApiResponse<Void>> handleUnexpected(
            Exception ex, HttpServletRequest request) {
        log.error("Unexpected error on {}", request.getRequestURI(), ex);
        return ResponseEntity.internalServerError()
            .body(ApiResponse.error("INTERNAL_ERROR", "An unexpected error occurred"));
    }
}
```

---

# 20. JWT Pattern

```java
@Service
public class JwtService {

    @Value("${app.jwt.secret}")
    private String secret;

    @Value("${app.jwt.expires-in}")
    private long expiresIn;

    public String generateAccessToken(String userId) {
        return Jwts.builder()
            .subject(userId)
            .issuedAt(new Date())
            .expiration(new Date(System.currentTimeMillis() + expiresIn))
            .signWith(getSigningKey())
            .compact();
    }

    public String extractUserId(String token) {
        return getClaims(token).getSubject();
    }

    public boolean isTokenValid(String token) {
        try { getClaims(token); return true; }
        catch (JwtException e) { return false; }
    }

    private Claims getClaims(String token) {
        return Jwts.parser()
            .verifyWith(getSigningKey()).build()
            .parseSignedClaims(token).getPayload();
    }

    private SecretKey getSigningKey() {
        return Keys.hmacShaKeyFor(Decoders.BASE64.decode(secret));
    }
}
```

---

# 21. Security Config

```java
@Configuration
@EnableWebSecurity
@EnableMethodSecurity
@RequiredArgsConstructor
public class SecurityConfig {

    private final JwtFilter jwtFilter;

    @Bean
    public SecurityFilterChain filterChain(HttpSecurity http) throws Exception {
        return http
            .csrf(AbstractHttpConfigurer::disable)
            .sessionManagement(s -> s.sessionCreationPolicy(STATELESS))
            .authorizeHttpRequests(auth -> auth
                .requestMatchers("/api/auth/**").permitAll()
                .requestMatchers("/actuator/health").permitAll()
                .anyRequest().authenticated()
            )
            .addFilterBefore(jwtFilter, UsernamePasswordAuthenticationFilter.class)
            .build();
    }

    @Bean
    public PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder();
    }
}
```

---

# 22. Spring Profiles

| Profile | Config file              | Used when              |
|---------|--------------------------|------------------------|
| `dev`   | application-dev.yml      | Local development      |
| `test`  | application-test.yml     | CI + local tests       |
| `prod`  | application-prod.yml     | Production             |

```yaml
# application.yml (base — shared by all profiles)
spring:
  datasource:
    url: ${DATABASE_URL}
    username: ${POSTGRES_USER}
    password: ${POSTGRES_PASSWORD}
  jpa:
    hibernate:
      ddl-auto: validate
    show-sql: false
  flyway:
    enabled: true

app:
  jwt:
    secret: ${JWT_SECRET}
    refresh-secret: ${JWT_REFRESH_SECRET}
    expires-in: ${JWT_EXPIRES_IN:900000}
    refresh-expires: ${JWT_REFRESH_EXPIRES:604800000}

# application-dev.yml
spring:
  jpa:
    show-sql: true
logging:
  level:
    com.app: DEBUG

# application-test.yml
spring:
  datasource:
    url: ${DB_URL:jdbc:postgresql://localhost:5432/testdb}
    username: ${DB_USERNAME:postgres}
    password: ${DB_PASSWORD:postgres}
  jpa:
    show-sql: false
app:
  jwt:
    secret: ${JWT_SECRET:test-secret-value-at-least-32-characters-long}
    refresh-secret: ${JWT_REFRESH_SECRET:test-refresh-secret-at-least-32-chars}
logging:
  level:
    root: WARN
    com.app: INFO
```

---

# 23. Agent Decision Tree

```
New feature needed?
  → Create package com/app/[feature]/
  → Add Controller + Service + Repository + dto/ + entity/
  → Start with small pattern — add complexity only when needed

New endpoint?
  1. Add method to Controller (HTTP only)
  2. Add method to Service (business logic)
  3. Add method to Repository if new DB query needed
  4. Create Request DTO with @Valid annotations
  5. Create or extend Response DTO with from(Entity)
  6. Document in docs/api/endpoints.md
  7. Write unit test for Service method
  8. Write integration test for Controller endpoint

New DB table?
  → New Flyway migration V{n}__create_[name]_table.sql
  → New Entity extending BaseEntity
  → New Repository extending JpaRepository

Business rule violation?
  → throw new AppException("SPECIFIC_CODE", HttpStatus.XXX)
  → Add code to docs/api/errors.md
  → NEVER throw RuntimeException

Need pagination?
  → Repository returns Page<Entity> with Pageable param
  → Service creates PageRequest with sort
  → Controller accepts page/size/sortBy @RequestParam

Need authorization?
  → Route-level: SecurityConfig.requestMatchers()
  → Method-level: @PreAuthorize("hasRole('ADMIN')")
  → Business rule: custom check in Service

Multiple DB writes together?
  → @Transactional on Service method

Fire-and-forget operation?
  → @Async on dedicated method in separate service
  → Never @Async on transactional methods

Need to send email / notification?
  → Dedicated NotificationService with @Async
  → Called from Service after main operation completes
```

---

# 24. Agent Quick Reference

```
New feature?
  → com/app/[feature]/ + Controller + Service + Repository + dto/ + entity/

New endpoint?
  → Controller (HTTP) → Service (logic) → Repository (DB)
  → Document in docs/api/endpoints.md

New error?
  → throw new AppException("CODE", HttpStatus.XXX)
  → Add to docs/api/errors.md

Schema change?
  → New Flyway migration V{n}__description.sql
  → NEVER edit existing migration

Business logic?
  → Service ONLY — never Controller, never Repository

DB query?
  → Repository @Query method or Spring Data method name

Authorization?
  → @PreAuthorize on method OR SecurityConfig for routes

Multiple writes?
  → @Transactional on Service method

Pagination?
  → Pageable + Page<Entity> in Repository
  → PageRequest.of(page, size, Sort.by(...)) in Service

Password?
  → NEVER in response DTO
  → Always BCrypt encoded on save

Async operation?
  → @Async on method in dedicated service

Test a new service method?
  → @ExtendWith(MockitoExtension.class)
  → Mock all dependencies
  → Test success + every AppException case

Test a new endpoint?
  → @SpringBootTest + @AutoConfigureMockMvc
  → @ActiveProfiles("test")
  → Test 2xx + all 4xx cases
  → Verify password never in response
```
