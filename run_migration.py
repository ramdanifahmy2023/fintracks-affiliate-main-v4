#!/usr/bin/env python3
"""
Supabase SQL Migration Runner
Runs SQL migrations on Supabase instance
"""

import os
import sys
import subprocess
from pathlib import Path

# Supabase project config
SUPABASE_PROJECT_REF = "degfdhoxmuzmccsouxnk"
MIGRATION_FILE = "supabase/migrations/20251113_fix_debt_receivable_rls.sql"

def run_migration():
    """Run SQL migration using supabase CLI"""
    
    # Check if supabase CLI is installed
    try:
        subprocess.run(["supabase", "--version"], capture_output=True, check=True)
    except (subprocess.CalledProcessError, FileNotFoundError):
        print("Error: Supabase CLI is not installed")
        print("Install it with: npm install -g supabase")
        return False
    
    # Get project root
    script_dir = Path(__file__).parent.absolute()
    migration_path = script_dir / MIGRATION_FILE
    
    if not migration_path.exists():
        print(f"Error: Migration file not found at {migration_path}")
        return False
    
    # Read migration SQL
    with open(migration_path, 'r') as f:
        sql_content = f.read()
    
    print(f"Running migration from: {migration_path}")
    print("=" * 60)
    print(sql_content)
    print("=" * 60)
    
    # Try to run migration
    try:
        # Method 1: Using supabase db push
        print("\n[1/2] Attempting to push migration...")
        result = subprocess.run(
            ["supabase", "db", "push", "--project-ref", SUPABASE_PROJECT_REF],
            capture_output=True,
            text=True,
            timeout=30
        )
        
        if result.returncode == 0:
            print("✓ Migration pushed successfully!")
            print(result.stdout)
            return True
        else:
            print(f"Migration push failed: {result.stderr}")
    
    except subprocess.TimeoutExpired:
        print("Error: Command timed out")
        return False
    except Exception as e:
        print(f"Error running migration: {e}")
    
    print("\n" + "=" * 60)
    print("MANUAL MIGRATION REQUIRED")
    print("=" * 60)
    print("\nPlease run the following SQL in Supabase Dashboard:")
    print("1. Go to: https://supabase.com/dashboard/project/" + SUPABASE_PROJECT_REF)
    print("2. Click 'SQL Editor' in the sidebar")
    print("3. Click 'New Query'")
    print("4. Copy and paste the following SQL:")
    print("\n" + sql_content)
    print("\n5. Click 'Run'")
    
    return False

if __name__ == "__main__":
    success = run_migration()
    sys.exit(0 if success else 1)
