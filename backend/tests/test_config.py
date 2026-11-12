from app.core.config import Settings


def test_url_built_from_parts_escapes_password():
    s = Settings(database_url=None, db_host="h", db_user="u", db_password="p@ss/w:rd")
    assert s.sqlalchemy_url == "mysql+pymysql://u:p%40ss%2Fw%3Ard@h:3306/gym_tracker"


def test_explicit_database_url_wins():
    s = Settings(database_url="sqlite://", db_host="h")
    assert s.sqlalchemy_url == "sqlite://"
