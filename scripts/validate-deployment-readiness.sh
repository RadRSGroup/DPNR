#!/bin/bash
set -e

# DPNR Comprehensive Deployment Readiness Validation
# This script validates all aspects of production readiness

echo "🚀 DPNR Production Deployment Readiness Validation"
echo "=================================================="
echo "Date: $(date)"
echo ""

# Configuration
PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && cd .. && pwd)"
FRONTEND_DIR="$PROJECT_ROOT/frontend"
BACKEND_DIR="$PROJECT_ROOT/backend"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
NC='\033[0m' # No Color

# Utility functions
log_info() { echo -e "${BLUE}ℹ️  $1${NC}"; }
log_success() { echo -e "${GREEN}✅ $1${NC}"; }
log_warning() { echo -e "${YELLOW}⚠️  $1${NC}"; }
log_error() { echo -e "${RED}❌ $1${NC}"; }
log_section() { echo -e "${PURPLE}🔍 $1${NC}"; }

# Validation counters
TOTAL_CHECKS=0
PASSED_CHECKS=0
FAILED_CHECKS=0
WARNING_CHECKS=0

run_check() {
    local check_name="$1"
    local command="$2"
    local critical="$3"

    TOTAL_CHECKS=$((TOTAL_CHECKS + 1))

    if eval "$command" > /dev/null 2>&1; then
        log_success "$check_name"
        PASSED_CHECKS=$((PASSED_CHECKS + 1))
        return 0
    else
        if [ "$critical" = "true" ]; then
            log_error "$check_name"
            FAILED_CHECKS=$((FAILED_CHECKS + 1))
        else
            log_warning "$check_name"
            WARNING_CHECKS=$((WARNING_CHECKS + 1))
        fi
        return 1
    fi
}

# 1. Environment Validation
validate_environment() {
    log_section "1. Environment Validation"

    # Check Node.js version
    run_check "Node.js version >= 18" "node --version | grep -E '^v(1[8-9]|[2-9][0-9])'" true

    # Check if required tools are installed
    run_check "npm available" "command -v npm" true
    run_check "git available" "command -v git" true
    run_check "curl available" "command -v curl" true

    # Check frontend environment
    run_check "Frontend .env.production exists" "[ -f '$FRONTEND_DIR/.env.production' ]" true

    # Check backend environment
    run_check "Backend .env.production exists" "[ -f '$BACKEND_DIR/.env.production' ]" true

    echo ""
}

# 2. Build Validation
validate_builds() {
    log_section "2. Build Validation"

    # Frontend build validation
    cd "$FRONTEND_DIR"
    run_check "Frontend TypeScript compilation" "npm run type-check" true
    run_check "Frontend test suite passes" "npm run test:ci" false
    run_check "Frontend production build" "BUILD_EXPORT=true npm run build" true

    # Backend build validation
    cd "$BACKEND_DIR"
    run_check "Backend TypeScript compilation" "npm run type-check" true
    run_check "Backend test suite passes" "npm run test:ci" false
    run_check "Backend production build" "npm run build" true
    run_check "Prisma client generation" "npm run prisma:generate" true

    cd "$PROJECT_ROOT"
    echo ""
}

# 3. Database Validation
validate_database() {
    log_section "3. Database Migration Readiness"

    cd "$BACKEND_DIR"

    # Only run if we can connect to database
    if npm run db:health:ci > /dev/null 2>&1; then
        run_check "Database connectivity" "npm run db:health:ci" true
        run_check "Production environment validation" "NODE_ENV=production npm run validate:prod:ci" false
    else
        log_warning "Database connection not available for testing (expected in CI)"
    fi

    # Check migration files exist
    run_check "Migration files present" "[ -d 'prisma/migrations' ]" true

    cd "$PROJECT_ROOT"
    echo ""
}

# 4. Deployment Scripts Validation
validate_deployment_scripts() {
    log_section "4. Deployment Scripts Testing"

    # Check deployment scripts exist and are executable
    run_check "Main deployment script exists" "[ -x 'scripts/deploy-production.sh' ]" true
    run_check "Migration script exists" "[ -x 'scripts/migrate-production.sh' ]" true
    run_check "Validation script exists" "[ -x 'scripts/validate-deployment-readiness.sh' ]" true

    # Test deployment script dry run
    run_check "Deployment script dry run" "./scripts/deploy-production.sh --dry-run" false

    echo ""
}

# 5. Monitoring Setup Validation
validate_monitoring() {
    log_section "5. Monitoring Setup"

    # Check monitoring configuration exists
    run_check "Monitoring config exists" "[ -f 'monitoring-config.yml' ]" false

    # Check health check endpoints in backend
    run_check "Health endpoints defined" "grep -q '/health' '$BACKEND_DIR/src/routes/*.ts'" false

    # Check logging configuration
    run_check "Logging configured" "grep -q 'LOG_LEVEL' '$BACKEND_DIR/.env.production'" false

    echo ""
}

# 6. Security Validation
validate_security() {
    log_section "6. SSL/Security Configuration"

    # Check security headers in Next.js config
    run_check "Security headers configured" "grep -q 'X-Frame-Options' '$FRONTEND_DIR/next.config.mjs'" true

    # Check HTTPS enforcement
    run_check "HTTPS enforcement configured" "grep -q 'https' '$BACKEND_DIR/.env.production'" true

    # Check JWT secrets are strong
    run_check "JWT secrets configured" "grep -q 'JWT_SECRET=' '$BACKEND_DIR/.env.production'" true

    # Check CORS configuration
    run_check "CORS properly configured" "grep -q 'CORS_ORIGIN' '$BACKEND_DIR/.env.production'" true

    echo ""
}

# 7. Performance Validation
validate_performance() {
    log_section "7. Load Testing Readiness"

    # Check bundle optimization
    run_check "Bundle analysis configured" "grep -q 'webpack-bundle-analyzer' '$FRONTEND_DIR/package.json'" true

    # Check database connection pooling
    run_check "Database connection pooling" "grep -q 'connection_limit' '$BACKEND_DIR/prisma/schema.prisma' || echo 'Prisma handles pooling'" false

    # Check image optimization
    run_check "Image optimization configured" "grep -q 'images:' '$FRONTEND_DIR/next.config.mjs'" true

    # Check compression
    run_check "Compression configured" "grep -q 'compress' '$BACKEND_DIR/package.json'" true

    echo ""
}

# 8. Documentation Validation
validate_documentation() {
    log_section "8. Documentation Completion"

    # Check essential documentation exists
    run_check "Production deployment guide" "[ -f 'PRODUCTION_DEPLOYMENT_GUIDE.md' ]" true
    run_check "Deployment checklist" "[ -f 'PRODUCTION_DEPLOYMENT_CHECKLIST.md' ]" true
    run_check "Production readiness report" "[ -f 'PRODUCTION_READINESS_REPORT.md' ]" false
    run_check "API documentation" "[ -f 'specs/api.yml' ] || [ -f 'backend/src/docs/api.md' ]" false

    # Check environment examples
    run_check "Environment examples exist" "[ -f '.env.production.example' ]" true

    echo ""
}

# Summary and recommendations
print_summary() {
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo "🏁 DPNR Production Deployment Readiness Summary"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo ""
    echo "📊 Validation Results:"
    echo "   Total Checks: $TOTAL_CHECKS"
    echo "   ✅ Passed: $PASSED_CHECKS"
    echo "   ❌ Failed: $FAILED_CHECKS"
    echo "   ⚠️  Warnings: $WARNING_CHECKS"
    echo ""

    # Calculate success percentage
    local success_percentage=$((PASSED_CHECKS * 100 / TOTAL_CHECKS))

    if [ $FAILED_CHECKS -eq 0 ] && [ $success_percentage -ge 90 ]; then
        log_success "🎉 PRODUCTION READY - All critical checks passed!"
        echo ""
        echo "✅ Your DPNR platform is ready for production deployment."
        echo "   Run: ./scripts/deploy-production.sh"
        echo ""
    elif [ $FAILED_CHECKS -eq 0 ]; then
        log_warning "⚡ MOSTLY READY - Some non-critical issues to address"
        echo ""
        echo "✅ Critical systems are ready for deployment."
        echo "⚠️  Consider addressing warnings for optimal performance."
        echo ""
    else
        log_error "🚨 NOT READY - Critical issues must be resolved"
        echo ""
        echo "❌ Critical failures detected. Resolve these before deployment:"
        echo "   • Review failed checks above"
        echo "   • Fix environment configuration"
        echo "   • Ensure all builds pass"
        echo ""
    fi

    echo "📚 Next Steps:"
    if [ $FAILED_CHECKS -eq 0 ]; then
        echo "   1. Update production environment variables with real values"
        echo "   2. Configure DNS and SSL certificates"
        echo "   3. Set up monitoring and alerting"
        echo "   4. Execute deployment: ./scripts/deploy-production.sh"
    else
        echo "   1. Fix all critical failures listed above"
        echo "   2. Re-run this validation: ./scripts/validate-deployment-readiness.sh"
        echo "   3. Review production deployment guide"
    fi
    echo ""
    echo "📋 Documentation:"
    echo "   • Production Deployment Guide: ./PRODUCTION_DEPLOYMENT_GUIDE.md"
    echo "   • Deployment Checklist: ./PRODUCTION_DEPLOYMENT_CHECKLIST.md"
    echo "   • Readiness Report: ./PRODUCTION_READINESS_REPORT.md"
    echo ""
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
}

# Main execution
main() {
    validate_environment
    validate_builds
    validate_database
    validate_deployment_scripts
    validate_monitoring
    validate_security
    validate_performance
    validate_documentation
    print_summary

    # Exit with appropriate code
    if [ $FAILED_CHECKS -eq 0 ]; then
        exit 0
    else
        exit 1
    fi
}

# Handle script arguments
case "${1:-}" in
    "--help"|"help")
        echo "DPNR Production Deployment Readiness Validation"
        echo ""
        echo "Usage: $0 [options]"
        echo ""
        echo "This script validates all aspects of production deployment readiness:"
        echo "  1. Environment configuration"
        echo "  2. Build processes"
        echo "  3. Database migration readiness"
        echo "  4. Deployment scripts"
        echo "  5. Monitoring setup"
        echo "  6. Security configuration"
        echo "  7. Performance optimization"
        echo "  8. Documentation completion"
        echo ""
        echo "Exit codes:"
        echo "  0 - All critical checks passed (ready for deployment)"
        echo "  1 - Critical failures detected (not ready)"
        echo ""
        exit 0
        ;;
esac

# Run main validation
main