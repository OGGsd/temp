<!-- markdownlint-disable MD030 -->
<!-- Database Fix Deployment Trigger - 2025-08-21 -->

![Axie Studio logo](./docs/static/img/axiestudio-logo-color-black-solid.svg)


[![Release Notes](https://img.shields.io/github/release/axiestudio/axiestudio?style=flat-square)](https://github.com/axiestudio/axiestudio/releases)
[![PyPI - License](https://img.shields.io/badge/license-MIT%20(Open%20Source)-green)](https://opensource.org/licenses/MIT)
[![PyPI - Downloads](https://img.shields.io/pypi/dm/axiestudio?style=flat-square)](https://pypistats.org/packages/axiestudio)
[![GitHub star chart](https://img.shields.io/github/stars/axiestudio/axiestudio?style=flat-square)](https://star-history.com/#axiestudio/axiestudio)
[![Open Issues](https://img.shields.io/github/issues-raw/axiestudio/axiestudio?style=flat-square)](https://github.com/axiestudio/axiestudio/issues)
[![Docker Hub](https://img.shields.io/docker/pulls/axiestudio/axiestudio?style=flat-square)](https://hub.docker.com/r/axiestudio/axiestudio)

[Axie Studio](https://axiestudio.org) is a powerful tool for building and deploying AI-powered agents and workflows. It provides developers with both a visual authoring experience and built-in API and MCP servers that turn every workflow into a tool that can be integrated into applications built on any framework or stack. Axie Studio comes with batteries included and supports all major LLMs, vector databases and a growing library of AI tools.

## ✨ Highlight features

- **Visual builder interface** to quickly get started and iterate.
- **Source code access** lets you customize any component using Python.
- **Interactive playground** to immediately test and refine your flows with step-by-step control.
- **Multi-agent orchestration** with conversation management and retrieval.
- **Deploy as an API** or export as JSON for Python apps.
- **Deploy as an MCP server** and turn your flows into tools for MCP clients.
- **Integrated Store** with one-click flow import and modern search functionality.
- **Observability** with LangSmith, LangFuse and other integrations.
- **Enterprise-ready** security and scalability.

## ⚡️ Quickstart

Axie Studio requires [Python 3.10 to 3.13](https://www.python.org/downloads/release/python-3100/) and [uv](https://docs.astral.sh/uv/getting-started/installation/).

1. To install Axie Studio, run:

```shell
uv pip install axiestudio -U
```

2. To run Axie Studio, run:

```shell
uv run axiestudio run
```

3. Go to the default Axie Studio URL at `http://127.0.0.1:7860`.

For more information about installing Axie Studio, including Docker and Desktop options, see [Install Axie Studio](https://docs.axiestudio.org/get-started-installation).

## 🏪 Axie Studio Store

Axie Studio now includes an integrated store for discovering and importing community flows and components:

### ✨ Store Features

- **🔍 Smart Search** - Find flows and components with real-time search across names, descriptions, authors, and tags
- **🎯 One-Click Import** - "Grab Flow" functionality to instantly add flows to your workspace
- **🎨 Modern UI** - Clean, professional black and white design optimized for productivity
- **📱 Responsive Design** - Works seamlessly on desktop, tablet, and mobile devices
- **🚀 Toolbar Integration** - Quick access via Store button in the flow toolbar
- **🔄 Live Updates** - Real-time filtering and sorting for efficient browsing

### 🛠️ How to Use the Store

1. **Access the Store** - Click the "Store" button in any flow page toolbar
2. **Search & Filter** - Use the search bar or filter by Flows/Components
3. **Preview** - Click "Preview" to see flow details before importing
4. **Import** - Click "Grab Flow" to add flows directly to your workspace
5. **Start Building** - Imported flows open automatically for immediate use

### 🎯 Store Configuration

The store is enabled by default. To disable it, set:

```bash
# Disable store features
ENABLE_AXIESTUDIO_STORE="false"
```

## 🐳 Docker

You can run Axie Studio using Docker:

```shell
docker run -it --rm -p 7860:7860 axiestudio/axiestudiov1:latest
```

## 🚀 Deploy

Deploy Axie Studio on your preferred cloud platform:

- [DigitalOcean App Platform](./DEPLOYMENT.md)
- [Railway](./RAILWAY_ENV.md)
- [Docker Hub](https://hub.docker.com/r/axiestudio/axiestudio)

## 🗄️ Automatic Database Management System

AxieStudio features an **enterprise-grade automatic database creation system** that automatically handles database schema updates and table creation **during application startup** with proper conditional logic (if/else statements).

### **🚀 Automatic Table Creation System**

The application **automatically creates and manages database tables** during deployment/startup:

✅ **Automatic Table Creation** - Creates missing tables automatically during startup
✅ **Conditional Logic** - Uses proper if/else statements to check table/column existence
✅ **Schema Validation** - Ensures all required columns exist with proper types
✅ **Error Handling** - Graceful handling of database issues without startup failure
✅ **Multi-Database Support** - Works with PostgreSQL, MySQL, and SQLite
✅ **Production Ready** - Safe for production deployments with zero downtime

### **🔧 How It Works**

The automatic system runs during application startup and:

1. **Checks existing tables** - Uses conditional logic to detect missing tables
2. **Creates missing tables** - Automatically creates required tables if they don't exist
3. **Adds missing columns** - Ensures all email verification and security columns exist
4. **Fixes schema issues** - Automatically resolves common schema mismatches
5. **Removes problematic indexes** - Cleans up indexes that cause migration conflicts

```python
# Automatic conditional logic example from the codebase:
if table_name not in existing_tables:
    # Table doesn't exist - create it automatically
    logger.info(f"🔧 Creating table '{table_name}'...")
    await create_function(session)
else:
    # Table exists - verify columns
    logger.info(f"✅ Table '{table_name}' already exists - checking columns...")
```

### **📊 Database Migration Scripts**

For manual database management and troubleshooting:

```bash
# Check database status
python temp/database_migration_script.py status

# Run enhanced migration
python temp/database_migration_script.py migrate

# Run comprehensive setup
python temp/enhanced_auto_migration_manager.py

# Show help
python temp/database_migration_script.py help
```

### **📋 Complete SQL Commands Reference**

All SQL commands used by the automatic database system (for manual execution if needed):

#### **🔧 Email Verification Columns**
```sql
-- Add email verification columns
ALTER TABLE "user" ADD COLUMN IF NOT EXISTS email_verified BOOLEAN DEFAULT FALSE;
ALTER TABLE "user" ADD COLUMN IF NOT EXISTS email_verification_token VARCHAR;
ALTER TABLE "user" ADD COLUMN IF NOT EXISTS email_verification_expires TIMESTAMP;

-- Add 6-digit verification code columns (Enterprise)
ALTER TABLE "user" ADD COLUMN IF NOT EXISTS verification_code VARCHAR(6);
ALTER TABLE "user" ADD COLUMN IF NOT EXISTS verification_code_expires TIMESTAMP;
ALTER TABLE "user" ADD COLUMN IF NOT EXISTS verification_attempts INTEGER DEFAULT 0 NOT NULL;
```

#### **🔒 Security Enhancement Columns**
```sql
-- Add security tracking columns
ALTER TABLE "user" ADD COLUMN IF NOT EXISTS login_attempts INTEGER DEFAULT 0;
ALTER TABLE "user" ADD COLUMN IF NOT EXISTS locked_until TIMESTAMP;
ALTER TABLE "user" ADD COLUMN IF NOT EXISTS last_login_ip VARCHAR;
ALTER TABLE "user" ADD COLUMN IF NOT EXISTS password_changed_at TIMESTAMP;
ALTER TABLE "user" ADD COLUMN IF NOT EXISTS failed_login_attempts INTEGER DEFAULT 0;
ALTER TABLE "user" ADD COLUMN IF NOT EXISTS last_failed_login TIMESTAMP;
```

#### **💳 Subscription Management Columns**
```sql
-- Add subscription columns
ALTER TABLE "user" ADD COLUMN IF NOT EXISTS stripe_customer_id VARCHAR;
ALTER TABLE "user" ADD COLUMN IF NOT EXISTS subscription_status VARCHAR DEFAULT 'trial';
ALTER TABLE "user" ADD COLUMN IF NOT EXISTS subscription_id VARCHAR;
ALTER TABLE "user" ADD COLUMN IF NOT EXISTS trial_start TIMESTAMP;
ALTER TABLE "user" ADD COLUMN IF NOT EXISTS trial_end TIMESTAMP;
ALTER TABLE "user" ADD COLUMN IF NOT EXISTS subscription_start TIMESTAMP;
ALTER TABLE "user" ADD COLUMN IF NOT EXISTS subscription_end TIMESTAMP;
```

#### **🔧 Schema Fixes**
```sql
-- Fix verification_attempts column (make NOT NULL)
UPDATE "user" SET verification_attempts = 0 WHERE verification_attempts IS NULL;
ALTER TABLE "user" ALTER COLUMN verification_attempts SET NOT NULL;

-- Remove problematic indexes
DROP INDEX IF EXISTS ix_user_email_verification_token;
DROP INDEX IF EXISTS ix_user_verification_code;
```

#### **📊 Verification Commands**
```sql
-- Check all email verification columns
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'user'
AND column_name IN (
    'email_verified', 'email_verification_token', 'email_verification_expires',
    'verification_code', 'verification_code_expires', 'verification_attempts',
    'login_attempts', 'locked_until', 'last_login_ip',
    'password_changed_at', 'failed_login_attempts', 'last_failed_login'
)
ORDER BY column_name;

-- Check table structure
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'user'
ORDER BY ordinal_position;

-- Verify indexes
SELECT indexname FROM pg_indexes WHERE tablename = 'user';
```

### **🚀 Automatic Deployment System**

The application includes an **automatic deployment system** that handles database setup during startup:

#### **Startup Process:**
1. **Application starts** → Automatic database initialization begins
2. **Check database connection** → Verify database accessibility
3. **Scan existing tables** → Use conditional logic to detect missing tables
4. **Create missing tables** → Automatically create required tables if they don't exist
5. **Add missing columns** → Ensure all email verification columns exist
6. **Fix schema issues** → Resolve common schema mismatches automatically
7. **Clean up indexes** → Remove problematic indexes that cause conflicts
8. **Application ready** → Database is fully configured and ready

#### **Conditional Logic Examples:**
```python
# Table creation logic
if "user" not in existing_tables:
    logger.info("🔧 Creating user table...")
    create_user_table()
else:
    logger.info("✅ User table exists - checking columns...")

# Column addition logic
if column_name not in existing_columns:
    logger.info(f"🔧 Adding missing column: {column_name}")
    add_column(column_name, column_definition)
else:
    logger.debug(f"✅ Column '{column_name}' already exists")
```

#### **Production Safety:**
- ✅ **Non-destructive** - Never drops or modifies existing data
- ✅ **Idempotent** - Safe to run multiple times
- ✅ **Rollback safe** - Uses transactions for atomic operations
- ✅ **Error handling** - Graceful failure without breaking startup
- ✅ **Logging** - Comprehensive logging of all operations

### **Database API Endpoints**

```bash
# Database management endpoints (admin only)
GET /api/v1/database/status              # Database status
GET /api/v1/database/tables              # List all tables
GET /api/v1/database/migration-status    # Migration status
POST /api/v1/database/auto-create-tables # Create missing tables
POST /api/v1/database/run-migration      # Run full migration
GET /api/v1/database/health              # Health check
```

### **Database Tables Auto-Created**

The system automatically creates these tables:
- **user** - User accounts and authentication
- **flow** - AI workflow definitions
- **folder** - Organization structure
- **apikey** - API key management
- **variable** - Global variables
- **file** - File attachments
- **message** - Chat messages
- **transaction** - Subscription transactions
- **vertex_build** - Build information
- **alembic_version** - Migration versioning

### **Migration Features**

- ✅ **Automatic Table Creation** from SQLModel definitions
- ✅ **Alembic Integration** for schema versioning
- ✅ **Migration Status Monitoring** with detailed reporting
- ✅ **Error Recovery** and rollback support
- ✅ **Comprehensive Logging** for audit trails
- ✅ **Rich CLI Interface** with progress indicators
- ✅ **Admin API** for database management
- ✅ **Health Checks** for production monitoring

### 🔧 Production Environment Configuration

For production deployments, use these environment variables:

```bash
# 🗄️ DATABASE CONFIGURATION
AXIESTUDIO_DATABASE_URL="postgresql://your_username:your_password@your-db-host:5432/your_database?sslmode=require"

# 🔐 AUTHENTICATION CONFIGURATION
AXIESTUDIO_SUPERUSER="admin@yourdomain.com"
AXIESTUDIO_SUPERUSER_PASSWORD="your_secure_password"
AXIESTUDIO_AUTO_LOGIN="false"
AXIESTUDIO_NEW_USER_IS_ACTIVE="false"  # Users must verify email to activate

# 🔒 SECURITY CONFIGURATION
AXIESTUDIO_SECRET_KEY="your-production-secret-key-change-this-in-production"

# 🌐 SERVER CONFIGURATION
AXIESTUDIO_HOST="0.0.0.0"
AXIESTUDIO_PORT="7860"
PORT="7860"

# 📊 PERFORMANCE & LOGGING
AXIESTUDIO_LOG_LEVEL="INFO"
AXIESTUDIO_WORKERS="1"

# 💾 CACHE & STORAGE
AXIESTUDIO_CACHE_TYPE="memory"

# 🏪 STORE CONFIGURATION
ENABLE_AXIESTUDIO_STORE="true"

# � EMAIL VERIFICATION CONFIGURATION
# Set to "false" to require email verification before users can login
# Users will receive activation email and must click link to activate account
AXIESTUDIO_NEW_USER_IS_ACTIVE="false"

# �💳 STRIPE CONFIGURATION (Optional - for subscription features)
STRIPE_PRICE_ID="your_stripe_price_id_here"
STRIPE_PUBLISHABLE_KEY="your_stripe_publishable_key_here"
STRIPE_SECRET_KEY="your_stripe_secret_key_here"
STRIPE_WEBHOOK_SECRET="your_stripe_webhook_secret_here"

# 📈 MONITORING
DO_NOT_TRACK="1"
```

## 🗄️ Database Migration for Subscription Features

If you're using PostgreSQL and encounter migration errors related to subscription columns, run these SQL commands in your database console:

### 📋 Step-by-Step Migration Commands

Copy and paste each command **one by one** into your PostgreSQL console:

#### 1. Add Email Column
```sql
ALTER TABLE "user" ADD COLUMN IF NOT EXISTS email VARCHAR;
```

#### 2. Add Stripe Customer ID
```sql
ALTER TABLE "user" ADD COLUMN IF NOT EXISTS stripe_customer_id VARCHAR;
```

#### 3. Add Subscription Status (with default)
```sql
ALTER TABLE "user" ADD COLUMN IF NOT EXISTS subscription_status VARCHAR DEFAULT 'trial';
```

#### 4. Add Subscription ID
```sql
ALTER TABLE "user" ADD COLUMN IF NOT EXISTS subscription_id VARCHAR;
```

#### 5. Add Trial Start Date
```sql
ALTER TABLE "user" ADD COLUMN IF NOT EXISTS trial_start TIMESTAMP;
```

#### 6. Add Trial End Date
```sql
ALTER TABLE "user" ADD COLUMN IF NOT EXISTS trial_end TIMESTAMP;
```

#### 7. Add Subscription Start Date
```sql
ALTER TABLE "user" ADD COLUMN IF NOT EXISTS subscription_start TIMESTAMP;
```

#### 8. Add Subscription End Date
```sql
ALTER TABLE "user" ADD COLUMN IF NOT EXISTS subscription_end TIMESTAMP;
```

#### 9. Create Email Index for Performance
```sql
CREATE INDEX IF NOT EXISTS ix_user_email ON "user" (email);
```

#### 10. Update Existing Users with Trial Status
```sql
UPDATE "user"
SET subscription_status = 'trial',
    trial_start = NOW()
WHERE subscription_status IS NULL;
```

#### 11. Add Email Verification Column (Required for Email Verification)
```sql
ALTER TABLE "user" ADD COLUMN IF NOT EXISTS email_verified BOOLEAN DEFAULT false;
```

#### 12. Add Active Status Column (Required for User Activation)
```sql
ALTER TABLE "user" ADD COLUMN IF NOT EXISTS active BOOLEAN DEFAULT true;
```

#### 13. Set Default Email Verified Status for Existing Users
```sql
UPDATE "user"
SET email_verified = false
WHERE email_verified IS NULL;
```

#### 14. Set Default Active Status for Existing Users
```sql
UPDATE "user"
SET active = true
WHERE active IS NULL;
```

#### 15. Create Email Verification Index for Performance
```sql
CREATE INDEX IF NOT EXISTS ix_user_email_verified ON "user" (email_verified);
```

#### 16. Create Active Status Index for Performance
```sql
CREATE INDEX IF NOT EXISTS ix_user_active ON "user" (active);
```

#### 17. Verify Email Verification Setup
```sql
SELECT email, email_verified, active
FROM "user"
LIMIT 5;
```

#### 18. Verify Migration Success
```sql
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'user' AND table_schema = 'public'
ORDER BY ordinal_position;
```

### 🎯 Migration Notes

- ✅ **Safe to run multiple times** - Uses `IF NOT EXISTS` clauses
- ✅ **No data loss** - Only adds columns, doesn't modify existing data
- ✅ **Works with any PostgreSQL** - Neon, Supabase, DigitalOcean, etc.
- ✅ **Required for subscription features** - Enables Stripe integration
- ✅ **Required for email verification** - Enables secure user activation
- ✅ **Performance optimized** - Includes indexes for fast queries

> **💡 Tip:** If you're using Neon, Supabase, or another cloud PostgreSQL service, run these commands in their web console SQL editor.

> **⚠️ Important:** Commands 11-17 are required for email verification functionality. Run them if you're implementing user email verification.

### 🔐 Production Features

- ✅ **Enterprise Database Support** (PostgreSQL, SQLite)
- ✅ **Secure Authentication** (Login required, email verification)
- ✅ **Production Security** (JWT tokens, secret keys)
- ✅ **Integrated Store** (Community flows and components)
- ✅ **Email Verification** (Secure user activation)
- ✅ **Subscription Management** (Stripe integration)
- ✅ **Optimized Performance** (Memory caching, configurable workers)

> **⚠️ Security Note:** Replace placeholder values with your actual production credentials. Keep sensitive data in environment variables, not in repositories.

## 📚 Documentation

- [Installation Guide](https://docs.axiestudio.org/get-started-installation)
- [Quickstart Tutorial](https://docs.axiestudio.org/get-started-quickstart)
- [Component Documentation](https://docs.axiestudio.org/components)
- [API Reference](https://docs.axiestudio.org/api-reference)

## 🤝 Contributing

Axie Studio is a fork of [Langflow](https://github.com/langflow-ai/langflow) with enhanced features for production use.

We welcome contributions! Please see our [Contributing Guide](./CONTRIBUTING.md) for details.

## 📄 License

This project is licensed under the MIT License (Open Source) - see the [LICENSE](./LICENSE) file for details.

## 🔒 Security

For security concerns, please see our [Security Policy](./SECURITY.md).

---

**Built with ❤️ by the Axie Studio team**

<!-- Force rebuild: 2025-08-19 -->
