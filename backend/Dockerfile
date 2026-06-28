# syntax=docker/dockerfile:1
FROM python:3.12-slim

# uv for fast, reproducible installs (copied from the official uv image).
COPY --from=ghcr.io/astral-sh/uv:latest /uv /uvx /usr/local/bin/

ENV PYTHONUNBUFFERED=1 \
    UV_COMPILE_BYTECODE=1 \
    UV_LINK_MODE=copy

WORKDIR /app

# Install dependencies first so this layer is cached across code changes.
COPY pyproject.toml uv.lock ./
RUN uv sync --frozen --no-dev

# Application code.
COPY app ./app
COPY scripts ./scripts

# JSON cache directory (mounted as a volume in docker-compose).
RUN mkdir -p /app/data

EXPOSE 8100

CMD ["/app/.venv/bin/uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8100"]
