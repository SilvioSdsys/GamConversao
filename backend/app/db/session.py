from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.core.config import get_settings

settings = get_settings()

_db_url = settings.database_url
if _db_url.startswith("sqlite"):
    engine = create_engine(
        _db_url,
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
else:
    engine = create_engine(
        _db_url,
        pool_pre_ping=True,
        pool_size=10,
        max_overflow=20,
        pool_timeout=30,
        pool_recycle=1800,
    )

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
