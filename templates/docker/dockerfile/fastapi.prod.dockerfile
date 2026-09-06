FROM {{PYTHON_IMAGE}}
WORKDIR /app
COPY --from=ghcr.io/astral-sh/uv:{{UV_VERSION}} /uv /usr/local/bin/uv
COPY pyproject.toml uv.lock .python-version ./
RUN uv sync --frozen
COPY . .
RUN useradd --create-home --no-log-init appuser && chown -R appuser:appuser /app
EXPOSE 8000
USER appuser
CMD ["uv", "run", "uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
