import base64
import hashlib
import hmac
import json
import time

import pytest
from cryptography.hazmat.primitives import serialization
from cryptography.hazmat.primitives.asymmetric import rsa
from jose import jwt

from app.models.user import User


def bearer(token: str) -> dict:
    return {"Authorization": f"Bearer {token}"}


def test_new_sub_creates_user(client, make_token):
    r = client.get("/api/auth/me", headers=bearer(make_token(sub="s1", email="owner@example.com", name="Owner")))
    assert r.status_code == 200
    assert r.json()["email"] == "owner@example.com"
    assert r.json()["display_name"] == "Owner"


def test_existing_sub_reuses_user(client, make_token, db_session):
    for _ in range(2):
        client.get("/api/auth/me", headers=bearer(make_token(sub="s1")))
    assert db_session.query(User).count() == 1


def test_email_allowlist_is_case_insensitive(client, make_token):
    r = client.get("/api/auth/me", headers=bearer(make_token(email="Owner@Example.COM")))
    assert r.status_code == 200


def test_non_allowlisted_email_forbidden_and_not_stored(client, make_token, db_session):
    r = client.get("/api/auth/me", headers=bearer(make_token(sub="s2", email="stranger@example.com")))
    assert r.status_code == 403
    assert db_session.query(User).count() == 0


@pytest.mark.parametrize(
    "override",
    [
        {"exp": int(time.time()) - 10},
        {"aud": "other"},
        {"iss": "https://evil"},
        {"token_use": "access"},
    ],
)
def test_invalid_tokens_rejected(client, make_token, override):
    r = client.get("/api/auth/me", headers=bearer(make_token(**override)))
    assert r.status_code == 401
    assert r.headers["WWW-Authenticate"] == "Bearer"


def test_garbage_token_rejected(client, make_token):
    assert client.get("/api/auth/me", headers=bearer("not-a-jwt")).status_code == 401


def test_missing_token_rejected(client):
    assert client.get("/api/auth/me").status_code == 401


def test_register_and_login_removed(client):
    assert client.post("/api/auth/register").status_code == 404
    assert client.post("/api/auth/login").status_code == 404


def _other_key_pem() -> str:
    key = rsa.generate_private_key(public_exponent=65537, key_size=2048)
    return key.private_bytes(
        serialization.Encoding.PEM, serialization.PrivateFormat.PKCS8, serialization.NoEncryption()
    ).decode()


def _b64(data: dict) -> str:
    return base64.urlsafe_b64encode(json.dumps(data).encode()).rstrip(b"=").decode()


def _valid_claims(make_token) -> dict:
    return jwt.get_unverified_claims(make_token())


def test_token_signed_with_other_key_rejected(client, make_token):
    r = client.get("/api/auth/me", headers=bearer(make_token(key=_other_key_pem())))
    assert r.status_code == 401


def test_alg_none_token_rejected(client, make_token):
    token = f"{_b64({'alg': 'none', 'typ': 'JWT', 'kid': 'test-key'})}.{_b64(_valid_claims(make_token))}."
    assert client.get("/api/auth/me", headers=bearer(token)).status_code == 401


def test_hs256_signed_with_public_key_rejected(client, make_token):
    # python-jose refuses to HS256-sign with a PEM key, so build the token by hand.
    signing_input = f"{_b64({'alg': 'HS256', 'typ': 'JWT', 'kid': 'test-key'})}.{_b64(_valid_claims(make_token))}"
    mac = hmac.new(make_token.public_pem.encode(), signing_input.encode(), hashlib.sha256).digest()
    token = f"{signing_input}.{base64.urlsafe_b64encode(mac).rstrip(b'=').decode()}"
    assert client.get("/api/auth/me", headers=bearer(token)).status_code == 401


@pytest.mark.parametrize("claim", ["aud", "exp", "iss"])
def test_token_missing_required_claim_rejected(client, make_token, claim):
    assert client.get("/api/auth/me", headers=bearer(make_token(drop=[claim]))).status_code == 401


@pytest.mark.parametrize(
    "identities",
    [None, [], [{"providerName": "Facebook", "userId": "1"}]],
)
def test_non_google_identity_forbidden_and_not_stored(client, make_token, db_session, identities):
    if identities is None:
        token = make_token(drop=["identities"])
    else:
        token = make_token(identities=identities)
    assert client.get("/api/auth/me", headers=bearer(token)).status_code == 403
    assert db_session.query(User).count() == 0
