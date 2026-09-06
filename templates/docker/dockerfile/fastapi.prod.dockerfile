FROM {{PYTHON_IMAGE}}
WORKDIR /app
COPY --from=ghcr.io/astral-sh/uv:{{UV_VERSION}} /uv /usr/local/bin/uv
COPY pyproject.toml uv.lock .python-version README.md ./
RUN uv sync --frozen --no-install-project
COPY . .
RUN uv sync --frozen
RUN useradd --create-home --no-log-init appuser && chown -R appuser:appuser /app
EXPOSE 8000
USER appuser
CMD ["/app/.venv/bin/uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
