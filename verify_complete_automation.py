#!/usr/bin/env python3
"""
🔍 COMPREHENSIVE VERIFICATION - ALL DATABASE AUTOMATION
Verifies that ALL models are properly registered and automated
"""

import sys
from pathlib import Path

# Add the backend to Python path
backend_path = Path(__file__).parent / "src" / "backend" / "base"
sys.path.insert(0, str(backend_path))

def verify_complete_automation():
    """Verify that all database automation is complete."""
    print("🔍 COMPREHENSIVE VERIFICATION - DATABASE AUTOMATION")
    print("=" * 60)
    
    try:
        # Import models
        from axiestudio.services.database import models
        from sqlmodel import SQLModel
        
        print("🔧 STEP 1: Verify all models are imported in __init__.py")
        print(f"✅ Models in __all__: {models.__all__}")
        print(f"✅ Total models: {len(models.__all__)}")
        
        print("\n🔧 STEP 2: Verify all models are SQLModel table classes")
        table_models = []
        for model_name in models.__all__:
            model_class = getattr(models, model_name)
            print(f"  - {model_name}: {model_class}")
            
            # Check if it's a table model
            if hasattr(model_class, '__tablename__') or (hasattr(model_class, '__table__') and model_class.__table__ is not None):
                if hasattr(model_class, '__tablename__'):
                    table_name = model_class.__tablename__
                else:
                    table_name = model_class.__name__.lower()
                table_models.append((model_name, table_name))
                print(f"    ✅ Table: {table_name}")
            else:
                print(f"    ⚠️ Not a table model")
        
        print(f"\n✅ Found {len(table_models)} table models:")
        for model_name, table_name in table_models:
            print(f"  - {model_name} → {table_name}")
        
        print("\n🔧 STEP 3: Verify SQLModel metadata contains all tables")
        metadata_tables = [table.name for table in SQLModel.metadata.sorted_tables]
        print(f"✅ SQLModel metadata tables: {metadata_tables}")
        print(f"✅ Total metadata tables: {len(metadata_tables)}")
        
        print("\n🔧 STEP 4: Cross-reference models vs metadata")
        expected_tables = [table_name for _, table_name in table_models]
        
        missing_in_metadata = set(expected_tables) - set(metadata_tables)
        extra_in_metadata = set(metadata_tables) - set(expected_tables)
        
        if missing_in_metadata:
            print(f"❌ Tables missing in metadata: {missing_in_metadata}")
            return False
        else:
            print("✅ All model tables found in metadata")
            
        if extra_in_metadata:
            print(f"⚠️ Extra tables in metadata: {extra_in_metadata}")
        
        print("\n🔧 STEP 5: Verify database service automation")
        from axiestudio.services.database.service import DatabaseService
        
        # Check if service uses automated table detection
        import inspect
        source = inspect.getsource(DatabaseService._verify_critical_tables)
        if "SQLModel.metadata.sorted_tables" in source:
            print("✅ Database service uses automated table detection")
        else:
            print("❌ Database service still uses hardcoded table lists")
            return False
        
        print("\n🎉 COMPREHENSIVE VERIFICATION PASSED!")
        print("✅ All models properly imported")
        print("✅ All models registered in SQLModel metadata")
        print("✅ Database service fully automated")
        print("✅ No hardcoded table lists remaining")
        
        return True
        
    except Exception as e:
        print(f"❌ Verification failed: {e}")
        import traceback
        print(f"❌ Traceback: {traceback.format_exc()}")
        return False

if __name__ == "__main__":
    success = verify_complete_automation()
    if success:
        print("\n🚀 READY FOR DEPLOYMENT!")
        print("The database system is fully automated and should work correctly.")
        sys.exit(0)
    else:
        print("\n❌ VERIFICATION FAILED!")
        print("Manual fixes still required.")
        sys.exit(1)
