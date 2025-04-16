# User Onboarding Questionnaire

A progressive, adaptive user onboarding questionnaire that supports multi-phase evaluation with built-in recursive triggers.

## Project Structure

```
DPNR/
├── frontend/           # React frontend application
├── backend/           # FastAPI backend service
├── mocks/            # API mock data and responses
├── tests/            # Test suites and configurations
└── docs/             # Project documentation
```

## Development Setup

### Prerequisites
- Node.js (v18 or higher)
- Python (3.9 or higher)
- Docker and Docker Compose

### Installation

1. Clone the repository
2. Install frontend dependencies:
   ```bash
   cd frontend
   npm install
   ```

3. Install backend dependencies:
   ```bash
   cd backend
   pip install -r requirements.txt
   ```

4. Start the development environment:
   ```bash
   docker-compose up --build
   ```

## Development Tasks

### Phase 1: Front-End Component Development
- [ ] Task 1.1: Registration Screen
- [ ] Task 1.2: Quick-Fire Phase UI
- [ ] Task 1.3: Primary & Confirmation Phase UI

### Phase 2: Backend Mocking & API Integration
- [ ] Task 2.1: API Mocking Setup
- [ ] Task 2.2: API Integration

### Phase 3: Testing & Quality Assurance
- [ ] Task 3.1: E2E Testing
- [ ] Task 3.2: Performance & Accessibility

### Phase 4: Documentation & Handoff
- [ ] Task 4.1: Test Report
- [ ] Task 4.2: Team Handoff

## Testing

Run the test suites:
```bash
# Frontend tests
cd frontend
npm test

# Backend tests
cd backend
pytest

# E2E tests
npm run test:e2e
```

## Contributing

Please follow the project's coding standards and submit pull requests for any changes.

## License

[License information to be added] 