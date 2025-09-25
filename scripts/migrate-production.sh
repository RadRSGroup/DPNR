#!/bin/bash
set -e

# DPNR Production Database Migration Script
# Safely applies database migrations to production

echo "🗄️ DPNR Production Database Migration"
echo "===================================="
echo "Date: $(date)"
echo ""

# Configuration
PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && cd .. && pwd)"
BACKEND_DIR="$PROJECT_ROOT/backend"
BACKUP_DIR="$PROJECT_ROOT/backups"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Utility functions
log_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

log_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

log_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

log_error() {
    echo -e "${RED}❌ $1${NC}"
}

# Validation functions
validate_environment() {
    log_info "Validating environment..."
    
    cd "$BACKEND_DIR"
    
    # Check if production env file exists
    if [ ! -f ".env.production" ]; then
        log_error "Production environment file missing: .env.production"
        exit 1
    fi
    
    # Load production environment
    export $(grep -v '^#' .env.production | xargs)
    
    # Validate database URL
    if [ -z "$DATABASE_URL" ]; then
        log_error "DATABASE_URL not set in .env.production"
        exit 1
    fi
    
    log_success "Environment validated"
}

validate_database_connection() {
    log_info "Testing database connection..."
    
    cd "$BACKEND_DIR"
    
    # Test connection
    if npm run db:health:ci; then
        log_success "Database connection confirmed"
    else
        log_error "Cannot connect to database"
        exit 1
    fi
}

check_pending_migrations() {
    log_info "Checking for pending migrations..."
    
    cd "$BACKEND_DIR"
    
    # Get migration status
    local migration_output=$(npx prisma migrate status 2>&1 || true)
    
    if echo "$migration_output" | grep -q "Database schema is up to date"; then
        log_info "No pending migrations found"
        return 1
    elif echo "$migration_output" | grep -q "Following migration"; then
        log_info "Pending migrations detected:"
        echo "$migration_output"
        return 0
    else
        log_warning "Unable to determine migration status"
        echo "$migration_output"
        return 0
    fi
}

# Backup functions
create_backup() {
    log_info "Creating database backup..."
    
    # Ensure backup directory exists
    mkdir -p "$BACKUP_DIR"
    
    local backup_file="$BACKUP_DIR/dpnr_prod_backup_$TIMESTAMP.sql"
    
    # Extract database connection details
    local db_url=$(echo "$DATABASE_URL" | sed 's/@.*:/@REDACTED:/')
    log_info "Backing up database: ${db_url}"
    
    # Create backup using pg_dump
    if command -v pg_dump &> /dev/null; then
        if pg_dump "$DATABASE_URL" > "$backup_file"; then
            log_success "Backup created: $backup_file"
            echo "BACKUP_FILE=$backup_file" > "$BACKUP_DIR/.last_backup"
        else
            log_error "Failed to create database backup"
            exit 1
        fi
    else
        log_warning "pg_dump not available. Creating schema backup only..."
        npx prisma db pull --schema="$backup_file.schema" || true
        echo "SCHEMA_BACKUP=$backup_file.schema" > "$BACKUP_DIR/.last_backup"
    fi
}

verify_backup() {
    log_info "Verifying backup integrity..."
    
    local backup_file="$BACKUP_DIR/dpnr_prod_backup_$TIMESTAMP.sql"
    
    if [ -f "$backup_file" ]; then
        local backup_size=$(wc -c < "$backup_file")
        if [ "$backup_size" -gt 1000 ]; then
            log_success "Backup verification passed (${backup_size} bytes)"
        else
            log_warning "Backup file seems small (${backup_size} bytes)"
            read -p "Continue anyway? (y/N): " -n 1 -r
            echo
            if [[ ! $REPLY =~ ^[Yy]$ ]]; then
                exit 1
            fi
        fi
    else
        log_error "Backup file not found: $backup_file"
        exit 1
    fi
}

# Migration functions
run_migrations() {
    log_info "Applying database migrations..."
    
    cd "$BACKEND_DIR"
    
    # Apply migrations
    if npx prisma migrate deploy; then
        log_success "Migrations applied successfully"
    else
        log_error "Migration failed"
        
        # Offer rollback
        read -p "Do you want to restore from backup? (y/N): " -n 1 -r
        echo
        if [[ $REPLY =~ ^[Yy]$ ]]; then
            rollback_database
        fi
        exit 1
    fi
}

generate_prisma_client() {
    log_info "Generating Prisma client..."
    
    cd "$BACKEND_DIR"
    
    if npm run prisma:generate; then
        log_success "Prisma client generated successfully"
    else
        log_error "Failed to generate Prisma client"
        exit 1
    fi
}

validate_post_migration() {
    log_info "Validating database after migration..."
    
    cd "$BACKEND_DIR"
    
    # Run production validation
    if npm run validate:prod:ci; then
        log_success "Post-migration validation passed"
    else
        log_error "Post-migration validation failed"
        
        # Offer rollback
        read -p "Do you want to restore from backup? (y/N): " -n 1 -r
        echo
        if [[ $REPLY =~ ^[Yy]$ ]]; then
            rollback_database
        fi
        exit 1
    fi
}

# Rollback functions
rollback_database() {
    log_warning "Initiating database rollback..."
    
    local backup_info_file="$BACKUP_DIR/.last_backup"
    
    if [ ! -f "$backup_info_file" ]; then
        log_error "No backup information found"
        exit 1
    fi
    
    source "$backup_info_file"
    
    if [ -f "$BACKUP_FILE" ] && command -v psql &> /dev/null; then
        log_info "Restoring database from backup: $BACKUP_FILE"
        
        # Drop all tables and restore
        psql "$DATABASE_URL" -c "DROP SCHEMA public CASCADE; CREATE SCHEMA public;"
        psql "$DATABASE_URL" < "$BACKUP_FILE"
        
        log_success "Database restored from backup"
    else
        log_error "Cannot restore database. Manual intervention required."
        log_info "Backup file: ${BACKUP_FILE:-'Not available'}"
        exit 1
    fi
}

# Maintenance functions
clean_old_backups() {
    log_info "Cleaning old backups..."
    
    if [ -d "$BACKUP_DIR" ]; then
        # Keep only last 7 days of backups
        find "$BACKUP_DIR" -name "dpnr_prod_backup_*.sql" -mtime +7 -delete
        
        local remaining_backups=$(find "$BACKUP_DIR" -name "dpnr_prod_backup_*.sql" | wc -l)
        log_success "Cleanup completed. ${remaining_backups} backups retained"
    fi
}

# Main migration process
main() {
    log_info "Starting production database migration..."
    
    # Validation phase
    validate_environment
    validate_database_connection
    
    # Check if migration is needed
    if ! check_pending_migrations; then
        log_success "Database is already up to date"
        exit 0
    fi
    
    # Confirm migration in production
    log_warning "You are about to apply migrations to PRODUCTION database"
    echo "Database: $(echo "$DATABASE_URL" | sed 's/@.*:/@REDACTED:/')"
    echo "Timestamp: $TIMESTAMP"
    echo ""
    read -p "Are you sure you want to continue? (yes/no): " -r
    if [[ ! $REPLY =~ ^yes$ ]]; then
        log_info "Migration cancelled"
        exit 0
    fi
    
    # Backup phase
    create_backup
    verify_backup
    
    # Migration phase
    run_migrations
    generate_prisma_client
    validate_post_migration
    
    # Cleanup
    clean_old_backups
    
    echo ""
    echo "🎉 Production Migration Completed Successfully!"
    echo "============================================="
    echo "Timestamp: $TIMESTAMP"
    echo "Backup: $BACKUP_DIR/dpnr_prod_backup_$TIMESTAMP.sql"
    echo ""
    log_success "Migration completed successfully!"
}

# Handle script arguments
case "${1:-}" in
    "--dry-run")
        log_info "DRY RUN MODE - Validation only"
        validate_environment
        validate_database_connection
        check_pending_migrations
        log_success "Migration validation passed - ready for production!"
        ;;
    "--rollback")
        log_warning "ROLLBACK MODE - Restoring from last backup"
        validate_environment
        rollback_database
        ;;
    "--backup-only")
        log_info "BACKUP ONLY MODE"
        validate_environment
        validate_database_connection
        create_backup
        verify_backup
        ;;
    "--help"|"help")
        echo "DPNR Production Database Migration Script"
        echo ""
        echo "Usage: $0 [options]"
        echo ""
        echo "Options:"
        echo "  --dry-run      Validate migration readiness without applying"
        echo "  --rollback     Restore database from last backup"
        echo "  --backup-only  Create backup without applying migrations"
        echo "  --help         Show this help message"
        echo ""
        echo "Requirements:"
        echo "  - .env.production file with DATABASE_URL"
        echo "  - pg_dump and psql for full backup/restore (optional)"
        echo "  - Node.js and npm dependencies installed"
        echo ""
        exit 0
        ;;
    *)
        main
        ;;
esac