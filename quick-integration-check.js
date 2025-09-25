#!/usr/bin/env node
/**
 * Quick Integration Check Script
 * DPNR Course Registration Platform
 *
 * Performs a rapid validation of key integration points
 * to ensure system is ready for comprehensive testing
 */

const axios = require('axios');
const fs = require('fs');
const path = require('path');

// Configuration
const CONFIG = {
  frontend: 'http://localhost:3000',
  backend: 'http://localhost:3003',
  timeout: 5000
};

// Test results tracking
const results = {
  passed: 0,
  failed: 0,
  tests: []
};

function log(message, status = 'info') {
  const timestamp = new Date().toISOString().split('T')[1].split('.')[0];
  const statusEmoji = {
    success: '✅',
    error: '❌',
    warning: '⚠️',
    info: 'ℹ️'
  };

  console.log(`[${timestamp}] ${statusEmoji[status] || 'ℹ️'} ${message}`);
}

function recordTest(name, passed, error = null) {
  results.tests.push({
    name,
    passed,
    error: error?.message || null,
    timestamp: new Date()
  });

  if (passed) {
    results.passed++;
    log(`${name} - PASSED`, 'success');
  } else {
    results.failed++;
    log(`${name} - FAILED: ${error?.message}`, 'error');
  }
}

async function checkFileExists(filePath, description) {
  try {
    const exists = fs.existsSync(filePath);
    recordTest(description, exists, exists ? null : new Error(`File not found: ${filePath}`));
    return exists;
  } catch (error) {
    recordTest(description, false, error);
    return false;
  }
}

async function checkServiceHealth(url, serviceName) {
  try {
    const response = await axios.get(url, { timeout: CONFIG.timeout });
    const passed = response.status === 200;
    recordTest(`${serviceName} Health Check`, passed, passed ? null : new Error(`Status: ${response.status}`));
    return passed;
  } catch (error) {
    recordTest(`${serviceName} Health Check`, false, error);
    return false;
  }
}

async function checkApiEndpoint(url, endpointName, expectedStatus = 200) {
  try {
    const response = await axios.get(url, {
      timeout: CONFIG.timeout,
      validateStatus: (status) => status < 500 // Accept any status < 500
    });

    const passed = response.status === expectedStatus;
    recordTest(`${endpointName} Endpoint`, passed,
      passed ? null : new Error(`Expected ${expectedStatus}, got ${response.status}`));
    return passed;
  } catch (error) {
    recordTest(`${endpointName} Endpoint`, false, error);
    return false;
  }
}

async function checkDatabaseConnection() {
  try {
    // Check if backend can connect to database via health endpoint
    const response = await axios.get(`${CONFIG.backend}/health`, { timeout: CONFIG.timeout });

    if (response.data && response.data.status === 'healthy') {
      recordTest('Database Connection', true);
      return true;
    } else {
      recordTest('Database Connection', false, new Error('Health check indicates database issues'));
      return false;
    }
  } catch (error) {
    recordTest('Database Connection', false, error);
    return false;
  }
}

async function checkEnvironmentFiles() {
  log('Checking environment configuration files...');

  const files = [
    { path: 'backend/.env', desc: 'Backend Environment File' },
    { path: 'frontend/.env.local', desc: 'Frontend Environment File' },
    { path: 'backend/package.json', desc: 'Backend Package Configuration' },
    { path: 'frontend/package.json', desc: 'Frontend Package Configuration' },
    { path: 'backend/prisma/schema.prisma', desc: 'Database Schema' }
  ];

  let allExist = true;
  for (const file of files) {
    const exists = await checkFileExists(file.path, file.desc);
    if (!exists) allExist = false;
  }

  return allExist;
}

async function checkTestFiles() {
  log('Checking test file structure...');

  const testFiles = [
    { path: 'backend/tests/integration/api/complete-integration.test.ts', desc: 'Backend Integration Tests' },
    { path: 'cypress/e2e/full-user-journey.cy.js', desc: 'E2E User Journey Tests' },
    { path: 'cypress/e2e/payment-integration.cy.js', desc: 'E2E Payment Tests' },
    { path: 'e2e-integration-tests.js', desc: 'Integration Test Suite' },
    { path: 'run-integration-tests.sh', desc: 'Test Runner Script' }
  ];

  let allExist = true;
  for (const file of testFiles) {
    const exists = await checkFileExists(file.path, file.desc);
    if (!exists) allExist = false;
  }

  return allExist;
}

async function checkBuildArtifacts() {
  log('Checking build artifacts...');

  const buildPaths = [
    { path: 'backend/dist', desc: 'Backend Build Directory' },
    { path: 'frontend/.next', desc: 'Frontend Build Directory' }
  ];

  let buildsExist = true;
  for (const build of buildPaths) {
    const exists = fs.existsSync(build.path);
    recordTest(build.desc, exists, exists ? null : new Error('Build directory not found - run npm run build'));
    if (!exists) buildsExist = false;
  }

  return buildsExist;
}

async function checkPackageIntegrity() {
  log('Checking package integrity...');

  const lockFiles = [
    { path: 'backend/package-lock.json', desc: 'Backend Package Lock' },
    { path: 'frontend/package-lock.json', desc: 'Frontend Package Lock' }
  ];

  let allValid = true;
  for (const lock of lockFiles) {
    const exists = await checkFileExists(lock.path, lock.desc);
    if (!exists) allValid = false;
  }

  return allValid;
}

async function performQuickAPITests() {
  log('Performing quick API tests...');

  const endpoints = [
    { url: `${CONFIG.backend}/health`, name: 'Health Endpoint', status: 200 },
    { url: `${CONFIG.backend}/v1/health`, name: 'API Health Endpoint', status: 200 },
    { url: `${CONFIG.backend}/v1/test`, name: 'API Test Endpoint', status: 200 },
    { url: `${CONFIG.backend}/v1/cohorts/current`, name: 'Cohorts Endpoint', status: 200 },
    { url: `${CONFIG.backend}/v1/enrollments`, name: 'Protected Endpoint (Unauthorized)', status: 401 }
  ];

  let allPassed = true;
  for (const endpoint of endpoints) {
    const passed = await checkApiEndpoint(endpoint.url, endpoint.name, endpoint.status);
    if (!passed) allPassed = false;
  }

  return allPassed;
}

async function checkFrontendAccessibility() {
  log('Checking frontend accessibility...');

  try {
    const response = await axios.get(CONFIG.frontend, { timeout: CONFIG.timeout });

    if (response.status === 200) {
      // Check if it's actually HTML content
      const isHtml = response.headers['content-type']?.includes('text/html');
      recordTest('Frontend Accessibility', isHtml,
        isHtml ? null : new Error('Frontend not serving HTML content'));
      return isHtml;
    } else {
      recordTest('Frontend Accessibility', false, new Error(`Status: ${response.status}`));
      return false;
    }
  } catch (error) {
    recordTest('Frontend Accessibility', false, error);
    return false;
  }
}

async function generateQuickReport() {
  const total = results.passed + results.failed;
  const passRate = total > 0 ? ((results.passed / total) * 100).toFixed(1) : 0;

  const report = {
    timestamp: new Date().toISOString(),
    summary: {
      total,
      passed: results.passed,
      failed: results.failed,
      passRate: `${passRate}%`
    },
    status: results.failed === 0 ? 'READY' : 'NEEDS_ATTENTION',
    tests: results.tests,
    recommendations: []
  };

  // Add recommendations based on failures
  if (results.failed > 0) {
    report.recommendations.push('Address failed tests before running comprehensive integration tests');

    const failedTests = results.tests.filter(t => !t.passed);
    if (failedTests.some(t => t.name.includes('Health Check'))) {
      report.recommendations.push('Start backend and frontend services: npm run dev');
    }
    if (failedTests.some(t => t.name.includes('Build'))) {
      report.recommendations.push('Build projects: npm run build in both backend and frontend directories');
    }
    if (failedTests.some(t => t.name.includes('Environment'))) {
      report.recommendations.push('Check environment configuration files');
    }
  } else {
    report.recommendations.push('System is ready for comprehensive integration testing');
    report.recommendations.push('Run: ./run-integration-tests.sh');
  }

  // Save report
  const reportPath = 'quick-integration-report.json';
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));

  return report;
}

async function main() {
  console.log('🚀 DPNR Platform - Quick Integration Check');
  console.log('==========================================\n');

  log('Starting quick integration validation...');

  // Run all checks
  const checks = [
    { name: 'Environment Files', fn: checkEnvironmentFiles },
    { name: 'Test Files', fn: checkTestFiles },
    { name: 'Package Integrity', fn: checkPackageIntegrity },
    { name: 'Build Artifacts', fn: checkBuildArtifacts },
    { name: 'Database Connection', fn: checkDatabaseConnection },
    { name: 'Backend Service', fn: () => checkServiceHealth(`${CONFIG.backend}/health`, 'Backend') },
    { name: 'Frontend Service', fn: () => checkServiceHealth(CONFIG.frontend, 'Frontend') },
    { name: 'Frontend Accessibility', fn: checkFrontendAccessibility },
    { name: 'API Tests', fn: performQuickAPITests }
  ];

  let allPassed = true;

  for (const check of checks) {
    try {
      log(`Running ${check.name} check...`);
      const passed = await check.fn();
      if (!passed) allPassed = false;
    } catch (error) {
      log(`${check.name} check failed: ${error.message}`, 'error');
      allPassed = false;
    }
    console.log(''); // Add spacing
  }

  // Generate and display report
  const report = await generateQuickReport();

  console.log('📊 Quick Integration Check Results');
  console.log('==================================');
  console.log(`Status: ${report.status}`);
  console.log(`Total Tests: ${report.summary.total}`);
  console.log(`Passed: ${report.summary.passed}`);
  console.log(`Failed: ${report.summary.failed}`);
  console.log(`Pass Rate: ${report.summary.passRate}`);

  if (report.recommendations.length > 0) {
    console.log('\n📝 Recommendations:');
    report.recommendations.forEach((rec, i) => {
      console.log(`${i + 1}. ${rec}`);
    });
  }

  console.log(`\n📄 Detailed report saved: quick-integration-report.json`);

  if (report.status === 'READY') {
    log('🎉 System is ready for comprehensive integration testing!', 'success');
    console.log('\nNext steps:');
    console.log('1. Run comprehensive tests: ./run-integration-tests.sh');
    console.log('2. Review test results and reports');
    console.log('3. Address any issues found');
    console.log('4. Deploy to staging/production');
    process.exit(0);
  } else {
    log('⚠️  System needs attention before comprehensive testing', 'warning');
    console.log('\nPlease address the failed tests and run this check again.');
    process.exit(1);
  }
}

// Handle script execution
if (require.main === module) {
  main().catch(error => {
    log(`Quick integration check failed: ${error.message}`, 'error');
    process.exit(1);
  });
}

module.exports = { main, checkServiceHealth, checkApiEndpoint };