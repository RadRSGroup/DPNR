# DPNR Backend API

Backend service for the DPNR Course Registration Platform built with Node.js, Express.js, TypeScript, and Prisma ORM.

## Project Structure

```
backend/
├── src/
│   ├── api/           # Express routes and controllers
│   ├── services/      # Business logic layer
│   ├── middleware/    # Custom middleware (auth, validation)
│   ├── models/        # Data models and types
│   ├── database/      # Database connection and utilities
│   ├── utils/         # Helper functions and utilities
│   └── index.ts       # Main application entry point
├── tests/
│   ├── contract/      # Contract tests
│   ├── integration/   # Integration tests
│   └── unit/          # Unit tests
├── prisma/           # Database schema and migrations
└── dist/            # Compiled JavaScript output
```

## Tech Stack

- **Runtime**: Node.js 20+
- **Framework**: Express.js
- **Language**: TypeScript
- **Database**: PostgreSQL with Prisma ORM
- **Authentication**: AWS Cognito + JWT
- **Testing**: Jest + Supertest
- **Linting**: ESLint + Prettier

## Core Dependencies

- `express` - Web framework
- `@prisma/client` - Database ORM
- `cors` - Cross-origin resource sharing
- `helmet` - Security middleware
- `dotenv` - Environment variables
- `zod` - Schema validation
- `jsonwebtoken` - JWT handling
- `bcryptjs` - Password hashing

## Development Dependencies

- `typescript` - TypeScript compiler
- `ts-node` - TypeScript execution
- `nodemon` - Development server with hot reload
- `jest` - Testing framework
- `eslint` - Code linting
- `prettier` - Code formatting

## Available Scripts

### Development
- `npm run dev` - Start development server with hot reload
- `npm run build` - Compile TypeScript to JavaScript
- `npm start` - Start production server

### Testing
- `npm test` - Run all tests
- `npm run test:unit` - Run unit tests only
- `npm run test:integration` - Run integration tests only
- `npm run test:contract` - Run contract tests only
- `npm run test:watch` - Run tests in watch mode
- `npm run test:coverage` - Run tests with coverage report

### Database
- `npm run prisma:generate` - Generate Prisma client
- `npm run prisma:migrate` - Run database migrations
- `npm run prisma:studio` - Open Prisma Studio GUI
- `npm run db:seed` - Seed database with test data

### Code Quality
- `npm run lint` - Check code with ESLint
- `npm run lint:fix` - Fix ESLint issues automatically
- `npm run format` - Format code with Prettier
- `npm run type-check` - Check TypeScript types

## Getting Started

1. **Install Dependencies**
   ```bash
   npm install
   ```

2. **Set Up Environment**
   ```bash
   cp .env.example .env
   # Edit .env with your configuration
   ```

3. **Set Up Database**
   ```bash
   npm run prisma:migrate
   npm run prisma:generate
   ```

4. **Start Development Server**
   ```bash
   npm run dev
   ```

5. **Verify Setup**
   - Health check: http://localhost:3001/health
   - API base: http://localhost:3001/v1

## Environment Variables

Required environment variables (see `.env.example`):

```env
DATABASE_URL=postgresql://user:password@localhost:5432/dpnr
JWT_SECRET=your-jwt-secret
AWS_COGNITO_USER_POOL_ID=your-user-pool-id
AWS_COGNITO_CLIENT_ID=your-client-id
TRANZILA_TERMINAL=your-terminal
TRANZILA_API_KEY=your-api-key
CORS_ORIGIN=http://localhost:3000
```

## API Documentation

The API follows RESTful conventions with the following main endpoints:

- `GET /health` - Health check
- `GET /v1/cohorts` - Course cohorts
- `POST /v1/enrollments` - Student enrollment
- `POST /v1/consultations` - Consultation requests
- `GET /v1/users/profile` - User profile management
- `POST /v1/privacy/*` - GDPR compliance endpoints

## Testing

The project includes comprehensive testing with:

- **Unit tests**: Test individual functions and services
- **Integration tests**: Test API endpoints and database interactions
- **Contract tests**: Verify API contracts and data models

Run tests with coverage:
```bash
npm run test:coverage
```

## Deployment

For production deployment:

1. Build the application:
   ```bash
   npm run build
   ```

2. Set production environment variables

3. Start the server:
   ```bash
   npm start
   ```

## Contributing

1. Follow TypeScript strict mode guidelines
2. Write tests for new features
3. Use ESLint and Prettier for code formatting
4. Follow conventional commit messages
5. Ensure all tests pass before submitting PRs

## License

MIT License - see LICENSE file for details