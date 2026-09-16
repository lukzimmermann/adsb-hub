FROM python:3.12-slim

WORKDIR /app

COPY pyproject.toml uv.lock ./
RUN pip install --no-cache-dir uv \
    && uv sync --frozen --no-dev

COPY shared ./shared
COPY collector ./collector
COPY api ./api
COPY alembic.ini .
COPY migrations ./migrations
COPY config.yaml .

ENV PATH="/app/.venv/bin:$PATH"
ENV PYTHONUNBUFFERED=1
