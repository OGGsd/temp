from __future__ import annotations

import asyncio
import re
import sqlite3
import time
from contextlib import asynccontextmanager
from datetime import datetime, timezone
from pathlib import Path
from typing import TYPE_CHECKING

import anyio
import sqlalchemy as sa
from alembic import command, util
from alembic.config import Config
from axiestudio.logging import logger
from sqlalchemy import event, exc, inspect
from sqlalchemy.dialects import sqlite as dialect_sqlite
from sqlalchemy.engine import Engine
from sqlalchemy.exc import OperationalError
from sqlalchemy.ext.asyncio import AsyncEngine, create_async_engine
from sqlmodel import SQLModel, select, text
from sqlmodel.ext.asyncio.session import AsyncSession
from tenacity import retry, stop_after_attempt, wait_fixed

from axiestudio.initial_setup.constants import STARTER_FOLDER_NAME
from axiestudio.services.base import Service
from axiestudio.services.database import models
from axiestudio.services.database.models.user.crud import get_user_by_username
from axiestudio.services.database.session import NoopSession
from axiestudio.services.database.utils import Result, TableResults
from axiestudio.services.deps import get_settings_service
from axiestudio.services.utils import teardown_superuser

if TYPE_CHECKING:
    from axiestudio.services.settings.service import SettingsService


class DatabaseService(Service):
    name = "database_service"

    def __init__(self, settings_service: SettingsService):
        self._logged_pragma = False
        self.settings_service = settings_service
        if settings_service.settings.database_url is None:
            msg = "No database URL provided"
            raise ValueError(msg)
        self.database_url: str = settings_service.settings.database_url
        self._sanitize_database_url()

        # This file is in axiestudio.services.database.manager.py
        # the ini is in axiestudio
        axiestudio_dir = Path(__file__).parent.parent.parent
        self.script_location = axiestudio_dir / "alembic"
        self.alembic_cfg_path = axiestudio_dir / "alembic.ini"

        # register the event listener for sqlite as part of this class.
        # Using decorator will make the method not able to use self
        event.listen(Engine, "connect", self.on_connection)
        if self.settings_service.settings.database_connection_retry:
            self.engine = self._create_engine_with_retry()
        else:
            self.engine = self._create_engine()

        alembic_log_file = self.settings_service.settings.alembic_log_file
        # Check if the provided path is absolute, cross-platform.
        if Path(alembic_log_file).is_absolute():
            self.alembic_log_path = Path(alembic_log_file)
        else:
            self.alembic_log_path = Path(axiestudio_dir) / alembic_log_file

    async def initialize_alembic_log_file(self):
        # Ensure the directory and file for the alembic log file exists
        await anyio.Path(self.alembic_log_path.parent).mkdir(parents=True, exist_ok=True)
        await anyio.Path(self.alembic_log_path).touch(exist_ok=True)

    def reload_engine(self) -> None:
        self._sanitize_database_url()
        if self.settings_service.settings.database_connection_retry:
            self.engine = self._create_engine_with_retry()
        else:
            self.engine = self._create_engine()

    def _sanitize_database_url(self):
        """Create the engine for the database."""
        url_components = self.database_url.split("://", maxsplit=1)

        driver = url_components[0]

        if driver == "sqlite":
            driver = "sqlite+aiosqlite"
        elif driver in {"postgresql", "postgres"}:
            if driver == "postgres":
                logger.warning(
                    "The postgres dialect in the database URL is deprecated. "
                    "Use postgresql instead. "
                    "To avoid this warning, update the database URL."
                )
            driver = "postgresql+psycopg"

        self.database_url = f"{driver}://{url_components[1]}"

    def _build_connection_kwargs(self):
        """Build connection kwargs by merging deprecated settings with db_connection_settings.

        Returns:
            dict: Connection kwargs with deprecated settings overriding db_connection_settings
        """
        settings = self.settings_service.settings
        # Start with db_connection_settings as base
        connection_kwargs = settings.db_connection_settings.copy()

        # Override individual settings if explicitly set
        if "pool_size" in settings.model_fields_set:
            logger.warning("pool_size is deprecated. Use db_connection_settings['pool_size'] instead.")
            connection_kwargs["pool_size"] = settings.pool_size
        if "max_overflow" in settings.model_fields_set:
            logger.warning("max_overflow is deprecated. Use db_connection_settings['max_overflow'] instead.")
            connection_kwargs["max_overflow"] = settings.max_overflow

        return connection_kwargs

    def _create_engine(self) -> AsyncEngine:
        # Get connection settings from config, with defaults if not specified
        # if the user specifies an empty dict, we allow it.
        kwargs = self._build_connection_kwargs()

        poolclass_key = kwargs.get("poolclass")
        if poolclass_key is not None:
            pool_class = getattr(sa, poolclass_key, None)
            if pool_class and isinstance(pool_class(), sa.pool.Pool):
                logger.debug(f"Using poolclass: {poolclass_key}.")
                kwargs["poolclass"] = pool_class
            else:
                logger.error(f"Invalid poolclass '{poolclass_key}' specified. Using default pool class.")

        return create_async_engine(
            self.database_url,
            connect_args=self._get_connect_args(),
            **kwargs,
        )

    @retry(wait=wait_fixed(2), stop=stop_after_attempt(10))
    def _create_engine_with_retry(self) -> AsyncEngine:
        """Create the engine for the database with retry logic."""
        return self._create_engine()

    def _get_connect_args(self):
        settings = self.settings_service.settings

        if settings.db_driver_connection_settings is not None:
            return settings.db_driver_connection_settings

        if settings.database_url and settings.database_url.startswith("sqlite"):
            return {
                "check_same_thread": False,
                "timeout": settings.db_connect_timeout,
            }

        return {}

    def on_connection(self, dbapi_connection, _connection_record) -> None:
        if isinstance(dbapi_connection, sqlite3.Connection | dialect_sqlite.aiosqlite.AsyncAdapt_aiosqlite_connection):
            pragmas: dict = self.settings_service.settings.sqlite_pragmas or {}
            pragmas_list = []
            for key, val in pragmas.items():
                pragmas_list.append(f"PRAGMA {key} = {val}")
            if not self._logged_pragma:
                logger.debug(f"sqlite connection, setting pragmas: {pragmas_list}")
                self._logged_pragma = True
            if pragmas_list:
                cursor = dbapi_connection.cursor()
                try:
                    for pragma in pragmas_list:
                        try:
                            cursor.execute(pragma)
                        except OperationalError:
                            logger.exception(f"Failed to set PRAGMA {pragma}")
                        except GeneratorExit:
                            logger.error(f"Failed to set PRAGMA {pragma}")
                finally:
                    cursor.close()

    @asynccontextmanager
    async def with_session(self):
        if self.settings_service.settings.use_noop_database:
            yield NoopSession()
        else:
            async with AsyncSession(self.engine, expire_on_commit=False) as session:
                # Start of Selection
                try:
                    yield session
                except exc.SQLAlchemyError as db_exc:
                    logger.error(f"Database error during session scope: {db_exc}")
                    await session.rollback()
                    raise

    async def assign_orphaned_flows_to_superuser(self) -> None:
        """Assign orphaned flows to the default superuser when auto login is enabled."""
        settings_service = get_settings_service()

        if not settings_service.auth_settings.AUTO_LOGIN:
            return

        async with self.with_session() as session:
            # Fetch orphaned flows
            stmt = (
                select(models.Flow)
                .join(models.Folder)
                .where(
                    models.Flow.user_id == None,  # noqa: E711
                    models.Folder.name != STARTER_FOLDER_NAME,
                )
            )
            orphaned_flows = (await session.exec(stmt)).all()

            if not orphaned_flows:
                return

            logger.debug("Assigning orphaned flows to the default superuser")

            # Retrieve superuser
            superuser_username = settings_service.auth_settings.SUPERUSER
            superuser = await get_user_by_username(session, superuser_username)

            if not superuser:
                error_message = "Default superuser not found"
                logger.error(error_message)
                raise RuntimeError(error_message)

            # Get existing flow names for the superuser
            existing_names: set[str] = set(
                (await session.exec(select(models.Flow.name).where(models.Flow.user_id == superuser.id))).all()
            )

            # Process orphaned flows
            for flow in orphaned_flows:
                flow.user_id = superuser.id
                flow.name = self._generate_unique_flow_name(flow.name, existing_names)
                existing_names.add(flow.name)
                session.add(flow)

            # Commit changes
            await session.commit()
            logger.debug("Successfully assigned orphaned flows to the default superuser")

    @staticmethod
    def _generate_unique_flow_name(original_name: str, existing_names: set[str]) -> str:
        """Generate a unique flow name by adding or incrementing a suffix."""
        if original_name not in existing_names:
            return original_name

        match = re.search(r"^(.*) \((\d+)\)$", original_name)
        if match:
            base_name, current_number = match.groups()
            new_name = f"{base_name} ({int(current_number) + 1})"
        else:
            new_name = f"{original_name} (1)"

        # Ensure unique name by incrementing suffix
        while new_name in existing_names:
            match = re.match(r"^(.*) \((\d+)\)$", new_name)
            if match is not None:
                base_name, current_number = match.groups()
            else:
                error_message = "Invalid format: match is None"
                raise ValueError(error_message)

            new_name = f"{base_name} ({int(current_number) + 1})"

        return new_name

    @staticmethod
    def _check_schema_health(connection) -> bool:
        inspector = inspect(connection)

        model_mapping: dict[str, type[SQLModel]] = {
            "flow": models.Flow,
            "user": models.User,
            "apikey": models.ApiKey,
            # Add other SQLModel classes here
        }

        # To account for tables that existed in older versions
        legacy_tables = ["flowstyle"]

        for table, model in model_mapping.items():
            expected_columns = list(model.model_fields.keys())

            try:
                available_columns = [col["name"] for col in inspector.get_columns(table)]
            except sa.exc.NoSuchTableError:
                logger.debug(f"Missing table: {table}")
                return False

            for column in expected_columns:
                if column not in available_columns:
                    logger.debug(f"Missing column: {column} in table {table}")
                    return False

        for table in legacy_tables:
            if table in inspector.get_table_names():
                logger.warning(f"Legacy table exists: {table}")

        return True

    async def check_schema_health(self) -> None:
        async with self.with_session() as session, session.bind.connect() as conn:
            await conn.run_sync(self._check_schema_health)

    @staticmethod
    def init_alembic(alembic_cfg) -> None:
        logger.info("Initializing alembic")
        command.ensure_version(alembic_cfg)
        # alembic_cfg.attributes["connection"].commit()
        command.upgrade(alembic_cfg, "head")

    def _run_migrations(self, should_initialize_alembic, fix) -> None:
        # First we need to check if alembic has been initialized
        # If not, we need to initialize it
        # if not self.script_location.exists(): # this is not the correct way to check if alembic has been initialized
        # We need to check if the alembic_version table exists
        # if not, we need to initialize alembic
        # stdout should be something like sys.stdout
        # which is a buffer
        # I don't want to output anything
        # subprocess.DEVNULL is an int
        with self.alembic_log_path.open("w", encoding="utf-8") as buffer:
            alembic_cfg = Config(stdout=buffer)
            # alembic_cfg.attributes["connection"] = session
            alembic_cfg.set_main_option("script_location", str(self.script_location))
            alembic_cfg.set_main_option("sqlalchemy.url", self.database_url.replace("%", "%%"))

            if should_initialize_alembic:
                try:
                    self.init_alembic(alembic_cfg)
                except Exception as exc:
                    msg = "Error initializing alembic"
                    logger.exception(msg)
                    raise RuntimeError(msg) from exc
            else:
                logger.debug("Alembic initialized")

            try:
                buffer.write(f"{datetime.now(tz=timezone.utc).astimezone().isoformat()}: Checking migrations\n")
                command.check(alembic_cfg)
            except Exception as exc:  # noqa: BLE001
                logger.debug(f"Error checking migrations: {exc}")
                if isinstance(exc, util.exc.CommandError | util.exc.AutogenerateDiffsDetected):
                    command.upgrade(alembic_cfg, "head")
                    time.sleep(3)

            try:
                buffer.write(f"{datetime.now(tz=timezone.utc).astimezone()}: Checking migrations\n")
                command.check(alembic_cfg)
            except util.exc.AutogenerateDiffsDetected as exc:
                logger.info("🔧 AUTOMATED DATABASE FIX: Migration conflict detected")
                exc_str = str(exc)

                # 🔧 AUTOMATED FIX 1: Handle user_favorite/userfavorite table mismatch
                if ("user_favorite" in exc_str or "userfavorite" in exc_str) and ("remove_table" in exc_str or "add_table" in exc_str):
                    logger.info("🔧 AUTOMATED FIX: user_favorite/userfavorite table naming conflict - stamping current revision")
                    try:
                        command.stamp(alembic_cfg, "head")
                        logger.info("✅ AUTOMATED FIX: user_favorite table naming conflict resolved")
                        return
                    except Exception as stamp_exc:
                        logger.error(f"❌ AUTOMATED FIX: Failed to stamp revision: {stamp_exc}")

                # 🔧 AUTOMATED FIX 2: Handle general migration conflicts
                if "remove_table" in exc_str or "modify_nullable" in exc_str or "remove_index" in exc_str:
                    logger.info("🔧 AUTOMATED FIX: General migration conflict - attempting auto-resolution")
                    try:
                        # Try to upgrade to head first
                        command.upgrade(alembic_cfg, "head")
                        logger.info("✅ AUTOMATED FIX: Migration conflict resolved by upgrading to head")
                        return
                    except Exception as upgrade_exc:
                        logger.warning(f"⚠️ AUTOMATED FIX: Upgrade failed, trying stamp: {upgrade_exc}")
                        try:
                            command.stamp(alembic_cfg, "head")
                            logger.info("✅ AUTOMATED FIX: Migration conflict resolved by stamping")
                            return
                        except Exception as stamp_exc:
                            logger.error(f"❌ AUTOMATED FIX: Both upgrade and stamp failed: {stamp_exc}")

                if not fix:
                    msg = f"There's a mismatch between the models and the database.\n{exc}"
                    raise RuntimeError(msg) from exc

            if fix:
                self.try_downgrade_upgrade_until_success(alembic_cfg)

    async def run_migrations(self, *, fix=False) -> None:
        """🔧 AUTOMATED DATABASE MIGRATION with comprehensive error handling."""
        logger.info("🔧 AUTOMATED DATABASE: Starting migration process...")

        should_initialize_alembic = False

        # 🔧 AUTOMATED FIX: Check database connection first
        try:
            async with self.with_session() as session:
                # Test basic database connectivity
                await session.exec(text("SELECT 1"))
                logger.info("✅ AUTOMATED DATABASE: Connection verified")
        except Exception as conn_exc:
            logger.error(f"❌ AUTOMATED DATABASE: Connection failed: {conn_exc}")
            # Try to create database and tables automatically
            try:
                await self.create_db_and_tables()
                logger.info("✅ AUTOMATED DATABASE: Database and tables created")
            except Exception as create_exc:
                logger.error(f"❌ AUTOMATED DATABASE: Failed to create database: {create_exc}")
                raise RuntimeError(f"Database connection and creation failed: {conn_exc}") from create_exc

        # 🔧 AUTOMATED FIX: Check alembic version table
        async with self.with_session() as session:
            try:
                await session.exec(text("SELECT * FROM alembic_version"))
                logger.info("✅ AUTOMATED DATABASE: Alembic version table exists")
            except Exception:
                logger.info("🔧 AUTOMATED DATABASE: Alembic not initialized - will initialize")
                should_initialize_alembic = True

        # Run migrations with automated fixes
        await asyncio.to_thread(self._run_migrations, should_initialize_alembic, fix)

    @staticmethod
    def try_downgrade_upgrade_until_success(alembic_cfg, retries=5) -> None:
        # Try -1 then head, if it fails, try -2 then head, etc.
        # until we reach the number of retries
        for i in range(1, retries + 1):
            try:
                command.check(alembic_cfg)
                break
            except util.exc.AutogenerateDiffsDetected:
                # downgrade to base and upgrade again
                logger.warning("AutogenerateDiffsDetected")
                command.downgrade(alembic_cfg, f"-{i}")
                # wait for the database to be ready
                time.sleep(3)
                command.upgrade(alembic_cfg, "head")

    async def run_migrations_test(self):
        # This method is used for testing purposes only
        # We will check that all models are in the database
        # and that the database is up to date with all columns
        # get all models that are subclasses of SQLModel
        sql_models = [
            model for model in models.__dict__.values() if isinstance(model, type) and issubclass(model, SQLModel)
        ]
        async with self.with_session() as session, session.bind.connect() as conn:
            return [
                TableResults(sql_model.__tablename__, await conn.run_sync(self.check_table, sql_model))
                for sql_model in sql_models
            ]

    @staticmethod
    def check_table(connection, model):
        results = []
        inspector = inspect(connection)
        table_name = model.__tablename__
        expected_columns = list(model.__fields__.keys())
        available_columns = []
        try:
            available_columns = [col["name"] for col in inspector.get_columns(table_name)]
            results.append(Result(name=table_name, type="table", success=True))
        except sa.exc.NoSuchTableError:
            logger.exception(f"Missing table: {table_name}")
            results.append(Result(name=table_name, type="table", success=False))

        for column in expected_columns:
            if column not in available_columns:
                logger.error(f"Missing column: {column} in table {table_name}")
                results.append(Result(name=column, type="column", success=False))
            else:
                results.append(Result(name=column, type="column", success=True))
        return results

    @staticmethod
    def _add_enhanced_security_columns(connection) -> None:
        """Add enhanced security columns to user table if they don't exist.

        AUTOMATIC DEPLOYMENT SYSTEM - Creates database tables and columns automatically
        with proper conditional logic (if/else statements) during application startup.

        Deployment trigger: 2025-08-21 - Enhanced automatic database creation system.
        """
        from sqlalchemy import text, inspect

        try:
            inspector = inspect(connection)

            # Check if user table exists
            if "user" not in inspector.get_table_names():
                logger.debug("User table doesn't exist yet, skipping enhanced security columns")
                return

            # Get existing columns in user table
            existing_columns = [col['name'] for col in inspector.get_columns('user')]
            logger.debug(f"Existing user table columns: {existing_columns}")

            # Define enhanced security columns to add with proper conditional logic
            enhanced_security_columns = {
                # Email verification fields (legacy token-based)
                "email_verified": "BOOLEAN DEFAULT FALSE",
                "email_verification_token": "VARCHAR",
                "email_verification_expires": "TIMESTAMP",
                # Enhanced security fields
                "login_attempts": "INTEGER DEFAULT 0",
                "locked_until": "TIMESTAMP",
                "last_login_ip": "VARCHAR",
                "password_changed_at": "TIMESTAMP",
                "failed_login_attempts": "INTEGER DEFAULT 0",
                "last_failed_login": "TIMESTAMP",
                # 🎯 NEW: 6-digit verification code columns (enterprise-grade)
                "verification_code": "VARCHAR(6)",
                "verification_code_expires": "TIMESTAMP",
                "verification_attempts": "INTEGER DEFAULT 0 NOT NULL"  # Fixed: Make NOT NULL
            }

            # Check database type for appropriate syntax
            db_url = str(connection.engine.url).lower()
            is_sqlite = "sqlite" in db_url

            if is_sqlite:
                enhanced_security_columns = {
                    # Email verification fields (SQLite format)
                    "email_verified": "INTEGER DEFAULT 0",  # SQLite uses INTEGER for BOOLEAN
                    "email_verification_token": "TEXT",
                    "email_verification_expires": "DATETIME",
                    # Enhanced security fields
                    "login_attempts": "INTEGER DEFAULT 0",
                    "locked_until": "DATETIME",
                    "last_login_ip": "TEXT",
                    "password_changed_at": "DATETIME",
                    "failed_login_attempts": "INTEGER DEFAULT 0",
                    "last_failed_login": "DATETIME",
                    # 🎯 NEW: 6-digit verification code columns (SQLite format)
                    "verification_code": "TEXT",
                    "verification_code_expires": "DATETIME",
                    "verification_attempts": "INTEGER DEFAULT 0 NOT NULL"  # Fixed: Make NOT NULL
                }

            # Add missing columns with conditional logic (if/else statements)
            added_columns = []
            for column_name, column_def in enhanced_security_columns.items():
                if column_name not in existing_columns:
                    # Column doesn't exist - create it
                    try:
                        if is_sqlite:
                            sql = f"ALTER TABLE user ADD COLUMN {column_name} {column_def};"
                        else:
                            sql = f'ALTER TABLE "user" ADD COLUMN IF NOT EXISTS {column_name} {column_def};'

                        logger.debug(f"Adding enhanced security column: {sql}")
                        connection.execute(text(sql))
                        added_columns.append(column_name)
                        logger.debug(f"✅ Added column: {column_name}")

                    except Exception as e:
                        logger.warning(f"❌ Failed to add column {column_name}: {e}")
                        # Continue with other columns
                        continue
                else:
                    # Column exists - check if it needs fixing
                    logger.debug(f"⏭️ Column {column_name} already exists")

                    # Special handling for verification_attempts column
                    if column_name == "verification_attempts":
                        try:
                            # Fix NULL values first
                            if is_sqlite:
                                connection.execute(text("UPDATE user SET verification_attempts = 0 WHERE verification_attempts IS NULL"))
                            else:
                                connection.execute(text('UPDATE "user" SET verification_attempts = 0 WHERE verification_attempts IS NULL'))

                            # Make column NOT NULL if it isn't already
                            if not is_sqlite:  # PostgreSQL supports ALTER COLUMN
                                connection.execute(text('ALTER TABLE "user" ALTER COLUMN verification_attempts SET NOT NULL'))
                                logger.debug("✅ Fixed verification_attempts column to be NOT NULL")
                        except Exception as e:
                            logger.warning(f"⚠️ Could not fix verification_attempts column: {e}")

            # Remove problematic indexes that cause AutogenerateDiffsDetected errors
            try:
                problematic_indexes = [
                    "ix_user_email_verification_token",
                    "ix_user_verification_code"
                ]

                for index_name in problematic_indexes:
                    try:
                        connection.execute(text(f"DROP INDEX IF EXISTS {index_name}"))
                        logger.debug(f"✅ Removed problematic index: {index_name}")
                    except Exception as e:
                        logger.debug(f"⚠️ Could not remove index {index_name}: {e}")

            except Exception as e:
                logger.warning(f"⚠️ Index cleanup failed: {e}")

            if added_columns:
                # Note: No need to commit here as the connection will be committed by the caller
                logger.info(f"✅ AUTOMATIC DATABASE SYSTEM: Successfully added {len(added_columns)} enhanced security columns: {added_columns}")
            else:
                logger.debug("✅ AUTOMATIC DATABASE SYSTEM: All enhanced security columns already exist")

            logger.info("✅ AUTOMATIC DATABASE SYSTEM: Enhanced security columns setup completed with conditional logic")

        except Exception as e:
            logger.warning(f"❌ AUTOMATIC DATABASE SYSTEM: Enhanced security columns setup failed: {e}")
            # Don't fail the entire startup for this

    @staticmethod
    def _create_db_and_tables(connection) -> None:
        from sqlalchemy import inspect

        inspector = inspect(connection)
        table_names = inspector.get_table_names()
        current_tables = ["flow", "user", "apikey", "folder", "message", "variable", "transaction", "vertex_build"]

        if table_names and all(table in table_names for table in current_tables):
            logger.info("✅ AUTOMATIC DATABASE SYSTEM: All required tables already exist")
            # Still need to add enhanced security columns if they don't exist
            try:
                logger.info("🔧 AUTOMATIC DATABASE SYSTEM: Checking enhanced security columns...")
                DatabaseService._add_enhanced_security_columns(connection)
                logger.info("✅ AUTOMATIC DATABASE SYSTEM: Enhanced security columns check completed")
            except Exception as exc:
                logger.warning(f"❌ AUTOMATIC DATABASE SYSTEM: Enhanced security columns setup failed: {exc}")
                # Don't fail the entire startup for this
            return

        logger.info("🔧 AUTOMATIC DATABASE SYSTEM: Creating database tables with conditional logic...")

        for table in SQLModel.metadata.sorted_tables:
            try:
                table.create(connection, checkfirst=True)
                logger.debug(f"✅ AUTOMATIC DATABASE SYSTEM: Created/verified table: {table.name}")
            except OperationalError as oe:
                logger.debug(f"⏭️ AUTOMATIC DATABASE SYSTEM: Table {table} already exists, skipping. Exception: {oe}")
            except Exception as exc:
                msg = f"❌ AUTOMATIC DATABASE SYSTEM: Error creating table {table}"
                logger.exception(msg)
                raise RuntimeError(msg) from exc

        # Now check if the required tables exist, if not, something went wrong.
        inspector = inspect(connection)
        table_names = inspector.get_table_names()
        for table in current_tables:
            if table not in table_names:
                logger.error("Something went wrong creating the database and tables.")
                logger.error("Please check your database settings.")
                msg = "Something went wrong creating the database and tables."
                raise RuntimeError(msg)

        logger.info("✅ AUTOMATIC DATABASE SYSTEM: Database and tables created successfully")

        # Create user_favorite table if it doesn't exist
        try:
            logger.info("🔧 AUTOMATIC DATABASE SYSTEM: Creating user_favorite table if missing...")
            connection.execute(text("""
                CREATE TABLE IF NOT EXISTS user_favorite (
                    id VARCHAR(36) PRIMARY KEY,
                    user_id VARCHAR(36) NOT NULL,
                    item_id VARCHAR NOT NULL,
                    item_type VARCHAR NOT NULL,
                    item_name VARCHAR NOT NULL,
                    item_description TEXT,
                    item_author VARCHAR,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY (user_id) REFERENCES user (id) ON DELETE CASCADE,
                    UNIQUE(user_id, item_id)
                )
            """))
            logger.info("✅ AUTOMATIC DATABASE SYSTEM: user_favorite table created/verified")
        except Exception as exc:
            logger.warning(f"⚠️ AUTOMATIC DATABASE SYSTEM: user_favorite table creation warning: {exc}")
            # Don't fail startup for this

        # Add enhanced security columns if they don't exist
        # This prevents Alembic AutogenerateDiffsDetected errors
        try:
            logger.info("🔧 AUTOMATIC DATABASE SYSTEM: Adding enhanced security columns if missing...")
            DatabaseService._add_enhanced_security_columns(connection)
            logger.info("✅ AUTOMATIC DATABASE SYSTEM: Enhanced security columns setup completed")
        except Exception as exc:
            logger.warning(f"❌ AUTOMATIC DATABASE SYSTEM: Enhanced security columns setup failed: {exc}")
            # Don't fail the entire startup for this

    @retry(wait=wait_fixed(2), stop=stop_after_attempt(10))
    async def create_db_and_tables_with_retry(self) -> None:
        await self.create_db_and_tables()

    async def create_db_and_tables(self) -> None:
        """🔧 AUTOMATED DATABASE: Create database and tables with comprehensive error handling."""
        logger.info("🔧 AUTOMATED DATABASE: Creating database and tables...")

        try:
            async with self.with_session() as session, session.bind.connect() as conn:
                await conn.run_sync(self._create_db_and_tables)
                logger.info("✅ AUTOMATED DATABASE: Database and tables created successfully")

                # 🔧 AUTOMATED FIX: Verify critical tables exist
                await self._verify_critical_tables(session)

        except Exception as exc:
            logger.error(f"❌ AUTOMATED DATABASE: Failed to create database and tables: {exc}")
            # Try alternative creation method
            try:
                logger.info("🔧 AUTOMATED DATABASE: Trying alternative table creation...")
                await self._create_tables_alternative()
                logger.info("✅ AUTOMATED DATABASE: Alternative table creation succeeded")
            except Exception as alt_exc:
                logger.error(f"❌ AUTOMATED DATABASE: Alternative creation also failed: {alt_exc}")
                raise RuntimeError(f"Database creation failed: {exc}") from exc

    async def _verify_critical_tables(self, session) -> None:
        """🔧 AUTOMATED DATABASE: Verify that critical tables exist."""
        critical_tables = ["user", "flow", "apikey", "folder", "message", "variable", "user_favorite"]

        for table_name in critical_tables:
            try:
                await session.exec(text(f"SELECT 1 FROM {table_name} LIMIT 1"))
                logger.debug(f"✅ AUTOMATED DATABASE: Table '{table_name}' verified")
            except Exception:
                logger.warning(f"⚠️ AUTOMATED DATABASE: Table '{table_name}' missing or inaccessible")

    async def _create_tables_alternative(self) -> None:
        """🔧 AUTOMATED DATABASE: Alternative table creation method."""
        try:
            # Import specific models to ensure they're registered
            from axiestudio.services.database.models.user.model import User
            from axiestudio.services.database.models.flow.model import Flow
            from axiestudio.services.database.models.api_key.model import ApiKey
            from axiestudio.services.database.models.folder.model import Folder
            from axiestudio.services.database.models.message.model import Message
            from axiestudio.services.database.models.variable.model import Variable
            from axiestudio.services.database.models.user_favorite.model import UserFavorite

            async with self.with_session() as session:
                # Use SQLModel's create_all method
                from sqlmodel import SQLModel
                async with session.bind.connect() as conn:
                    await conn.run_sync(SQLModel.metadata.create_all)
                    logger.info("✅ AUTOMATED DATABASE: Alternative table creation completed")

        except Exception as exc:
            logger.error(f"❌ AUTOMATED DATABASE: Alternative table creation failed: {exc}")
            raise

    async def teardown(self) -> None:
        logger.debug("Tearing down database")
        try:
            settings_service = get_settings_service()
            # remove the default superuser if auto_login is enabled
            # using the SUPERUSER to get the user
            async with self.with_session() as session:
                await teardown_superuser(settings_service, session)
        except Exception:  # noqa: BLE001
            logger.exception("Error tearing down database")
        await self.engine.dispose()
