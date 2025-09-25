#!/bin/bash

# DPNR Database Quick Setup Script
# This script sets up the database infrastructure for immediate deployment

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
BOLD='\033[1m'
NC='\033[0m' # No Color

# Helper functions
print_header() {
    echo -e "\n${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${BOLD}$1${NC}"
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}\n"
}

print_step() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

print_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

# Check if we're in the right directory
check_directory() {
    if [ ! -f "package.json" ] || [ ! -d "backend" ] || [ ! -d "frontend" ]; then
        print_error "Please run this script from the project root directory"
        exit 1
    fi
}

# Check prerequisites
check_prerequisites() {
    print_header "🔍 CHECKING PREREQUISITES"

    # Check Node.js
    if ! command -v node &> /dev/null; then
        print_error "Node.js is not installed. Please install Node.js 18+ first."
        exit 1
    fi

    NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
    if [ "$NODE_VERSION" -lt 18 ]; then
        print_error "Node.js version 18+ required. Current version: $(node -v)"
        exit 1
    fi
    print_step "Node.js $(node -v) detected"

    # Check npm
    if ! command -v npm &> /dev/null; then
        print_error "npm is not installed"
        exit 1
    fi
    print_step "npm $(npm -v) detected"

    # Check Docker (optional)
    if command -v docker &> /dev/null; then
        print_step "Docker detected (will use for local database)"
        export USE_DOCKER=true
    else
        print_warning "Docker not found. You'll need PostgreSQL installed locally."
        export USE_DOCKER=false
    fi

    # Check PostgreSQL (if not using Docker)
    if [ "$USE_DOCKER" = "false" ]; then
        if ! command -v psql &> /dev/null; then
            print_error "PostgreSQL is not installed. Please install PostgreSQL or Docker."
            exit 1
        fi
        print_step "PostgreSQL detected"
    fi
}

# Install dependencies
install_dependencies() {
    print_header "📦 INSTALLING DEPENDENCIES"

    # Backend dependencies
    print_info "Installing backend dependencies..."
    cd backend
    npm install
    cd ..
    print_step "Backend dependencies installed"

    # Frontend dependencies
    print_info "Installing frontend dependencies..."
    cd frontend
    npm install
    cd ..
    print_step "Frontend dependencies installed"
}

# Setup environment files
setup_environment() {
    print_header "⚙️  SETTING UP ENVIRONMENT"

    # Backend environment
    if [ ! -f "backend/.env" ]; then
        print_info "Creating backend .env file..."
        cp backend/.env.example backend/.env

        if [ "$USE_DOCKER" = "true" ]; then
            # Use Docker database URL
            sed -i '' 's|DATABASE_URL="postgresql://username:password@localhost:5432/dpnr_dev"|DATABASE_URL="postgresql://dpnr_user:dpnr_password@localhost:5432/dpnr_dev?schema=public"|' backend/.env
        fi

        print_step "Backend .env file created"
        print_warning "Please review and update backend/.env with your actual values"
    else
        print_step "Backend .env file already exists"
    fi

    # Frontend environment
    if [ ! -f "frontend/.env.local" ]; then
        if [ -f "frontend/.env.local.example" ]; then
            print_info "Creating frontend .env.local file..."
            cp frontend/.env.local.example frontend/.env.local
            print_step "Frontend .env.local file created"
            print_warning "Please review and update frontend/.env.local with your actual values"
        fi
    else
        print_step "Frontend .env.local file already exists"
    fi
}

# Setup local database
setup_database() {
    print_header "🗄️  SETTING UP DATABASE"

    if [ "$USE_DOCKER" = "true" ]; then
        print_info "Starting PostgreSQL with Docker..."
        docker-compose up -d postgres

        # Wait for database to be ready
        print_info "Waiting for database to be ready..."
        sleep 10

        # Test connection
        for i in {1..30}; do
            if docker-compose exec -T postgres pg_isready -U dpnr_user -d dpnr_dev > /dev/null 2>&1; then
                break
            fi
            echo -n "."
            sleep 2
        done
        echo ""

        print_step "PostgreSQL started with Docker"
    else
        print_info "Using local PostgreSQL installation"
        print_warning "Please ensure PostgreSQL is running and create the database manually:"
        echo "  createdb dpnr_dev"
        echo "  createuser -P dpnr_user"
        echo "  psql -d dpnr_dev -c \"GRANT ALL PRIVILEGES ON DATABASE dpnr_dev TO dpnr_user;\""

        read -p "Press Enter when database is ready..."
    fi

    # Setup database schema
    print_info "Setting up database schema..."
    cd backend

    # Initialize migration if needed
    if [ ! -d "prisma/migrations" ] || [ -z "$(ls -A prisma/migrations 2>/dev/null)" ]; then
        print_info "Creating initial migration..."
        npm run db:init-migration
    fi

    # Run database setup
    npm run db:setup
    print_step "Database schema setup complete"

    # Seed database
    print_info "Seeding database with sample data..."
    npm run db:seed
    print_step "Database seeded with sample data"

    cd ..
}

# Verify setup
verify_setup() {
    print_header "✅ VERIFYING SETUP"

    cd backend

    # Health check
    print_info "Running database health check..."
    if npm run db:health > /dev/null 2>&1; then
        print_step "Database health check passed"
    else
        print_error "Database health check failed"
        print_info "Running detailed health check..."
        npm run db:health
        exit 1
    fi

    # Test build
    print_info "Testing backend build..."
    if npm run build > /dev/null 2>&1; then
        print_step "Backend build successful"
    else
        print_error "Backend build failed"
        npm run build
        exit 1
    fi

    cd ..

    # Frontend build test
    print_info "Testing frontend build..."
    cd frontend
    if npm run build > /dev/null 2>&1; then
        print_step "Frontend build successful"
    else
        print_error "Frontend build failed"
        npm run build
        exit 1
    fi
    cd ..
}

# Display next steps
show_next_steps() {
    print_header "🎉 SETUP COMPLETE!"

    echo -e "${GREEN}Your DPNR platform is ready for development!${NC}\n"

    echo -e "${BOLD}🚀 Start Development:${NC}"
    echo "   Backend:  cd backend && npm run dev"
    echo "   Frontend: cd frontend && npm run dev"
    echo ""

    echo -e "${BOLD}📊 Database Management:${NC}"
    echo "   Studio:       cd backend && npm run prisma:studio"
    echo "   Health Check: cd backend && npm run db:health"
    echo "   Reset DB:     cd backend && npm run db:reset"
    echo ""

    echo -e "${BOLD}🌐 URLs (when running):${NC}"
    echo "   Frontend:     http://localhost:3000"
    echo "   Backend API:  http://localhost:3001"
    echo "   Prisma Studio: http://localhost:5555"
    if [ "$USE_DOCKER" = "true" ]; then
        echo "   MailHog UI:   http://localhost:8025"
    fi
    echo ""

    echo -e "${BOLD}📚 Production Deployment:${NC}"
    echo "   Read: DATABASE_DEPLOYMENT.md"
    echo "   Use:  DATABASE_CHECKLIST.md"
    echo ""

    echo -e "${BOLD}🔧 Configuration Files to Review:${NC}"
    echo "   • backend/.env (database, AWS, payment settings)"
    echo "   • frontend/.env.local (frontend configuration)"
    echo ""

    if [ "$USE_DOCKER" = "true" ]; then
        echo -e "${YELLOW}💡 Docker Services Started:${NC}"
        echo "   Stop with: docker-compose down"
        echo "   Restart:   docker-compose up -d"
        echo ""
    fi

    echo -e "${BOLD}❓ Need Help?${NC}"
    echo "   • Check DATABASE_DEPLOYMENT.md for detailed guides"
    echo "   • Use DATABASE_CHECKLIST.md for deployment steps"
    echo "   • Run health checks: npm run db:health"
}

# Main execution
main() {
    print_header "🚀 DPNR PLATFORM QUICK SETUP"

    echo -e "${BLUE}This script will set up your DPNR platform for development.${NC}"
    echo -e "${BLUE}It will:${NC}"
    echo "   • Install dependencies"
    echo "   • Configure environment files"
    echo "   • Set up PostgreSQL database"
    echo "   • Run initial migrations"
    echo "   • Seed test data"
    echo "   • Verify the setup"
    echo ""

    read -p "Continue? (y/N): " -n 1 -r
    echo ""
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        print_info "Setup cancelled."
        exit 0
    fi

    check_directory
    check_prerequisites
    install_dependencies
    setup_environment
    setup_database
    verify_setup
    show_next_steps

    print_info "Setup completed successfully! 🎉"
}

# Handle interrupts gracefully
trap 'print_error "\nSetup interrupted by user"; exit 1' INT

# Run main function
main "$@"