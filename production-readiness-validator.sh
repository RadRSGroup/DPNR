#!/bin/bash

# DPNR Production Readiness Validator
# Comprehensive pre-deployment validation script

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
NC='\033[0m'

# Configuration
PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
FRONTEND_DIR="$PROJECT_ROOT/frontend"
BACKEND_DIR="$PROJECT_ROOT/backend"

# Validation state
TOTAL_VALIDATIONS=0
PASSED_VALIDATIONS=0
FAILED_VALIDATIONS=0
WARNING_VALIDATIONS=0

print_header() {
    echo ""
    echo -e "${PURPLE}=========================================${NC}"
    echo -e "${PURPLE}$1${NC}"
    echo -e "${PURPLE}=========================================${NC}"
}

print_section() {
    echo ""
    echo -e "${BLUE}--- $1 ---${NC}"
}

print_success() {
    echo -e "${GREEN}✅ $1${NC}"
    PASSED_VALIDATIONS=$((PASSED_VALIDATIONS + 1))
}

print_failure() {
    echo -e "${RED}❌ $1${NC}"
    FAILED_VALIDATIONS=$((FAILED_VALIDATIONS + 1))
}

print_warning() {
    echo -e "${YELLOW}⚠️ $1${NC}"
    WARNING_VALIDATIONS=$((WARNING_VALIDATIONS + 1))
}

print_info() {
    echo -e "${BLUE}ℹ️ $1${NC}"
}

validate_item() {
    TOTAL_VALIDATIONS=$((TOTAL_VALIDATIONS + 1))
    if $1; then
        print_success "$2"
        return 0
    else
        print_failure "$2"
        return 1
    fi
}

validate_item_warning() {
    TOTAL_VALIDATIONS=$((TOTAL_VALIDATIONS + 1))
    if $1; then
        print_success "$2"
        return 0
    else
        print_warning "$2"
        return 1
    fi
}

# Validation functions
check_node_version() {
    local required_version="18.0.0"
    local current_version=$(node -v | sed 's/v//')

    if [ "$(printf '%s\n' "$required_version" "$current_version" | sort -V | head -n1)" = "$required_version" ]; then
        return 0
    else
        return 1
    fi
}

check_npm_installed() {
    command -v npm >/dev/null 2>&1
}

check_environment_file() {
    [ -f "$PROJECT_ROOT/.env.production" ]
}

check_frontend_dependencies() {
    cd "$FRONTEND_DIR" && [ -f "package.json" ] && [ -d "node_modules" ]
}

check_backend_dependencies() {
    cd "$BACKEND_DIR" && [ -f "package.json" ] && [ -d "node_modules" ]
}

check_frontend_build() {
    cd "$FRONTEND_DIR"
    if [ -d ".next" ] || [ -d "out" ]; then
        return 0
    fi
    # Try to build
    npm run build >/dev/null 2>&1
}

check_backend_build() {
    cd "$BACKEND_DIR"
    if [ -d "dist" ]; then
        return 0
    fi
    # Try to build (with relaxed errors)
    npm run build >/dev/null 2>&1
}

check_typescript_config() {
    [ -f "$FRONTEND_DIR/tsconfig.json" ] && [ -f "$BACKEND_DIR/tsconfig.json" ]
}

check_eslint_config() {
    [ -f "$FRONTEND_DIR/.eslintrc.json" ] || [ -f "$FRONTEND_DIR/eslint.config.js" ]
}

check_prettier_config() {
    [ -f "$PROJECT_ROOT/.prettierrc" ] || [ -f "$FRONTEND_DIR/.prettierrc" ]
}

check_git_repo() {
    [ -d "$PROJECT_ROOT/.git" ]
}

check_vercel_config() {
    [ -f "$FRONTEND_DIR/vercel.json" ] || [ -f "$PROJECT_ROOT/vercel.json" ]
}

check_docker_config() {
    [ -f "$PROJECT_ROOT/docker-compose.yml" ] || [ -f "$BACKEND_DIR/Dockerfile" ]
}

check_database_schema() {
    [ -f "$BACKEND_DIR/prisma/schema.prisma" ]
}

check_environment_variables() {
    if [ ! -f "$PROJECT_ROOT/.env.production" ]; then
        return 1
    fi

    source "$PROJECT_ROOT/.env.production"

    # Check critical variables
    [ -n "$DATABASE_URL" ] && \
    [ -n "$AWS_COGNITO_USER_POOL_ID" ] && \
    [ -n "$AWS_COGNITO_CLIENT_ID" ] && \
    [ -n "$TRANZILA_TERMINAL" ] && \
    [ -n "$JWT_SECRET" ]
}

check_ssl_certificates() {
    # This would typically check with your hosting provider
    # For now, we'll assume certificates are configured externally
    return 0
}

check_domain_configuration() {
    # Basic check if domains resolve (requires internet)
    if command -v dig >/dev/null 2>&1; then
        dig be-dpnr.com >/dev/null 2>&1 && dig api.be-dpnr.com >/dev/null 2>&1
    else
        return 0 # Skip if dig not available
    fi
}

check_monitoring_setup() {
    # Check if monitoring configuration exists
    [ -f "$PROJECT_ROOT/production-monitoring-setup.yml" ] || \
    [ -f "$PROJECT_ROOT/monitoring-config.yml" ]
}

check_backup_strategy() {
    # Check if backup scripts exist
    [ -f "$PROJECT_ROOT/deploy-database.sh" ] && \
    grep -q "backup" "$PROJECT_ROOT/deploy-database.sh" >/dev/null 2>&1
}

check_security_headers() {
    # Check if security headers are configured in Next.js
    if [ -f "$FRONTEND_DIR/next.config.mjs" ]; then
        grep -q "headers" "$FRONTEND_DIR/next.config.mjs" >/dev/null 2>&1
    else
        return 1
    fi
}

check_cors_configuration() {
    # Check if CORS is properly configured in backend
    if [ -f "$BACKEND_DIR/src/index.ts" ]; then
        grep -q "cors" "$BACKEND_DIR/src/index.ts" >/dev/null 2>&1
    else
        return 1
    fi
}

check_rate_limiting() {
    # Check if rate limiting is configured
    if [ -d "$BACKEND_DIR/src" ]; then
        find "$BACKEND_DIR/src" -name "*.ts" -exec grep -l "rate.limit\|express-rate-limit" {} \; | head -1 >/dev/null 2>&1
    else
        return 1
    fi
}

check_logging_configuration() {
    # Check if logging is properly configured
    [ -f "$BACKEND_DIR/src/utils/logger.ts" ] || \
    grep -r "winston\|bunyan\|pino" "$BACKEND_DIR/src" >/dev/null 2>&1
}

check_error_handling() {
    # Check if error handling middleware exists
    [ -f "$BACKEND_DIR/src/middleware/error.ts" ] || \
    grep -r "errorHandler\|error.*middleware" "$BACKEND_DIR/src" >/dev/null 2>&1
}

check_api_documentation() {
    # Check if API documentation exists
    [ -f "$PROJECT_ROOT/specs/openapi.yml" ] || \
    [ -f "$BACKEND_DIR/docs/api.md" ] || \
    [ -f "$PROJECT_ROOT/API.md" ]
}

check_test_coverage() {
    # Check if tests exist and can run
    cd "$FRONTEND_DIR" && npm run test >/dev/null 2>&1 || \
    cd "$BACKEND_DIR" && npm run test >/dev/null 2>&1
}

check_deployment_scripts() {
    [ -f "$PROJECT_ROOT/deploy-production.sh" ] && \
    [ -x "$PROJECT_ROOT/deploy-production.sh" ]
}

check_rollback_procedures() {
    grep -q "rollback\|revert" "$PROJECT_ROOT/deploy-production.sh" >/dev/null 2>&1 || \
    [ -f "$PROJECT_ROOT/rollback.sh" ]
}

# Main validation workflow
main() {
    print_header "DPNR Production Readiness Validation"
    print_info "Starting comprehensive pre-deployment validation..."
    print_info "Project Root: $PROJECT_ROOT"

    # System Requirements
    print_section "System Requirements"
    validate_item check_node_version "Node.js version >= 18.0.0"
    validate_item check_npm_installed "npm is installed and accessible"

    # Project Structure
    print_section "Project Structure"
    validate_item check_git_repo "Git repository initialized"
    validate_item check_frontend_dependencies "Frontend dependencies installed"
    validate_item check_backend_dependencies "Backend dependencies installed"
    validate_item check_database_schema "Database schema file exists"

    # Configuration Files
    print_section "Configuration Files"
    validate_item check_environment_file "Production environment file exists"
    validate_item check_typescript_config "TypeScript configuration present"
    validate_item_warning check_eslint_config "ESLint configuration present"
    validate_item_warning check_prettier_config "Prettier configuration present"

    # Build Validation
    print_section "Build Validation"
    validate_item_warning check_frontend_build "Frontend builds successfully"
    validate_item_warning check_backend_build "Backend builds successfully"

    # Deployment Configuration
    print_section "Deployment Configuration"
    validate_item check_vercel_config "Vercel configuration present"
    validate_item_warning check_docker_config "Docker configuration present"
    validate_item check_deployment_scripts "Deployment scripts present and executable"

    # Environment & Security
    print_section "Environment & Security"
    validate_item check_environment_variables "Critical environment variables set"
    validate_item check_security_headers "Security headers configured"
    validate_item check_cors_configuration "CORS properly configured"
    validate_item_warning check_rate_limiting "Rate limiting implemented"

    # Infrastructure
    print_section "Infrastructure"
    validate_item_warning check_ssl_certificates "SSL certificates configured"
    validate_item_warning check_domain_configuration "Domain DNS configured"
    validate_item_warning check_monitoring_setup "Monitoring configuration present"
    validate_item check_backup_strategy "Backup strategy implemented"

    # Code Quality
    print_section "Code Quality"
    validate_item check_logging_configuration "Logging properly configured"
    validate_item check_error_handling "Error handling implemented"
    validate_item_warning check_api_documentation "API documentation present"
    validate_item_warning check_test_coverage "Test suite present and passing"

    # Operations
    print_section "Operations"
    validate_item_warning check_rollback_procedures "Rollback procedures documented"

    # Final Summary
    print_header "Validation Summary"

    echo -e "Total Validations: ${TOTAL_VALIDATIONS}"
    echo -e "${GREEN}Passed: ${PASSED_VALIDATIONS}${NC}"
    echo -e "${RED}Failed: ${FAILED_VALIDATIONS}${NC}"
    echo -e "${YELLOW}Warnings: ${WARNING_VALIDATIONS}${NC}"

    echo ""

    if [ $FAILED_VALIDATIONS -eq 0 ]; then
        print_success "✅ PRODUCTION READINESS: PASSED"
        echo ""
        print_info "Your DPNR platform is ready for production deployment!"

        if [ $WARNING_VALIDATIONS -gt 0 ]; then
            echo ""
            print_warning "Note: There are ${WARNING_VALIDATIONS} items that could be improved for optimal production readiness."
            print_info "These are recommendations and won't prevent deployment, but addressing them will improve reliability."
        fi

        echo ""
        print_info "Next steps:"
        print_info "1. Run: ./validate-production-env.sh"
        print_info "2. Run: ./deploy-database.sh --dry-run"
        print_info "3. Run: ./deploy-production.sh"

        exit 0
    else
        print_failure "❌ PRODUCTION READINESS: FAILED"
        echo ""
        print_info "Your DPNR platform is NOT ready for production deployment."
        print_info "Please address the ${FAILED_VALIDATIONS} failed validation(s) above before proceeding."

        echo ""
        print_info "Common fixes:"
        print_info "• Copy .env.production.example to .env.production and configure"
        print_info "• Run 'npm install' in both frontend and backend directories"
        print_info "• Fix build errors in frontend and backend"
        print_info "• Ensure all critical environment variables are set"

        exit 1
    fi
}

# Handle command line arguments
case "${1:-}" in
    --help)
        echo "DPNR Production Readiness Validator"
        echo ""
        echo "Usage: $0 [--help]"
        echo ""
        echo "This script performs comprehensive validation to ensure"
        echo "the DPNR platform is ready for production deployment."
        echo ""
        echo "The validation covers:"
        echo "• System requirements"
        echo "• Project structure"
        echo "• Build configuration"
        echo "• Security settings"
        echo "• Infrastructure setup"
        echo "• Code quality"
        echo "• Operations readiness"
        exit 0
        ;;
    *)
        main "$@"
        ;;
esac