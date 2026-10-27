import os
from logging.config import fileConfig

from sqlalchemy import engine_from_config, pool
from sqlmodel import SQLModel

from alembic import context

import app.models  # noqa: F401  (registers all tables on SQLModel.metadata)
from app.core.config import settings

config = context.config

if config.config_file_name is not None:
    fileConfig(config.config_file_name)

# ALEMBIC_DATABASE_URL lets the test suite migrate the isolated test database.
database_url = os.environ.get("ALEMBIC_DATABASE_URL") or settings.DATABASE_URL
config.set_main_option("sqlalchemy.url", database_url.replace("%", "%%"))

target_metadata = SQLModel.metadata


def include_object(obj, name, type_, reflected, compare_to):
    # Full-text indexes are written by hand in migrations (autogenerate cannot
    # represent expression indexes); never let autogenerate drop them.
    if type_ == "index" and name and name.endswith("_fts"):
        return False
    return True


def run_migrations_offline() -> None:
    context.configure(
        url=config.get_main_option("sqlalchemy.url"),
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
        compare_type=True,
        include_object=include_object,
    )
    with context.begin_transaction():
        context.run_migrations()


def run_migrations_online() -> None:
    connectable = engine_from_config(
        config.get_section(config.config_ini_section, {}),
        prefix="sqlalchemy.",
        poolclass=pool.NullPool,
    )
    with connectable.connect() as connection:
        context.configure(
            connection=connection,
            target_metadata=target_metadata,
            compare_type=True,
            include_object=include_object,
        )
        with context.begin_transaction():
            context.run_migrations()


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
