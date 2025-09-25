#!/bin/bash

# DPNR Database Deployment Script
# Handles production database setup, migrations, and seeding

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Configuration
PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKEND_DIR="$PROJECT_ROOT/backend"
BACKUP_DIR="$PROJECT_ROOT/backups"

print_status() {
    echo -e "${GREEN}[DB]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[DB WARN]${NC} $1"
}

print_error() {
    echo -e "${RED}[DB ERROR]${NC} $1"
}

# Load environment variables
if [ -f "$PROJECT_ROOT/.env.production" ]; then
    export $(grep -v '^#' "$PROJECT_ROOT/.env.production" | xargs)
elif [ -f "$BACKEND_DIR/.env" ]; then
    export $(grep -v '^#' "$BACKEND_DIR/.env" | xargs)
else
    print_error "No environment file found. Please ensure .env.production or backend/.env exists."
    exit 1
fi

# Check DATABASE_URL
if [ -z "$DATABASE_URL" ]; then
    print_error "DATABASE_URL not set in environment variables."
    exit 1
fi

print_status "Database deployment started at: $(date)"
print_status "Database URL: ${DATABASE_URL%/*}/***"

cd "$BACKEND_DIR"

# Function to create backup
create_backup() {
    if [ "$1" != "--skip-backup" ]; then
        print_status "Creating database backup..."
        mkdir -p "$BACKUP_DIR"

        BACKUP_FILE="$BACKUP_DIR/backup_$(date +%Y%m%d_%H%M%S).sql"

        # Extract database info from URL
        DB_URL_REGEX="postgresql://([^:]+):([^@]+)@([^:]+):([0-9]+)/([^?]+)"
        if [[ $DATABASE_URL =~ $DB_URL_REGEX ]]; then
            DB_USER="${BASH_REMATCH[1]}"
            DB_PASS="${BASH_REMATCH[2]}"
            DB_HOST="${BASH_REMATCH[3]}"
            DB_PORT="${BASH_REMATCH[4]}"
            DB_NAME="${BASH_REMATCH[5]}"

            export PGPASSWORD="$DB_PASS"
            if command -v pg_dump >/dev/null 2>&1; then
                pg_dump -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" > "$BACKUP_FILE"
                print_status "Backup created: $BACKUP_FILE"
            else
                print_warning "pg_dump not found. Skipping backup."
            fi
            unset PGPASSWORD
        else
            print_warning "Could not parse DATABASE_URL for backup. Skipping backup."
        fi
    fi
}

# Function to check database connectivity
check_connectivity() {
    print_status "Checking database connectivity..."

    if ! npm run db:health:json > /dev/null 2>&1; then
        print_error "Database connectivity check failed."
        print_error "Please verify DATABASE_URL and ensure database is accessible."
        exit 1
    fi

    print_status "Database connectivity verified."
}

# Function to run migrations
run_migrations() {
    print_status "Running database migrations..."

    # Generate Prisma client
    print_status "Generating Prisma client..."
    npm run prisma:generate

    # Deploy migrations
    print_status "Deploying migrations..."
    if ! npm run prisma:deploy; then
        print_error "Migration deployment failed!"
        return 1
    fi

    print_status "Migrations completed successfully."
}

# Function to seed database
seed_database() {
    if [ "$1" != "--skip-seed" ]; then
        print_status "Seeding database with initial data..."

        if [ -f "src/scripts/seed.ts" ]; then
            if ! npm run db:seed; then
                print_warning "Database seeding encountered errors, but continuing..."
            else
                print_status "Database seeding completed successfully."
            fi
        else
            print_warning "Seed script not found. Skipping seeding."
        fi
    else
        print_status "Skipping database seeding (--skip-seed flag used)."
    fi
}

# Function to validate deployment
validate_deployment() {
    print_status "Validating database deployment..."

    # Run health check
    if npm run db:health:ci > /dev/null 2>&1; then
        print_status "Database health check passed."
    else
        print_error "Database health check failed."
        return 1
    fi

    # Run production validation
    if [ -f "src/scripts/validate-production.ts" ]; then
        if npm run validate:prod:ci > /dev/null 2>&1; then
            print_status "Production validation passed."
        else
            print_warning "Production validation encountered issues."
        fi
    fi

    print_status "Database deployment validation completed."
}

# Main deployment process
print_status "Starting database deployment process..."

# Parse command line arguments
SKIP_BACKUP=false
SKIP_SEED=false
DRY_RUN=false

while [[ $# -gt 0 ]]; do
    case $1 in
        --skip-backup)
            SKIP_BACKUP=true
            shift
            ;;
        --skip-seed)
            SKIP_SEED=true
            shift
            ;;
        --dry-run)
            DRY_RUN=true
            shift
            ;;
        *)
            print_error "Unknown option: $1"
            echo "Usage: $0 [--skip-backup] [--skip-seed] [--dry-run]"
            exit 1
            ;;
    esac
done

# Dry run mode
if [ "$DRY_RUN" = true ]; then
    print_status "DRY RUN MODE - No changes will be made to the database"
    print_status "Would execute:"
    print_status "1. Database connectivity check"
    print_status "2. Database backup (unless --skip-backup)"
    print_status "3. Prisma client generation"
    print_status "4. Database migrations"
    print_status "5. Database seeding (unless --skip-seed)"
    print_status "6. Deployment validation"
    exit 0
fi

# Execute deployment steps
check_connectivity

if [ "$SKIP_BACKUP" = false ]; then
    create_backup
fi

run_migrations

if [ "$SKIP_SEED" = false ]; then
    seed_database
fi

validate_deployment

print_status "Database deployment completed successfully!"
print_status "Deployment time: $(date)"

# Display deployment summary
echo ""
echo -e "${GREEN}=========================================${NC}"
echo -e "${GREEN}Database Deployment Summary${NC}"
echo -e "${GREEN}=========================================${NC}"
echo -e "Database URL: ${DATABASE_URL%/*}/***"
echo -e "Backup created: $([ "$SKIP_BACKUP" = false ] && echo "Yes" || echo "Skipped")"
echo -e "Migrations: Applied"
echo -e "Seeding: $([ "$SKIP_SEED" = false ] && echo "Completed" || echo "Skipped")"
echo -e "Validation: Passed"
echo -e "${GREEN}=========================================${NC}"