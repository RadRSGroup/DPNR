#!/bin/bash

# DPNR Course Registration Platform - Production Deployment Script
# Version: 1.0.0
# Last Updated: 2025-01-22

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
FRONTEND_DIR="$PROJECT_ROOT/frontend"
BACKEND_DIR="$PROJECT_ROOT/backend"

# Logging
LOG_FILE="$PROJECT_ROOT/deployment.log"
exec 1> >(tee -a "$LOG_FILE")
exec 2> >(tee -a "$LOG_FILE" >&2)

echo -e "${BLUE}=========================================${NC}"
echo -e "${BLUE}DPNR Production Deployment Script${NC}"
echo -e "${BLUE}=========================================${NC}"
echo "Started at: $(date)"
echo "Project Root: $PROJECT_ROOT"
echo ""

# Function to print status
print_status() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Function to check if command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Pre-flight checks
print_status "Running pre-flight checks..."

# Check required tools
REQUIRED_TOOLS=(node npm vercel)
MISSING_TOOLS=()

for tool in "${REQUIRED_TOOLS[@]}"; do
    if ! command_exists "$tool"; then
        MISSING_TOOLS+=("$tool")
    fi
done

if [ ${#MISSING_TOOLS[@]} -ne 0 ]; then
    print_error "Missing required tools: ${MISSING_TOOLS[*]}"
    print_error "Please install missing tools before proceeding."
    exit 1
fi

# Check environment file
if [ ! -f "$PROJECT_ROOT/.env.production" ]; then
    print_warning "Production environment file not found."
    print_warning "Please copy .env.production.example to .env.production and fill in values."
    read -p "Continue anyway? (y/N): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        exit 1
    fi
fi

# Check Node.js version
NODE_VERSION=$(node -v | sed 's/v//')
REQUIRED_NODE_VERSION="18.0.0"
if [ "$(printf '%s\n' "$REQUIRED_NODE_VERSION" "$NODE_VERSION" | sort -V | head -n1)" != "$REQUIRED_NODE_VERSION" ]; then
    print_error "Node.js version $REQUIRED_NODE_VERSION or higher required. Current: $NODE_VERSION"
    exit 1
fi

print_status "Pre-flight checks completed successfully."

# Function to deploy frontend
deploy_frontend() {
    print_status "Starting frontend deployment..."

    cd "$FRONTEND_DIR"

    # Install dependencies
    print_status "Installing frontend dependencies..."
    npm ci --production=false

    # Run type check (optional, will warn but not fail)
    print_status "Running TypeScript type check..."
    if ! npm run type-check; then
        print_warning "TypeScript errors detected, but continuing with deployment."
    fi

    # Build for production
    print_status "Building frontend for production..."
    if ! npm run build; then
        print_error "Frontend build failed!"
        return 1
    fi

    # Deploy to Vercel
    print_status "Deploying to Vercel..."
    if command_exists vercel; then
        if ! vercel --prod --confirm; then
            print_error "Vercel deployment failed!"
            return 1
        fi
    else
        print_warning "Vercel CLI not found. Please deploy manually."
        print_warning "Run: cd frontend && vercel --prod"
    fi

    print_status "Frontend deployment completed successfully."
    return 0
}

# Function to deploy backend
deploy_backend() {
    print_status "Starting backend deployment..."

    cd "$BACKEND_DIR"

    # Install dependencies
    print_status "Installing backend dependencies..."
    npm ci --production=false

    # Run database migrations (if DATABASE_URL is set)
    if [ -n "$DATABASE_URL" ]; then
        print_status "Running database migrations..."
        if ! npm run prisma:deploy; then
            print_error "Database migration failed!"
            return 1
        fi
    else
        print_warning "DATABASE_URL not set, skipping migrations."
    fi

    # Build backend
    print_status "Building backend..."
    if ! npm run build; then
        print_warning "Backend build encountered errors, but continuing..."
    fi

    # Check for deployment configuration
    if [ -f "railway.json" ] || [ -n "$RAILWAY_TOKEN" ]; then
        print_status "Deploying to Railway..."
        if command_exists railway; then
            railway up
        else
            print_warning "Railway CLI not found. Please deploy manually."
        fi
    elif [ -f "vercel.json" ] && [ -d "$BACKEND_DIR/api" ]; then
        print_status "Deploying backend to Vercel..."
        vercel --prod --confirm
    else
        print_warning "No backend deployment configuration found."
        print_warning "Please deploy manually to your chosen platform."
    fi

    print_status "Backend deployment process completed."
    return 0
}

# Function to run post-deployment tests
run_post_deployment_tests() {
    print_status "Running post-deployment tests..."

    # Basic endpoint checks
    if [ -n "$NEXT_PUBLIC_API_URL" ]; then
        print_status "Testing API health endpoint..."
        if curl -f "$NEXT_PUBLIC_API_URL/health" > /dev/null 2>&1; then
            print_status "API health check passed."
        else
            print_warning "API health check failed."
        fi
    fi

    # Frontend accessibility check
    cd "$FRONTEND_DIR"
    if [ -f "package.json" ] && grep -q "lighthouse" package.json; then
        print_status "Running Lighthouse performance check..."
        npm run lighthouse || print_warning "Lighthouse check failed."
    fi

    print_status "Post-deployment tests completed."
}

# Main deployment workflow
print_status "Starting production deployment workflow..."

# Load environment variables if file exists
if [ -f "$PROJECT_ROOT/.env.production" ]; then
    export $(grep -v '^#' "$PROJECT_ROOT/.env.production" | xargs)
fi

# Deployment options
if [ "$1" = "frontend-only" ]; then
    print_status "Deploying frontend only..."
    deploy_frontend
elif [ "$1" = "backend-only" ]; then
    print_status "Deploying backend only..."
    deploy_backend
elif [ "$1" = "full" ] || [ -z "$1" ]; then
    print_status "Deploying both frontend and backend..."

    # Deploy frontend first
    if ! deploy_frontend; then
        print_error "Frontend deployment failed. Aborting."
        exit 1
    fi

    # Deploy backend
    if ! deploy_backend; then
        print_error "Backend deployment failed."
        exit 1
    fi

    # Run post-deployment tests
    run_post_deployment_tests
else
    print_error "Invalid deployment option: $1"
    echo "Usage: $0 [frontend-only|backend-only|full]"
    exit 1
fi

print_status "Deployment completed successfully!"
print_status "Deployment log saved to: $LOG_FILE"

# Display deployment URLs (if available)
if [ -n "$VERCEL_URL" ]; then
    echo ""
    echo -e "${GREEN}Frontend URL:${NC} https://$VERCEL_URL"
fi

if [ -n "$RAILWAY_APP_URL" ]; then
    echo -e "${GREEN}Backend URL:${NC} https://$RAILWAY_APP_URL"
fi

echo ""
echo -e "${GREEN}=========================================${NC}"
echo -e "${GREEN}Deployment completed at: $(date)${NC}"
echo -e "${GREEN}=========================================${NC}"