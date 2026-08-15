# DevOps: Docker

---

## Core Rules
- NEVER hardcode secrets in docker-compose files — always use environment variables
- Dev compose: source mounts for hot reload
- Prod compose: no mounts, pre-built images only
- Always define healthcheck on DB service
- depends_on with condition: service_healthy for backend
- Named volumes always — never anonymous
- Named networks always — one per project
- restart: always in prod only — never in dev

---

## Dev vs Prod Differences
| Concern           | Dev                          | Prod                          |
|-------------------|------------------------------|-------------------------------|
| Frontend          | Vite dev server (hot reload) | nginx serving static build    |
| Backend (Java)    | Maven wrapper (mvnw)         | Compiled JAR                  |
| Source mounts     | Yes                          | No                            |
| Volume mounts     | Source code                  | Data only                     |
| Restart policy    | No                           | always                        |
| Debug ports       | Optional                     | Never                         |
| Env vars          | From .env file               | From environment / secrets    |

---

## docker-compose.yml (Dev)
```yaml
# docker-compose.yml — React + Spring Boot (Dev)
services:

  frontend:
    container_name: ${PROJECT_NAME}-frontend
    build:
      context: ./frontend
      dockerfile: Dockerfile.dev
    ports:
      - "5173:5173"
    volumes:
      - ./frontend:/app
      - /app/node_modules
    environment:
      - VITE_API_URL=${VITE_API_URL}
    depends_on:
      - backend
    networks:
      - app-network

  backend:
    container_name: ${PROJECT_NAME}-backend
    build:
      context: ./backend
      dockerfile: Dockerfile.dev
    ports:
      - "8080:8080"
    volumes:
      - ./backend:/app
      - maven-cache:/root/.m2
    environment:
      - SPRING_PROFILES_ACTIVE=dev
      - DATABASE_URL=${DATABASE_URL}
      - POSTGRES_USER=${POSTGRES_USER}
      - POSTGRES_PASSWORD=${POSTGRES_PASSWORD}
      - JWT_SECRET=${JWT_SECRET}
      - JWT_REFRESH_SECRET=${JWT_REFRESH_SECRET}
    depends_on:
      db:
        condition: service_healthy
    networks:
      - app-network

  db:
    container_name: ${PROJECT_NAME}-db
    image: postgres:16-alpine
    ports:
      - "5432:5432"
    environment:
      - POSTGRES_USER=${POSTGRES_USER}
      - POSTGRES_PASSWORD=${POSTGRES_PASSWORD}
      - POSTGRES_DB=${POSTGRES_DB}
    volumes:
      - postgres-data:/var/lib/postgresql/data
    networks:
      - app-network
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U ${POSTGRES_USER} -d ${POSTGRES_DB}"]
      interval: 10s
      timeout: 5s
      retries: 5

volumes:
  postgres-data:
    name: ${PROJECT_NAME}-postgres-data
  maven-cache:
    name: ${PROJECT_NAME}-maven-cache

networks:
  app-network:
    name: ${PROJECT_NAME}-network
```

---

## docker-compose.prod.yml (Prod)
```yaml
# docker-compose.prod.yml — React + Spring Boot (Prod)
services:

  frontend:
    container_name: ${PROJECT_NAME}-frontend-prod
    build:
      context: ./frontend
      dockerfile: Dockerfile
      target: production
    ports:
      - "80:80"
    environment:
      - VITE_API_URL=${VITE_API_URL}
    depends_on:
      - backend
    networks:
      - app-network
    restart: always

  backend:
    container_name: ${PROJECT_NAME}-backend-prod
    build:
      context: ./backend
      dockerfile: Dockerfile
      target: production
    ports:
      - "8080:8080"
    environment:
      - SPRING_PROFILES_ACTIVE=prod
      - DATABASE_URL=${DATABASE_URL}
      - POSTGRES_USER=${POSTGRES_USER}
      - POSTGRES_PASSWORD=${POSTGRES_PASSWORD}
      - JWT_SECRET=${JWT_SECRET}
      - JWT_REFRESH_SECRET=${JWT_REFRESH_SECRET}
      - JWT_EXPIRES_IN=${JWT_EXPIRES_IN:-900000}
      - JWT_REFRESH_EXPIRES=${JWT_REFRESH_EXPIRES:-604800000}
    depends_on:
      db:
        condition: service_healthy
    networks:
      - app-network
    restart: always

  db:
    container_name: ${PROJECT_NAME}-db-prod
    image: postgres:16-alpine
    environment:
      - POSTGRES_USER=${POSTGRES_USER}
      - POSTGRES_PASSWORD=${POSTGRES_PASSWORD}
      - POSTGRES_DB=${POSTGRES_DB}
    volumes:
      - postgres-data-prod:/var/lib/postgresql/data
    networks:
      - app-network
    restart: always
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U ${POSTGRES_USER} -d ${POSTGRES_DB}"]
      interval: 10s
      timeout: 5s
      retries: 5

volumes:
  postgres-data-prod:
    name: ${PROJECT_NAME}-postgres-data-prod

networks:
  app-network:
    name: ${PROJECT_NAME}-network-prod
```

---

## Dockerfiles

### Frontend Dev
```dockerfile
# frontend/Dockerfile.dev
FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci
EXPOSE 5173
CMD ["npm", "run", "dev", "--", "--host"]
```

### Frontend Prod (multi-stage)
```dockerfile
# frontend/Dockerfile
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM nginx:alpine AS production
COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
```

### nginx.conf (Frontend Prod)
```nginx
server {
  listen 80;

  location / {
    root /usr/share/nginx/html;
    index index.html;
    try_files $uri $uri/ /index.html;   # SPA routing
  }
}
```

### Backend Dev
```dockerfile
# backend/Dockerfile.dev
FROM eclipse-temurin:21-jdk-alpine
WORKDIR /app
COPY . .
EXPOSE 8080
CMD ["./mvnw", "spring-boot:run"]
```

### Backend Prod (multi-stage)
```dockerfile
# backend/Dockerfile
FROM eclipse-temurin:21-jdk-alpine AS builder
WORKDIR /app
COPY . .
RUN ./mvnw package -DskipTests

FROM eclipse-temurin:21-jre-alpine AS production
WORKDIR /app
COPY --from=builder /app/target/*.jar app.jar
EXPOSE 8080
CMD ["java", "-jar", "app.jar"]
```

---

## Port Conventions
| Service       | Dev Port | Prod Port |
|---------------|----------|-----------|
| Frontend      | 5173     | 80        |
| Backend API   | 8080     | 8080      |
| PostgreSQL    | 5432     | 5432      |
| Next.js       | 3000     | 80        |

---

## .dockerignore
```
# Frontend
node_modules
dist
.env
.env.local

# Backend
target
.mvn
*.iml
.env

# General
.git
.gitignore
README.md
docs
*.md
```

---

## Agent Rules
```
New service in compose?
  → Add healthcheck if it has dependencies
  → Add depends_on with condition: service_healthy
  → Use named volume (never anonymous)
  → Use named network
  → No restart policy in dev, restart: always in prod

New environment variable?
  → NEVER hardcode in compose file
  → Reference as ${VARIABLE_NAME}
  → Add to .env.example with comment

Prod compose?
  → No volume mounts for source code
  → Use Dockerfile target: production
  → All restart: always

Dev Dockerfile?
  → Hot reload via volume mount
  → CMD should start dev server

Prod Dockerfile?
  → Multi-stage: build → runtime
  → Minimal final image (alpine/jre not jdk)
  → No source code in final image
```
