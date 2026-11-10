from app.core.database import get_db
from app.main import app


def test_health_does_not_touch_db(client):
    app.dependency_overrides.pop(get_db, None)  # no DB available
    assert client.get("/api/health").json() == {"status": "ok"}


def test_health_db_reports_connected(client):
    assert client.get("/api/health/db").json() == {"status": "ok", "db": "connected"}


def test_routers_are_under_api_prefix(client):
    assert client.get("/exercises").status_code == 404
    assert client.get("/api/exercises").status_code == 401
