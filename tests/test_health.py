from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.core.database import Base, get_db
from app.main import app

engine = create_engine(
    "sqlite:///:memory:",
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# /health only runs `SELECT 1`, but creating all tables here still exercises
# every model's mapping - a broken relationship or column would fail here
# instead of surfacing later as a 500 on a real endpoint.
Base.metadata.create_all(bind=engine)


def override_get_db():
    db = TestingSessionLocal()
    try:
        yield db
    finally:
        db.close()


app.dependency_overrides[get_db] = override_get_db
client = TestClient(app)


def test_health_check_reports_db_connected():
    response = client.get("/health")

    assert response.status_code == 200
    assert response.json() == {"status": "ok", "db": "connected"}
