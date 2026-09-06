import { pythonPackageVersion } from '../../shared/javascript-package.js'

function versions(stack) {
  const version = (name) => pythonPackageVersion(stack.profile, name, 'fastapi scaffold')
  return {
    fastapi: version('fastapi'),
    uvicorn: version('uvicorn'),
    pydanticSettings: version('pydantic-settings'),
    sqlalchemy: version('sqlalchemy'),
    asyncpg: version('asyncpg'),
    alembic: version('alembic'),
    pyjwt: version('pyjwt'),
    httpx: version('httpx'),
    pytest: version('pytest'),
    pytestAsyncio: version('pytest-asyncio'),
    ruff: version('ruff'),
    mypy: version('mypy'),
  }
}

function pyproject(answers, stack, v) {
  return `[project]
name = "${answers.projectName}"
version = "0.1.0"
description = "${answers.projectDescription}"
readme = "README.md"
requires-python = ">=3.13"
dependencies = [
  "fastapi==${v.fastapi}",
  "uvicorn==${v.uvicorn}",
  "pydantic-settings==${v.pydanticSettings}",
  "sqlalchemy==${v.sqlalchemy}",
  "asyncpg==${v.asyncpg}",
  "alembic==${v.alembic}",
  "pyjwt==${v.pyjwt}",
  "httpx==${v.httpx}",
]

[dependency-groups]
dev = [
  "pytest==${v.pytest}",
  "pytest-asyncio==${v.pytestAsyncio}",
  "ruff==${v.ruff}",
  "mypy==${v.mypy}",
  "httpx==${v.httpx}",
]

[build-system]
requires = ["hatchling"]
build-backend = "hatchling.build"

[tool.hatch.build.targets.wheel]
packages = ["app"]

[tool.ruff]
target-version = "py313"
line-length = 100

[tool.ruff.lint]
select = ["E", "F", "I", "UP", "B"]

[tool.mypy]
python_version = "3.13"
strict = true
ignore_missing_imports = true

[tool.pytest.ini_options]
asyncio_mode = "auto"
testpaths = ["tests"]
`
}

function backendReadme(answers) {
  return `# ${answers.projectName} backend

FastAPI service for ${answers.projectDescription}.

Run \`uv sync\` to install the exact tested dependencies, then use the commands in the
repository documentation to develop, test, and operate the service.
`
}

function mainPy(stack, core) {
  return `"""Application entrypoint for ${stack.architecture} profile."""

from __future__ import annotations

import logging
import uuid

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from ${core}.config import settings
from ${core}.db import close_engine
from .routes_health import router as health_router
from .status_router import router as status_router

logger = logging.getLogger(__name__)


class AppError(Exception):
    """Typed application error with a stable code."""

    def __init__(self, code: str, message: str, status: int = 400) -> None:
        super().__init__(message)
        self.code = code
        self.status = status


def create_app() -> FastAPI:
    app = FastAPI(title="API", version="0.1.0")

    origins = [o.strip() for o in settings.cors_allowed_origins.split(",") if o.strip()]
    app.add_middleware(
        CORSMiddleware,
        allow_origins=origins,
        allow_credentials=False,
        allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE"],
        allow_headers=["Authorization", "Content-Type"],
    )

    @app.middleware("http")
    async def request_id(request: Request, call_next):  # type: ignore[no-untyped-def]
        request_id = request.headers.get("X-Request-ID", str(uuid.uuid4()))
        response = await call_next(request)
        response.headers["X-Request-ID"] = request_id
        return response

    @app.exception_handler(AppError)
    async def app_error_handler(request: Request, exc: AppError) -> JSONResponse:  # noqa: ARG001
        request_id = request.headers.get("X-Request-ID", "")
        return JSONResponse(
            status_code=exc.status,
            content={"error": {"code": exc.code, "message": str(exc), "requestId": request_id}},
        )

    @app.on_event("shutdown")
    async def shutdown() -> None:
        await close_engine()

    app.include_router(health_router)
    app.include_router(status_router)
    logger.info("application startup complete")
    return app


app = create_app()
`
}

function configPy() {
  return `"""Validated application configuration."""

from __future__ import annotations

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    database_url: str = "postgresql+asyncpg://postgres:postgres@localhost:5432/app"
    oidc_issuer: str = ""
    oidc_audience: str = "api"
    oidc_algorithms: str = "RS256"
    oidc_jwks_url: str = ""
    cors_allowed_origins: str = "http://localhost:3000"


settings = Settings()
`
}

function dbPy(configModule) {
  return `"""Async SQLAlchemy engine and session management."""

from __future__ import annotations

from collections.abc import AsyncIterator

from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy.orm import DeclarativeBase

from ${configModule} import settings


class Base(DeclarativeBase):
    pass


_engine = create_async_engine(settings.database_url, pool_size=5, max_overflow=10)
_session_factory = async_sessionmaker(_engine, class_=AsyncSession, expire_on_commit=False)


async def get_session() -> AsyncIterator[AsyncSession]:
    async with _session_factory() as session:
        yield session


async def close_engine() -> None:
    await _engine.dispose()
`
}

function securityPy(authentication, configModule) {
  if (authentication === 'public') {
    return `"""Public authentication model: no user accounts, endpoints intentionally open."""

from __future__ import annotations

from typing import Any


async def require_auth() -> Any:
    """Public applications do not invent authentication; returns no principal."""
    return None
`
  }
  if (authentication === 'undecided') {
    return `"""Undecided authentication model: deny protected routes until auth is designed."""

from __future__ import annotations

from fastapi import HTTPException


async def require_auth() -> None:
    """Fail closed; health stays public, every other endpoint is denied."""
    raise HTTPException(status_code=403, detail="Authentication is not configured.")
`
  }
  return `"""OIDC bearer validation for protected routes."""

from __future__ import annotations

from typing import Annotated

import jwt
from fastapi import Depends, HTTPException
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from jwt import PyJWKClient

from ${configModule} import settings

_bearer = HTTPBearer(auto_error=False)


def _jwks_url() -> str:
    if settings.oidc_jwks_url:
        return settings.oidc_jwks_url
    return f"{settings.oidc_issuer.rstrip('/')}/.well-known/jwks.json"


async def require_auth(
    credentials: Annotated[HTTPAuthorizationCredentials | None, Depends(_bearer)] = None,
) -> dict:
    """Validate the bearer access token; deny by default."""
    if credentials is None or credentials.scheme.lower() != "bearer":
        raise HTTPException(status_code=401, detail="Missing bearer token.")
    algorithms = [a.strip() for a in settings.oidc_algorithms.split(",") if a.strip()]
    try:
        signing_key = PyJWKClient(_jwks_url()).get_signing_key_from_jwt(credentials.credentials)
        claims: dict = jwt.decode(
            credentials.credentials,
            signing_key.key,
            algorithms=algorithms,
            issuer=settings.oidc_issuer,
            audience=settings.oidc_audience,
            options={"require": ["exp", "iss", "aud"]},
        )
    except jwt.PyJWTError as exc:
        raise HTTPException(status_code=401, detail="Invalid bearer token.") from exc
    return claims
`
}

function healthRouter() {
  return `"""Public health and readiness routes."""

from __future__ import annotations

from fastapi import APIRouter
from sqlalchemy import text

router = APIRouter(tags=["health"])


@router.get("/health")
async def health() -> dict:
    return {"status": "ok"}


@router.get("/ready")
async def ready() -> dict:
    from .db import _engine  # noqa: PLC0415

    async with _engine.connect() as connection:
        await connection.execute(text("SELECT 1"))
    return {"status": "ready"}
`
}

function healthRouterCore() {
  return `"""Public health and readiness routes."""

from __future__ import annotations

from fastapi import APIRouter
from sqlalchemy import text

from app.core.db import _engine

router = APIRouter(tags=["health"])


@router.get("/health")
async def health() -> dict:
    return {"status": "ok"}


@router.get("/ready")
async def ready() -> dict:
    async with _engine.connect() as connection:
        await connection.execute(text("SELECT 1"))
    return {"status": "ready"}
`
}

function smallApiRouter(authentication) {
  const guard = authentication === 'public'
    ? ''
    : ', Depends\n\nfrom .security import require_auth'
  const dep = authentication === 'public' ? '' : ', dependencies=[Depends(require_auth)]'
  return `"""Application routes for the small profile."""

from __future__ import annotations

from fastapi import APIRouter${guard}

router = APIRouter(prefix="/api", tags=["status"]${dep})


@router.get("/status")
async def status() -> dict:
    return {"status": "ok", "architecture": "small"}
`
}

function statusFeature(prefix, architecture) {
  return {
    [`${prefix}/schemas.py`]: `"""Transport schemas for the status feature."""

from __future__ import annotations

from pydantic import BaseModel


class StatusResponse(BaseModel):
    status: str
    architecture: str
`,
    [`${prefix}/repository.py`]: `"""Persistence boundary for the status feature."""

from __future__ import annotations


class StatusRepository:
    def current(self) -> dict:
        return {"status": "ok", "architecture": "${architecture}"}
`,
    [`${prefix}/service.py`]: `"""Application operations for the status feature."""

from __future__ import annotations

from .repository import StatusRepository
from .schemas import StatusResponse


class StatusService:
    def __init__(self, repository: StatusRepository | None = None) -> None:
        self._repository = repository or StatusRepository()

    def current(self) -> StatusResponse:
        return StatusResponse(**self._repository.current())
`,
    [`${prefix}/router.py`]: `"""HTTP adapter for the status feature."""

from __future__ import annotations

from fastapi import APIRouter, Depends

from app.core.security import require_auth

from .service import StatusService

router = APIRouter(prefix="/api", tags=["status"])


@router.get("/status", dependencies=[Depends(require_auth)])
async def status() -> dict:
    return StatusService().current().model_dump()
`,
  }
}

function largeInit() {
  return `"""Public module interface for the status feature."""

from __future__ import annotations

from .router import router
from .schemas import StatusResponse
from .service import StatusService

__all__ = ["StatusService", "StatusResponse", "router"]
`
}

function boundaryTest() {
  return `"""Architecture boundary: feature modules expose only their public interface."""

from __future__ import annotations

import pathlib

MODULE = pathlib.Path(__file__).resolve().parents[1] / "app" / "modules" / "status"
PUBLIC = {"__init__.py", "router.py", "service.py", "schemas.py"}


def test_module_keeps_implementation_internal() -> None:
    assert MODULE.is_dir()
    internals = {"repository.py"}
    assert internals <= {p.name for p in MODULE.iterdir()}
    init = (MODULE / "__init__.py").read_text()
    assert "StatusService" in init and "router" in init


def test_only_public_modules_are_imported() -> None:
    tree = (MODULE / "router.py").read_text()
    assert "repository" not in tree
`
}

function alembicIni(projectName) {
  return `[alembic]
script_location = alembic
prepend_sys_path = .
version_path_separator = os

[loggers]
keys = root,sqlalchemy,alembic

[handlers]
keys = console

[formatters]
keys = generic

[logger_root]
level = WARN
handlers = console

[logger_sqlalchemy]
level = WARN
handlers =
qualname = sqlalchemy.engine

[logger_alembic]
level = INFO
handlers =
qualname = alembic

[handler_console]
class = StreamHandler
args = (sys.stderr,)
level = NOTSET
formatter = generic

[formatter_generic]
format = %(levelname)-5.5s [%(name)s] %(message)s
datefmt = %H:%M:%S
`
}

function alembicEnv(configModule, dbModule) {
  return `"""Alembic async environment; run migrations explicitly with alembic upgrade head."""

from __future__ import annotations

import asyncio
from logging.config import fileConfig

from sqlalchemy import pool
from sqlalchemy.engine import Connection
from sqlalchemy.ext.asyncio import async_engine_from_config

from alembic import context
from ${configModule} import settings
from ${dbModule} import Base

config = context.config
if config.config_file_name is not None:
    fileConfig(config.config_file_name)
config.set_main_option("sqlalchemy.url", settings.database_url)

target_metadata = Base.metadata


def run_migrations_offline() -> None:
    context.configure(
        url=settings.database_url,
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
    )
    with context.begin_transaction():
        context.run_migrations()


def do_run_migrations(connection: Connection) -> None:
    context.configure(connection=connection, target_metadata=target_metadata)
    with context.begin_transaction():
        context.run_migrations()


async def run_migrations_online() -> None:
    connectable = async_engine_from_config(
        config.get_section(config.config_ini_section, {}),
        prefix="sqlalchemy.",
        poolclass=pool.NullPool,
    )
    async with connectable.connect() as connection:
        await connection.run_sync(do_run_migrations)
    await connectable.dispose()


if context.is_offline_mode():
    run_migrations_offline()
else:
    asyncio.run(run_migrations_online())
`
}

function baselineMigration() {
  return `"""Baseline schema: examples table only; add product tables per feature."""

from __future__ import annotations

import sqlalchemy as sa

from alembic import op

revision = "0001_baseline"
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "examples",
        sa.Column("id", sa.Uuid(), primary_key=True),
        sa.Column(
            "created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False
        ),
        sa.Column(
            "updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False
        ),
    )


def downgrade() -> None:
    op.drop_table("examples")
`
}

function conftestPy() {
  return `"""Shared pytest fixtures."""

from __future__ import annotations

import pytest_asyncio
from httpx import ASGITransport, AsyncClient

from app.main import create_app


@pytest_asyncio.fixture
async def client():
    app = create_app()
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        yield client
`
}

function healthTest() {
  return `"""Health contract tests (no database)."""

from __future__ import annotations

import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_health_is_public(client: AsyncClient) -> None:
    response = await client.get("/health")
    assert response.status_code == 200
    assert response.json() == {"status": "ok"}
`
}

function securityTest(authentication) {
  if (authentication === 'public') {
    return `"""Public model: application endpoints stay open without invented auth."""

from __future__ import annotations

import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_status_is_public(client: AsyncClient) -> None:
    response = await client.get("/api/status")
    assert response.status_code == 200
    assert response.json()["status"] == "ok"
`
  }
  if (authentication === 'undecided') {
    return `"""Undecided model: protected routes fail closed until auth is designed."""

from __future__ import annotations

import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_status_fails_closed(client: AsyncClient) -> None:
    response = await client.get("/api/status")
    assert response.status_code == 403
`
  }
  return `"""OIDC model: missing and invalid bearer tokens are rejected."""

from __future__ import annotations

import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_status_rejects_missing_bearer_token(client: AsyncClient) -> None:
    response = await client.get("/api/status")
    assert response.status_code == 401


@pytest.mark.asyncio
async def test_status_rejects_invalid_bearer_token(client: AsyncClient) -> None:
    response = await client.get("/api/status", headers={"Authorization": "Bearer invalid"})
    assert response.status_code == 401
`
}

export function buildFastApiFiles(answers, vars, stack) {
  const v = versions(stack)
  const root = stack.frontendKey === 'no-frontend' ? '' : 'backend/'
  const auth = stack.authentication
  const files = {
    [`${root}pyproject.toml`]: pyproject(answers, stack, v),
    [`${root}.python-version`]: `${stack.profile.runtimes.python}\n`,
    [`${root}alembic.ini`]: alembicIni(answers.projectName),
    [`${root}alembic/versions/.gitkeep`]: '',
    [`${root}tests/__init__.py`]: '',
    [`${root}tests/conftest.py`]: conftestPy(),
    [`${root}tests/test_health.py`]: healthTest(),
    [`${root}tests/test_security.py`]: securityTest(auth),
  }

  if (root) {
    files[`${root}README.md`] = backendReadme(answers)
  }

  if (stack.architecture === 'small') {
    files[`${root}app/__init__.py`] = ''
    files[`${root}app/main.py`] = smallMain(stack)
    files[`${root}app/config.py`] = configPy()
    files[`${root}app/db.py`] = dbPy('.config')
    files[`${root}app/security.py`] = securityPy(auth, '.config')
    files[`${root}app/routes_health.py`] = healthRouter()
    files[`${root}app/routes_api.py`] = smallApiRouter(auth)
    files[`${root}alembic/env.py`] = alembicEnv('app.config', 'app.db')
    files[`${root}alembic/versions/0001_baseline.py`] = baselineMigration()
  } else if (stack.architecture === 'medium') {
    files[`${root}app/__init__.py`] = ''
    files[`${root}app/main.py`] = mainPy(stack, 'app.core')
    files[`${root}app/routes_health.py`] = healthRouterCore()
    files[`${root}app/status_router.py`] = `"""Status router alias for the medium profile."""

from __future__ import annotations

from app.features.status.router import router
`
    files[`${root}app/core/__init__.py`] = ''
    files[`${root}app/core/config.py`] = configPy()
    files[`${root}app/core/db.py`] = dbPy('app.core.config')
    files[`${root}app/core/security.py`] = securityPy(auth, 'app.core.config')
    files[`${root}app/core/logging.py`] = `"""Structured PII-safe logging configuration."""

from __future__ import annotations

import logging


def configure_logging() -> None:
    logging.basicConfig(level=logging.INFO, format="%(levelname)s [%(name)s] %(message)s")
`
    files[`${root}app/features/__init__.py`] = ''
    files[`${root}app/features/status/__init__.py`] = ''
    Object.assign(files, Object.fromEntries(
      Object.entries(statusFeature(`${root}app/features/status`, 'medium')).map(([k, val]) => [k, val]),
    ))
    files[`${root}alembic/env.py`] = alembicEnv('app.core.config', 'app.core.db')
    files[`${root}alembic/versions/0001_baseline.py`] = baselineMigration()
  } else {
    files[`${root}app/__init__.py`] = ''
    files[`${root}app/main.py`] = mainPy(stack, 'app.core')
    files[`${root}app/routes_health.py`] = healthRouterCore()
    files[`${root}app/status_router.py`] = `"""Status router alias for the large profile."""

from __future__ import annotations

from app.modules.status import router
`
    files[`${root}app/core/__init__.py`] = ''
    files[`${root}app/core/config.py`] = configPy()
    files[`${root}app/core/db.py`] = dbPy('app.core.config')
    files[`${root}app/core/security.py`] = securityPy(auth, 'app.core.config')
    files[`${root}app/core/logging.py`] = `"""Structured PII-safe logging configuration."""

from __future__ import annotations

import logging


def configure_logging() -> None:
    logging.basicConfig(level=logging.INFO, format="%(levelname)s [%(name)s] %(message)s")
`
    files[`${root}app/modules/__init__.py`] = ''
    files[`${root}app/modules/status/__init__.py`] = largeInit()
    Object.assign(files, Object.fromEntries(
      Object.entries(statusFeature(`${root}app/modules/status`, 'large'))
        .filter(([k]) => !k.endsWith('/router.py'))
        .map(([k, val]) => [k, val]),
    ))
    files[`${root}app/modules/status/router.py`] = `"""HTTP adapter for the status feature (public interface re-exported)."""

from __future__ import annotations

from fastapi import APIRouter, Depends

from app.core.security import require_auth

from .service import StatusService

router = APIRouter(prefix="/api", tags=["status"])


@router.get("/status", dependencies=[Depends(require_auth)])
async def status() -> dict:
    return StatusService().current().model_dump()
`
    files[`${root}tests/test_boundaries.py`] = boundaryTest()
    files[`${root}alembic/env.py`] = alembicEnv('app.core.config', 'app.core.db')
    files[`${root}alembic/versions/0001_baseline.py`] = baselineMigration()
  }
  return files
}

function smallMain(stack) {
  return `"""Application entrypoint for the small profile."""

from __future__ import annotations

import logging
import uuid

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from .config import settings
from .db import close_engine
from .routes_api import router as api_router
from .routes_health import router as health_router

logger = logging.getLogger(__name__)


class AppError(Exception):
    """Typed application error with a stable code."""

    def __init__(self, code: str, message: str, status: int = 400) -> None:
        super().__init__(message)
        self.code = code
        self.status = status


def create_app() -> FastAPI:
    app = FastAPI(title="API", version="0.1.0")

    origins = [o.strip() for o in settings.cors_allowed_origins.split(",") if o.strip()]
    app.add_middleware(
        CORSMiddleware,
        allow_origins=origins,
        allow_credentials=False,
        allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE"],
        allow_headers=["Authorization", "Content-Type"],
    )

    @app.middleware("http")
    async def request_id(request: Request, call_next):  # type: ignore[no-untyped-def]
        request_id = request.headers.get("X-Request-ID", str(uuid.uuid4()))
        response = await call_next(request)
        response.headers["X-Request-ID"] = request_id
        return response

    @app.exception_handler(AppError)
    async def app_error_handler(request: Request, exc: AppError) -> JSONResponse:  # noqa: ARG001
        request_id = request.headers.get("X-Request-ID", "")
        return JSONResponse(
            status_code=exc.status,
            content={"error": {"code": exc.code, "message": str(exc), "requestId": request_id}},
        )

    @app.on_event("shutdown")
    async def shutdown() -> None:
        await close_engine()

    app.include_router(health_router)
    app.include_router(api_router)
    logger.info("application startup complete")
    return app


app = create_app()
`
}
