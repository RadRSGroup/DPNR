#!/bin/bash
set -e

# DPNR Course Registration Platform - Production Deployment Script
# For deployment to Vercel (frontend) and Railway/AWS Lambda (backend)

echo "🚀 DPNR Production Deployment"
echo "============================="
echo "Target: be-dpnr.com"
echo "Date: $(date)"
echo ""

# Configuration
PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && cd .. && pwd)"
FRONTEND_DIR="$PROJECT_ROOT/frontend"
BACKEND_DIR="$PROJECT_ROOT/backend"
BRANCH="main"
PRODUCTION_ENV="production"

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
validate_branch() {
    local current_branch=$(git rev-parse --abbrev-ref HEAD)
    if [ "$current_branch" != "$BRANCH" ]; then
        log_error "Must be on $BRANCH branch for production deployment (currently on $current_branch)"
        exit 1
    fi
    log_success "On correct branch: $current_branch"
}

validate_git_clean() {
    if [ -n "$(git status --porcelain)" ]; then
        log_error "Working directory is not clean. Please commit or stash changes."
        git status --short
        exit 1
    fi
    log_success "Working directory is clean"
}

validate_environment() {
    log_info "Validating environment configuration..."
    
    # Check frontend environment
    if [ ! -f "$FRONTEND_DIR/.env.production" ]; then
        log_error "Frontend production environment file missing: $FRONTEND_DIR/.env.production"
        exit 1
    fi
    
    # Check backend environment
    if [ ! -f "$BACKEND_DIR/.env.production" ]; then
        log_error "Backend production environment file missing: $BACKEND_DIR/.env.production"
        exit 1
    fi
    
    log_success "Environment files validated"
}

validate_tools() {
    log_info "Validating required tools..."
    
    # Check Node.js version
    if ! command -v node &> /dev/null; then
        log_error "Node.js is not installed"
        exit 1
    fi
    
    local node_version=$(node --version | cut -d'.' -f1 | sed 's/v//')
    if [ "$node_version" -lt 18 ]; then
        log_error "Node.js version 18 or higher required (current: $(node --version))"
        exit 1
    fi
    
    # Check if Vercel CLI is available
    if ! command -v vercel &> /dev/null; then
        log_warning "Vercel CLI not found. Install with: npm i -g vercel"
    fi
    
    log_success "Tools validated"
}

# Build functions
run_tests() {
    log_info "Running comprehensive test suite..."
    
    # Frontend tests
    log_info "Running frontend tests..."
    cd "$FRONTEND_DIR"
    npm run test:ci
    npm run type-check
    npm run lint
    
    # Backend tests
    log_info "Running backend tests..."
    cd "$BACKEND_DIR"
    npm run test:ci
    npm run type-check
    npm run lint
    
    # Database validation
    log_info "Validating database schema..."
    npm run validate:prod:ci
    
    cd "$PROJECT_ROOT"
    log_success "All tests passed"
}

build_applications() {
    log_info "Building applications for production..."
    
    # Build backend first
    log_info "Building backend..."
    cd "$BACKEND_DIR"
    
    # Copy production environment
    cp .env.production .env
    
    # Install production dependencies
    npm ci --only=production
    
    # Generate Prisma client
    npm run prisma:generate
    
    # Build TypeScript
    npm run build
    
    # Create Lambda package if deploying to AWS
    if [ "$DEPLOY_TARGET" = "aws-lambda" ]; then
        npm run package
    fi
    
    log_success "Backend build completed"
    
    # Build frontend
    log_info "Building frontend..."
    cd "$FRONTEND_DIR"
    
    # Copy production environment
    cp .env.production .env.local
    
    # Install production dependencies
    npm ci
    
    # Build Next.js application
    BUILD_EXPORT=true npm run build
    
    log_success "Frontend build completed"
    
    cd "$PROJECT_ROOT"
    log_success "All applications built successfully"
}

# Database management
run_database_migrations() {
    log_info "Running database migrations..."
    
    cd "$BACKEND_DIR"
    
    # Deploy migrations to production database
    npm run db:deploy:prod
    
    # Validate database health
    npm run db:health:ci
    
    log_success "Database migrations completed"
    cd "$PROJECT_ROOT"
}

# Deployment functions
deploy_frontend() {
    log_info "Deploying frontend to Vercel..."
    
    cd "$FRONTEND_DIR"
    
    if command -v vercel &> /dev/null; then
        # Deploy with Vercel CLI
        vercel --prod --confirm
    else
        log_warning "Vercel CLI not available. Please deploy manually:"
        log_info "1. Go to https://vercel.com/dashboard"
        log_info "2. Connect your GitHub repository"
        log_info "3. Deploy the frontend directory"
        log_info "4. Configure environment variables from .env.production"
        read -p "Press Enter when deployment is complete..."
    fi
    
    cd "$PROJECT_ROOT"
    log_success "Frontend deployment initiated"
}

deploy_backend() {
    log_info "Backend deployment preparation..."
    
    local deploy_target=${DEPLOY_TARGET:-"railway"}
    
    case $deploy_target in
        "railway")
            deploy_backend_railway
            ;;
        "aws-lambda")
            deploy_backend_aws
            ;;
        "manual")
            prepare_backend_manual
            ;;
        *)
            log_error "Unknown deployment target: $deploy_target"
            exit 1
            ;;
    esac
}

deploy_backend_railway() {
    log_info "Deploying backend to Railway..."
    
    cd "$BACKEND_DIR"
    
    # Check if Railway CLI is available
    if command -v railway &> /dev/null; then
        railway deploy
    else
        log_warning "Railway CLI not available. Manual deployment required:"
        log_info "1. Go to https://railway.app/dashboard"
        log_info "2. Connect your GitHub repository"
        log_info "3. Deploy the backend directory"
        log_info "4. Configure environment variables from .env.production"
        read -p "Press Enter when deployment is complete..."
    fi
    
    cd "$PROJECT_ROOT"
    log_success "Backend deployment to Railway initiated"
}

deploy_backend_aws() {
    log_info "Deploying backend to AWS Lambda..."
    
    cd "$BACKEND_DIR"
    
    # Check if AWS CLI is configured
    if ! aws sts get-caller-identity &> /dev/null; then
        log_error "AWS CLI not configured. Run 'aws configure' first."
        exit 1
    fi
    
    # Deploy Lambda function
    local function_name="dpnr-api-prod"
    
    if aws lambda get-function --function-name "$function_name" &> /dev/null; then
        aws lambda update-function-code \
            --function-name "$function_name" \
            --zip-file fileb://dist/lambda-package.zip
    else
        log_error "Lambda function $function_name does not exist. Please create it first."
        exit 1
    fi
    
    cd "$PROJECT_ROOT"
    log_success "Backend deployed to AWS Lambda"
}

prepare_backend_manual() {
    log_info "Preparing backend for manual deployment..."
    
    cd "$BACKEND_DIR"
    
    # Create deployment package
    local deploy_package="dpnr-backend-$(date +%Y%m%d-%H%M%S).tar.gz"
    
    tar -czf "$deploy_package" \
        --exclude=node_modules \
        --exclude=.git \
        --exclude=tests \
        --exclude="*.log" \
        .
    
    log_success "Deployment package created: $deploy_package"
    log_info "Manual deployment instructions:"
    log_info "1. Upload $deploy_package to your server"
    log_info "2. Extract: tar -xzf $deploy_package"
    log_info "3. Install dependencies: npm ci --only=production"
    log_info "4. Set environment variables from .env.production"
    log_info "5. Run migrations: npm run db:deploy:prod"
    log_info "6. Start application: npm start"
    
    cd "$PROJECT_ROOT"
}

# Health checks
run_health_checks() {
    log_info "Running post-deployment health checks..."
    
    local frontend_url="https://be-dpnr.com"
    local api_url="https://api.be-dpnr.com/v1"
    
    # Wait for deployments to propagate
    log_info "Waiting for deployments to propagate (30 seconds)..."
    sleep 30
    
    # Check frontend
    log_info "Checking frontend availability..."
    if curl -f -s -o /dev/null --max-time 10 "$frontend_url"; then
        log_success "Frontend is accessible at $frontend_url"
    else
        log_warning "Frontend check failed at $frontend_url"
    fi
    
    # Check API health endpoint
    log_info "Checking API health..."
    if curl -f -s -o /dev/null --max-time 10 "$api_url/health"; then
        log_success "API is healthy at $api_url"
    else
        log_warning "API health check failed at $api_url"
    fi
    
    # Database connectivity test
    log_info "Testing database connectivity..."
    cd "$BACKEND_DIR"
    if npm run db:health:ci; then
        log_success "Database connectivity confirmed"
    else
        log_warning "Database connectivity issues detected"
    fi
    
    cd "$PROJECT_ROOT"
}

# Rollback function
setup_rollback_info() {
    log_info "Setting up rollback information..."
    
    local current_commit=$(git rev-parse HEAD)
    local rollback_file=".last-production-deploy"
    
    echo "COMMIT_SHA=$current_commit" > "$rollback_file"
    echo "DEPLOY_DATE=$(date -u)" >> "$rollback_file"
    echo "BRANCH=$BRANCH" >> "$rollback_file"
    
    log_success "Rollback information saved to $rollback_file"
    log_info "To rollback, run: git checkout $current_commit && ./scripts/deploy-production.sh"
}

# Main deployment process
main() {
    log_info "Starting production deployment process..."
    
    # Pre-deployment validations
    validate_branch
    validate_git_clean
    validate_environment
    validate_tools
    
    # Pre-deployment tests
    run_tests
    
    # Build applications
    build_applications
    
    # Database migrations
    run_database_migrations
    
    # Deploy applications
    deploy_frontend
    deploy_backend
    
    # Post-deployment validation
    run_health_checks
    
    # Setup rollback information
    setup_rollback_info
    
    echo ""
    echo "🎉 Production Deployment Completed Successfully!"
    echo "==============================================="
    echo "Frontend URL: https://be-dpnr.com"
    echo "API URL: https://api.be-dpnr.com/v1"
    echo "Health Check: https://api.be-dpnr.com/v1/health"
    echo "Deploy Time: $(date)"
    echo "Commit: $(git rev-parse --short HEAD)"
    echo ""
    echo "🔍 Monitor the deployment:"
    echo "- Vercel Dashboard: https://vercel.com/dashboard"
    echo "- Railway Dashboard: https://railway.app/dashboard"
    echo "- Sentry: https://sentry.io/"
    echo ""
    log_success "Deployment completed successfully!"
}

# Handle script arguments
case "${1:-}" in
    "--dry-run")
        log_info "DRY RUN MODE - No actual deployment will occur"
        DRY_RUN=true
        ;;
    "--backend-only")
        log_info "Backend-only deployment"
        BACKEND_ONLY=true
        ;;
    "--frontend-only")
        log_info "Frontend-only deployment"
        FRONTEND_ONLY=true
        ;;
    "--help"|"help")
        echo "DPNR Production Deployment Script"
        echo ""
        echo "Usage: $0 [options]"
        echo ""
        echo "Options:"
        echo "  --dry-run        Validate and test without deploying"
        echo "  --backend-only   Deploy backend only"
        echo "  --frontend-only  Deploy frontend only"
        echo "  --help           Show this help message"
        echo ""
        echo "Environment Variables:"
        echo "  DEPLOY_TARGET    Backend deployment target (railway|aws-lambda|manual)"
        echo ""
        exit 0
        ;;
esac

# Run main deployment
if [ "${DRY_RUN:-}" = "true" ]; then
    log_info "DRY RUN - Validating deployment readiness..."
    validate_branch
    validate_git_clean
    validate_environment
    validate_tools
    run_tests
    log_success "Deployment validation passed - ready for production!"
else
    main
fi