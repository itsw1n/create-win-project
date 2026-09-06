FROM {{PYTHON_IMAGE}}
WORKDIR /app
COPY --from=ghcr.io/astral-sh/uv:{{UV_VERSION}} /uv /usr/local/bin/uv
COPY pyproject.toml .python-version ./
RUN uv sync
COPY . .
EXPOSE 8000
CMD ["uv", "run", "uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000", "--reload"]
