FROM python:3.12-slim

ENV PYTHONUNBUFFERED=1 PYTHONDONTWRITEBYTECODE=1

RUN useradd --uid 10001 --create-home app
WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY app/ app/
COPY migrations/ migrations/
COPY alembic.ini entrypoint.sh ./

USER app
EXPOSE 8100

HEALTHCHECK --interval=30s --timeout=5s --start-period=60s --retries=3 \
  CMD python -c "import urllib.request;urllib.request.urlopen('http://localhost:8100/api/health')"

ENTRYPOINT ["./entrypoint.sh"]
