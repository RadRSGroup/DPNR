#!/usr/bin/env node

const path = require('path');
const fs = require('fs');

// Set production environment
process.env.NODE_ENV = 'production';

// Load production environment variables
const prodEnvPath = path.join(__dirname, '.env.production');
if (fs.existsSync(prodEnvPath)) {
  require('dotenv').config({ path: prodEnvPath });
}

// Also load any .env file
const envPath = path.join(__dirname, '.env');
if (fs.existsSync(envPath)) {
  require('dotenv').config({ path: envPath, override: false });
}

// Check required environment variables
const requiredVars = [
  'DATABASE_URL',
  'AWS_COGNITO_USER_POOL_ID',
  'AWS_COGNITO_CLIENT_ID',
  'AWS_REGION'
];

const missingVars = requiredVars.filter(varName => !process.env[varName]);
if (missingVars.length > 0) {
  console.error('❌ Missing required environment variables:', missingVars.join(', '));
  process.exit(1);
}

console.log('🚀 Starting DPNR Backend in production mode...');
console.log('🌍 Environment:', process.env.NODE_ENV);
console.log('🔗 Database:', process.env.DATABASE_URL ? 'Connected' : 'Not configured');
console.log('🔐 AWS Cognito:', process.env.AWS_COGNITO_USER_POOL_ID ? 'Configured' : 'Not configured');

// Start the application
require('./dist/index.js');