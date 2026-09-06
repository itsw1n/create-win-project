FROM {{PYTHON_IMAGE}}
WORKDIR /app
COPY --from=ghcr.io/astral-sh/uv:{{UV_VERSION}} /uv /usr/local/bin/uv
COPY pyproject.toml uv.lock .python-version README.md ./
RUN uv sync --frozen --no-install-project
COPY . .
RUN uv sync --frozen
EXPOSE 8000
CMD ["uv", "run", "uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000", "--reload"]
