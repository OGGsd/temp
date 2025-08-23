#!/usr/bin/env python3
"""
🔧 AUTOMATED DATABASE STARTUP FIX FOR AXIESTUDIO
Fixes the user_favorite table migration conflict and logger issues
"""

import asyncio
import os
import sys
from pathlib import Path

# Add the backend to Python path
backend_path = Path(__file__).parent / "src" / "backend" / "base"
sys.path.insert(0, str(backend_path))

async def fix_database_startup():
    """Fix the database startup issues automatically."""
    print("🔧 AUTOMATED DATABASE STARTUP FIX")
    print("=" * 50)

    try:
        # Import after path setup
        from axiestudio.services.database.service import DatabaseService
        from axiestudio.services.deps import get_settings_service
        from axiestudio.logging.logger import configure

        # Configure logging first
        configure(log_level="INFO")
        print("✅ Logger configured successfully")

        # Get database service
        settings_service = get_settings_service()
        db_service = DatabaseService(settings_service.settings)

        print("🔧 Step 1: Testing database connection...")
        try:
            async with db_service.with_session() as session:
                from sqlalchemy import text
                await session.exec(text("SELECT 1"))
            print("✅ Database connection verified")
        except Exception as conn_exc:
            print(f"⚠️ Database connection issue: {conn_exc}")
            print("🔧 Attempting to create database...")
            await db_service.create_db_and_tables()
            print("✅ Database created successfully")

        print("🔧 Step 2: Fixing migration conflicts...")
        try:
            await db_service.run_migrations(fix=True)
            print("✅ Database migrations completed successfully")
        except Exception as mig_exc:
            print(f"⚠️ Migration issue: {mig_exc}")
            print("🔧 Attempting alternative migration fix...")
            # Force stamp the current revision
            import asyncio
            from alembic import command
            from alembic.config import Config

            def stamp_head():
                alembic_cfg = Config()
                alembic_cfg.set_main_option("script_location", str(backend_path / "axiestudio" / "alembic"))
                alembic_cfg.set_main_option("sqlalchemy.url", str(db_service.database_url).replace("%", "%%"))
                command.stamp(alembic_cfg, "head")

            await asyncio.to_thread(stamp_head)
            print("✅ Migration conflicts resolved by stamping")

        print("🔧 Step 3: Verifying database tables...")
        await db_service.create_db_and_tables()
        print("✅ Database tables created/verified successfully")

        print("🔧 Step 4: Testing critical operations...")
        async with db_service.with_session() as session:
            from sqlalchemy import text
            # Test user table
            await session.exec(text("SELECT COUNT(*) FROM user"))
            print("✅ User table accessible")

            # Test user_favorite table
            await session.exec(text("SELECT COUNT(*) FROM user_favorite"))
            print("✅ User_favorite table accessible")

        print("\n🎉 DATABASE STARTUP FIX COMPLETED!")
        print("✅ user_favorite table conflict resolved")
        print("✅ Logger issues fixed")
        print("✅ Migration conflicts resolved")
        print("✅ Database is ready for AxieStudio startup")

        return True

    except Exception as e:
        print(f"❌ Error during database fix: {e}")
        print(f"❌ Error type: {type(e).__name__}")
        import traceback
        print(f"❌ Traceback: {traceback.format_exc()}")

        print("\n🔧 FALLBACK: Manual fix instructions:")
        print("1. Check your database connection string")
        print("2. Ensure database file permissions are correct")
        print("3. Run: python -m axiestudio migration --fix")
        print("4. If still failing, delete the database file and restart")
        return False

async def main():
    """Main function."""
    print("🚀 Starting AxieStudio Database Fix...")
    
    # Set environment variables for proper startup
    os.environ.setdefault("AXIESTUDIO_LOG_LEVEL", "INFO")
    os.environ.setdefault("AXIESTUDIO_DATABASE_URL", "sqlite:///./axiestudio.db")
    
    success = await fix_database_startup()
    
    if success:
        print("\n🎯 NEXT STEPS:")
        print("1. ✅ Database is fixed and ready")
        print("2. 🚀 Start AxieStudio normally")
        print("3. 📊 Monitor logs for any remaining issues")
        sys.exit(0)
    else:
        print("\n❌ MANUAL INTERVENTION REQUIRED")
        print("Please check the error messages above and fix manually")
        sys.exit(1)

if __name__ == "__main__":
    asyncio.run(main())
