#!/bin/bash

# DPNR Production Environment Validator
# Validates all required environment variables and configurations

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Configuration
PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ENV_FILE="$PROJECT_ROOT/.env.production"

print_status() {
    echo -e "${GREEN}[ENV]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[ENV WARN]${NC} $1"
}

print_error() {
    echo -e "${RED}[ENV ERROR]${NC} $1"
}

print_check() {
    echo -e "${BLUE}[CHECK]${NC} $1"
}

# Validation counters
TOTAL_CHECKS=0
PASSED_CHECKS=0
FAILED_CHECKS=0
WARNING_CHECKS=0

# Function to validate required variable
validate_required() {
    local var_name="$1"
    local description="$2"
    local value="${!var_name}"

    TOTAL_CHECKS=$((TOTAL_CHECKS + 1))

    if [ -z "$value" ]; then
        print_error "REQUIRED: $var_name - $description"
        FAILED_CHECKS=$((FAILED_CHECKS + 1))
        return 1
    else
        print_status "✓ $var_name - $description"
        PASSED_CHECKS=$((PASSED_CHECKS + 1))
        return 0
    fi
}

# Function to validate optional variable with warning
validate_optional() {
    local var_name="$1"
    local description="$2"
    local value="${!var_name}"

    TOTAL_CHECKS=$((TOTAL_CHECKS + 1))

    if [ -z "$value" ]; then
        print_warning "OPTIONAL: $var_name - $description"
        WARNING_CHECKS=$((WARNING_CHECKS + 1))
        return 1
    else
        print_status "✓ $var_name - $description"
        PASSED_CHECKS=$((PASSED_CHECKS + 1))
        return 0
    fi
}

# Function to validate URL format
validate_url() {
    local var_name="$1"
    local description="$2"
    local value="${!var_name}"

    TOTAL_CHECKS=$((TOTAL_CHECKS + 1))

    if [ -z "$value" ]; then
        print_error "REQUIRED: $var_name - $description"
        FAILED_CHECKS=$((FAILED_CHECKS + 1))
        return 1
    elif [[ ! "$value" =~ ^https?:// ]]; then
        print_error "INVALID URL: $var_name - Must start with http:// or https://"
        FAILED_CHECKS=$((FAILED_CHECKS + 1))
        return 1
    else
        print_status "✓ $var_name - $description"
        PASSED_CHECKS=$((PASSED_CHECKS + 1))
        return 0
    fi
}

# Function to validate email format
validate_email() {
    local var_name="$1"
    local description="$2"
    local value="${!var_name}"

    TOTAL_CHECKS=$((TOTAL_CHECKS + 1))

    if [ -z "$value" ]; then
        print_error "REQUIRED: $var_name - $description"
        FAILED_CHECKS=$((FAILED_CHECKS + 1))
        return 1
    elif [[ ! "$value" =~ ^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$ ]]; then
        print_error "INVALID EMAIL: $var_name - Invalid email format"
        FAILED_CHECKS=$((FAILED_CHECKS + 1))
        return 1
    else
        print_status "✓ $var_name - $description"
        PASSED_CHECKS=$((PASSED_CHECKS + 1))
        return 0
    fi
}

# Function to test database connectivity
test_database_connection() {
    print_check "Testing database connectivity..."

    if [ -z "$DATABASE_URL" ]; then
        print_error "DATABASE_URL not set, cannot test connection"
        return 1
    fi

    # Simple connection test using node
    if command -v node >/dev/null 2>&1; then
        cat > /tmp/db_test.js << 'EOF'
const { Client } = require('pg');
const url = process.env.DATABASE_URL;

if (!url) {
    console.error('DATABASE_URL not provided');
    process.exit(1);
}

const client = new Client({ connectionString: url });

client.connect()
    .then(() => {
        console.log('Database connection successful');
        return client.query('SELECT NOW()');
    })
    .then(() => {
        console.log('Database query test successful');
        client.end();
    })
    .catch((err) => {
        console.error('Database connection failed:', err.message);
        process.exit(1);
    });
EOF

        if DATABASE_URL="$DATABASE_URL" node /tmp/db_test.js > /dev/null 2>&1; then
            print_status "✓ Database connection test passed"
            rm -f /tmp/db_test.js
            return 0
        else
            print_error "Database connection test failed"
            rm -f /tmp/db_test.js
            return 1
        fi
    else
        print_warning "Node.js not available, skipping database connection test"
        return 1
    fi
}

# Main validation function
run_validation() {
    print_status "Starting production environment validation..."
    print_status "Environment file: $ENV_FILE"

    # Load environment file if it exists
    if [ -f "$ENV_FILE" ]; then
        export $(grep -v '^#' "$ENV_FILE" | xargs)
        print_status "Loaded environment variables from $ENV_FILE"
    else
        print_error "Environment file not found: $ENV_FILE"
        print_error "Please copy .env.production.example to .env.production and configure it."
        exit 1
    fi

    echo ""
    print_check "Validating Core Configuration..."

    # Core environment settings
    validate_required "NODE_ENV" "Node environment (should be 'production')"
    validate_required "PORT" "Server port number"

    # Database configuration
    print_check "Validating Database Configuration..."
    validate_required "DATABASE_URL" "PostgreSQL database connection string"

    # AWS Configuration
    print_check "Validating AWS Configuration..."
    validate_required "AWS_REGION" "AWS region for services"
    validate_required "AWS_ACCESS_KEY_ID" "AWS access key"
    validate_required "AWS_SECRET_ACCESS_KEY" "AWS secret access key"

    # AWS Cognito
    validate_required "AWS_COGNITO_USER_POOL_ID" "Cognito User Pool ID"
    validate_required "AWS_COGNITO_CLIENT_ID" "Cognito Client ID"
    validate_optional "AWS_COGNITO_CLIENT_SECRET" "Cognito Client Secret (required for server-side)"

    # Payment Configuration
    print_check "Validating Payment Configuration..."
    validate_required "TRANZILA_TERMINAL" "Tranzila payment terminal ID"
    validate_required "TRANZILA_API_KEY" "Tranzila API key"
    validate_required "TRANZILA_CURRENCY" "Tranzila currency (should be ILS)"

    # Security Configuration
    print_check "Validating Security Configuration..."
    validate_required "JWT_SECRET" "JWT signing secret"
    validate_required "JWT_EXPIRY" "JWT expiration time"
    validate_required "JWT_REFRESH_SECRET" "JWT refresh token secret"
    validate_required "WEBHOOK_SECRET" "Webhook validation secret"
    validate_required "COOKIE_SECRET" "Cookie encryption secret"

    # CORS and URLs
    print_check "Validating CORS and URLs..."
    validate_url "API_BASE_URL" "API base URL"
    validate_required "CORS_ORIGIN" "CORS origin URL"

    # Email Configuration
    print_check "Validating Email Configuration..."
    validate_required "SMTP_HOST" "SMTP server hostname"
    validate_required "SMTP_PORT" "SMTP server port"
    validate_required "SMTP_USER" "SMTP username"
    validate_required "SMTP_PASS" "SMTP password"
    validate_email "FROM_EMAIL" "Sender email address"
    validate_required "FROM_NAME" "Sender name"

    # Redis Configuration (optional)
    print_check "Validating Redis Configuration..."
    validate_optional "REDIS_URL" "Redis connection string for caching"

    # Monitoring Configuration
    print_check "Validating Monitoring Configuration..."
    validate_optional "SENTRY_DSN" "Sentry error tracking DSN"
    validate_optional "NEW_RELIC_LICENSE_KEY" "New Relic monitoring key"

    # Feature Flags
    print_check "Validating Feature Flags..."
    validate_optional "ENABLE_REGISTRATION" "Registration feature flag"
    validate_optional "ENABLE_CONSULTATIONS" "Consultations feature flag"
    validate_optional "ENABLE_PAYMENTS" "Payments feature flag"

    # Frontend Environment Variables (if running full stack)
    print_check "Validating Frontend Configuration..."
    validate_optional "NEXT_PUBLIC_API_URL" "Public API URL for frontend"
    validate_optional "NEXT_PUBLIC_AWS_REGION" "Public AWS region"
    validate_optional "NEXT_PUBLIC_AWS_COGNITO_USER_POOL_ID" "Public Cognito User Pool ID"
    validate_optional "NEXT_PUBLIC_AWS_COGNITO_CLIENT_ID" "Public Cognito Client ID"

    # Test database connection
    test_database_connection

    # Validation Summary
    echo ""
    echo -e "${BLUE}=========================================${NC}"
    echo -e "${BLUE}Environment Validation Summary${NC}"
    echo -e "${BLUE}=========================================${NC}"
    echo -e "Total Checks: $TOTAL_CHECKS"
    echo -e "${GREEN}Passed: $PASSED_CHECKS${NC}"
    echo -e "${RED}Failed: $FAILED_CHECKS${NC}"
    echo -e "${YELLOW}Warnings: $WARNING_CHECKS${NC}"

    if [ $FAILED_CHECKS -eq 0 ]; then
        echo ""
        print_status "✅ Environment validation completed successfully!"
        print_status "Your production environment is ready for deployment."

        if [ $WARNING_CHECKS -gt 0 ]; then
            print_warning "⚠️ There are $WARNING_CHECKS optional configurations missing."
            print_warning "Consider configuring them for optimal functionality."
        fi

        exit 0
    else
        echo ""
        print_error "❌ Environment validation failed!"
        print_error "$FAILED_CHECKS required configurations are missing or invalid."
        print_error "Please fix the issues above before deploying to production."
        exit 1
    fi
}

# Help function
show_help() {
    echo "DPNR Production Environment Validator"
    echo ""
    echo "Usage: $0 [options]"
    echo ""
    echo "Options:"
    echo "  --help      Show this help message"
    echo "  --verbose   Show detailed validation output"
    echo ""
    echo "This script validates all required environment variables"
    echo "for production deployment of the DPNR platform."
}

# Parse command line arguments
case "${1:-}" in
    --help)
        show_help
        exit 0
        ;;
    --verbose)
        # Already verbose by default
        run_validation
        ;;
    "")
        run_validation
        ;;
    *)
        echo "Unknown option: $1"
        show_help
        exit 1
        ;;
esac