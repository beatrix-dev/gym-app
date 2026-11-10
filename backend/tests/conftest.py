import time

import pytest
from fastapi.testclient import TestClient
from jose import jwt
from jose.backends import RSAKey
from cryptography.hazmat.primitives import serialization
from cryptography.hazmat.primitives.asymmetric import rsa
from sqlalchemy import BigInteger, create_engine
from sqlalchemy.ext.compiler import compiles
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.core.config import settings
from app.core.database import Base, get_db
from app.main import app

REGION = "eu-west-1"
POOL_ID = "eu-west-1_test"
CLIENT_ID = "client123"
ISSUER = f"https://cognito-idp.{REGION}.amazonaws.com/{POOL_ID}"
KID = "test-key"



@compiles(BigInteger, "sqlite")
def _bigint_as_integer(type_, compiler, **kw):
    # SQLite only autoincrements a column declared exactly INTEGER PRIMARY KEY.
    return "INTEGER"


engine = create_engine(
    "sqlite:///:memory:",
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


def override_get_db():
    db = TestingSessionLocal()
    try:
        yield db
    finally:
        db.close()


@pytest.fixture
def client():
    # Creating all tables exercises every model's mapping - a broken relationship
    # or column fails here instead of surfacing later as a 500 on a real endpoint.
    Base.metadata.create_all(bind=engine)
    app.dependency_overrides[get_db] = override_get_db
    yield TestClient(app)
    app.dependency_overrides.pop(get_db, None)
    Base.metadata.drop_all(bind=engine)


@pytest.fixture
def db_session():
    db = TestingSessionLocal()
    try:
        yield db
    finally:
        db.close()


@pytest.fixture
def make_token(monkeypatch):
    """Signs Cognito-style ID tokens with a throwaway RSA key and serves its public JWKS."""
    private_key = rsa.generate_private_key(public_exponent=65537, key_size=2048)
    private_pem = private_key.private_bytes(
        serialization.Encoding.PEM,
        serialization.PrivateFormat.PKCS8,
        serialization.NoEncryption(),
    )
    public_pem = private_key.public_key().public_bytes(
        serialization.Encoding.PEM,
        serialization.PublicFormat.SubjectPublicKeyInfo,
    )
    jwk = RSAKey(public_pem, "RS256").to_dict()
    jwk = {**jwk, "kid": KID, "use": "sig"}

    monkeypatch.setattr("app.core.security.fetch_jwks", lambda: {"keys": [jwk]})
    monkeypatch.setattr(settings, "cognito_region", REGION)
    monkeypatch.setattr(settings, "cognito_user_pool_id", POOL_ID)
    monkeypatch.setattr(settings, "cognito_client_id", CLIENT_ID)
    monkeypatch.setattr(settings, "allowed_emails", "owner@example.com")

    def _make_token(*, key=None, drop=(), **overrides) -> str:
        claims = {
            "iss": ISSUER,
            "aud": CLIENT_ID,
            "token_use": "id",
            "sub": "s1",
            "email": "owner@example.com",
            "name": "Owner",
            "exp": int(time.time()) + 300,
            "at_hash": "x",
            "identities": [{"providerName": "Google", "userId": "123", "providerType": "Google"}],
        }
        claims.update(overrides)
        for name in drop:
            claims.pop(name, None)
        return jwt.encode(claims, key or private_pem.decode(), algorithm="RS256", headers={"kid": KID})

    _make_token.public_pem = public_pem.decode()
    return _make_token
