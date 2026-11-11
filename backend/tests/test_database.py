from app.core.database import connect_args_for


def test_mysql_gets_connect_timeout_longer_than_aurora_resume():
    assert connect_args_for("mysql+pymysql://u:p@h:3306/db") == {"connect_timeout": 20}


def test_sqlite_gets_no_connect_args():
    assert connect_args_for("sqlite://") == {}
