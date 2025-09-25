// Vercel serverless function entry point
const path = require('path');

// Set up environment
process.env.NODE_ENV = 'production';

// Load production environment
require('dotenv').config({ path: path.join(__dirname, '..', '.env.production') });

// Import the compiled app
const app = require('../dist/index.js').default || require('../dist/index.js');

// Export for Vercel
module.exports = app;