import json
import urllib.request
from functools import lru_cache

from jose import JWTError, jwt

from app.core.config import settings


class InvalidToken(Exception):
    pass


@lru_cache
def fetch_jwks() -> dict:
    """Cognito's public signing keys; cached for the life of the process."""
    url = (
        f"https://cognito-idp.{settings.cognito_region}.amazonaws.com/"
        f"{settings.cognito_user_pool_id}/.well-known/jwks.json"
    )
    with urllib.request.urlopen(url, timeout=5) as response:
        return json.load(response)


def verify_id_token(token: str) -> dict:
    """Returns the claims of a valid Cognito ID token, else raises InvalidToken."""
    issuer = f"https://cognito-idp.{settings.cognito_region}.amazonaws.com/{settings.cognito_user_pool_id}"
    try:
        claims = jwt.decode(
            token,
            fetch_jwks(),
            algorithms=["RS256"],
            audience=settings.cognito_client_id,
            issuer=issuer,
            # ID tokens carry at_hash; python-jose rejects it unless an access token is supplied.
            options={"verify_at_hash": False},
        )
    except JWTError as exc:
        raise InvalidToken(str(exc)) from exc
    if claims.get("token_use") != "id":
        raise InvalidToken("Not an ID token")
    return claims
