import time

import pytest

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
