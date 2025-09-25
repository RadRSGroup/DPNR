import * as dotenv from 'dotenv';
import { PrismaClient } from '@prisma/client';

// Load environment variables
dotenv.config();

interface ValidationResult {
  category: string;
  checks: ValidationCheck[];
  passed: number;
  failed: number;
  warnings: number;
  status: 'pass' | 'fail' | 'warn';
}

interface ValidationCheck {
  name: string;
  status: 'pass' | 'fail' | 'warn';
  message: string;
  critical: boolean;
  fix?: string;
}

async function validateProductionEnvironment(): Promise<ValidationResult[]> {
  console.log('🔍 DPNR Production Environment Validation\n');

  const results: ValidationResult[] = [
    await validateEnvironmentVariables(),
    await validateDatabaseConfiguration(),
    await validateSecuritySettings(),
    await validatePaymentConfiguration(),
    await validateEmailConfiguration(),
    await validateMonitoringConfiguration()
  ];

  printValidationSummary(results);
  return results;
}

async function validateEnvironmentVariables(): Promise<ValidationResult> {
  const checks: ValidationCheck[] = [];

  // Required environment variables
  const requiredVars = [
    { name: 'DATABASE_URL', critical: true },
    { name: 'NODE_ENV', critical: true },
    { name: 'JWT_SECRET', critical: true },
    { name: 'AWS_COGNITO_USER_POOL_ID', critical: true },
    { name: 'AWS_COGNITO_CLIENT_ID', critical: true },
    { name: 'TRANZILA_TERMINAL', critical: true },
    { name: 'TRANZILA_API_KEY', critical: true },
    { name: 'CORS_ORIGIN', critical: true },
  ];

  requiredVars.forEach(variable => {
    const value = process.env[variable.name];
    if (!value) {
      checks.push({
        name: variable.name,
        status: variable.critical ? 'fail' : 'warn',
        message: `Missing required environment variable: ${variable.name}`,
        critical: variable.critical,
        fix: `Add ${variable.name} to your environment configuration`
      });
    } else if (value.includes('your-') || value.includes('change-in-production')) {
      checks.push({
        name: variable.name,
        status: 'fail',
        message: `${variable.name} contains placeholder value`,
        critical: true,
        fix: `Replace placeholder value in ${variable.name}`
      });
    } else {
      checks.push({
        name: variable.name,
        status: 'pass',
        message: `${variable.name} is configured`,
        critical: variable.critical
      });
    }
  });

  // Check NODE_ENV
  if (process.env.NODE_ENV !== 'production') {
    checks.push({
      name: 'NODE_ENV',
      status: 'warn',
      message: `NODE_ENV is ${process.env.NODE_ENV}, expected 'production'`,
      critical: false,
      fix: 'Set NODE_ENV=production for production deployment'
    });
  }

  return summarizeChecks('Environment Variables', checks);
}

async function validateDatabaseConfiguration(): Promise<ValidationResult> {
  const checks: ValidationCheck[] = [];
  const prisma = new PrismaClient();

  try {
    // Test connection
    await prisma.$connect();
    checks.push({
      name: 'Database Connection',
      status: 'pass',
      message: 'Database connection successful',
      critical: true
    });

    // Check SSL mode
    const databaseUrl = process.env.DATABASE_URL || '';
    if (databaseUrl.includes('sslmode=require') || databaseUrl.includes('ssl=true')) {
      checks.push({
        name: 'SSL Configuration',
        status: 'pass',
        message: 'SSL enabled for database connection',
        critical: true
      });
    } else if (databaseUrl.includes('localhost') || databaseUrl.includes('127.0.0.1')) {
      checks.push({
        name: 'SSL Configuration',
        status: 'warn',
        message: 'Local database detected, SSL not required',
        critical: false
      });
    } else {
      checks.push({
        name: 'SSL Configuration',
        status: 'fail',
        message: 'SSL not configured for production database',
        critical: true,
        fix: 'Add ?sslmode=require to DATABASE_URL'
      });
    }

    // Check if using a managed service
    const managedServices = ['vercel', 'supabase', 'railway', 'amazonaws', 'digitalocean'];
    const isManaged = managedServices.some(service => databaseUrl.includes(service));

    if (isManaged) {
      checks.push({
        name: 'Database Provider',
        status: 'pass',
        message: 'Using managed database service',
        critical: false
      });
    } else {
      checks.push({
        name: 'Database Provider',
        status: 'warn',
        message: 'Using self-managed database',
        critical: false,
        fix: 'Ensure proper backup and monitoring for self-managed database'
      });
    }

  } catch (error) {
    checks.push({
      name: 'Database Connection',
      status: 'fail',
      message: `Database connection failed: ${error}`,
      critical: true,
      fix: 'Verify DATABASE_URL and database server status'
    });
  } finally {
    await prisma.$disconnect();
  }

  return summarizeChecks('Database Configuration', checks);
}

async function validateSecuritySettings(): Promise<ValidationResult> {
  const checks: ValidationCheck[] = [];

  // JWT Secret strength
  const jwtSecret = process.env.JWT_SECRET;
  if (jwtSecret) {
    if (jwtSecret.length < 32) {
      checks.push({
        name: 'JWT Secret Strength',
        status: 'fail',
        message: 'JWT secret is too short (minimum 32 characters)',
        critical: true,
        fix: 'Generate a longer, more secure JWT secret'
      });
    } else if (jwtSecret === process.env.JWT_REFRESH_SECRET) {
      checks.push({
        name: 'JWT Secret Uniqueness',
        status: 'fail',
        message: 'JWT secret and refresh secret are identical',
        critical: true,
        fix: 'Use different secrets for JWT and refresh tokens'
      });
    } else {
      checks.push({
        name: 'JWT Secret',
        status: 'pass',
        message: 'JWT secret is properly configured',
        critical: true
      });
    }
  }

  // CORS configuration
  const corsOrigin = process.env.CORS_ORIGIN;
  if (corsOrigin) {
    if (corsOrigin === '*') {
      checks.push({
        name: 'CORS Configuration',
        status: 'fail',
        message: 'CORS allows all origins (security risk)',
        critical: true,
        fix: 'Set CORS_ORIGIN to your specific frontend domain'
      });
    } else if (corsOrigin.startsWith('http://')) {
      checks.push({
        name: 'CORS Security',
        status: 'warn',
        message: 'CORS origin uses HTTP instead of HTTPS',
        critical: false,
        fix: 'Use HTTPS for production frontend'
      });
    } else {
      checks.push({
        name: 'CORS Configuration',
        status: 'pass',
        message: 'CORS properly configured',
        critical: true
      });
    }
  }

  // Cookie security
  const cookieSecure = process.env.COOKIE_SECURE;
  if (cookieSecure !== 'true') {
    checks.push({
      name: 'Cookie Security',
      status: 'warn',
      message: 'Cookies not configured as secure',
      critical: false,
      fix: 'Set COOKIE_SECURE=true for production'
    });
  } else {
    checks.push({
      name: 'Cookie Security',
      status: 'pass',
      message: 'Cookies configured securely',
      critical: false
    });
  }

  return summarizeChecks('Security Settings', checks);
}

async function validatePaymentConfiguration(): Promise<ValidationResult> {
  const checks: ValidationCheck[] = [];

  // Tranzila configuration
  const tranzillaMode = process.env.TRANZILA_MODE;
  const tranzillaTerminal = process.env.TRANZILA_TERMINAL;
  const tranzillaApiKey = process.env.TRANZILA_API_KEY;

  if (tranzillaMode === 'production') {
    checks.push({
      name: 'Tranzila Mode',
      status: 'pass',
      message: 'Tranzila in production mode',
      critical: true
    });
  } else {
    checks.push({
      name: 'Tranzila Mode',
      status: 'warn',
      message: `Tranzila in ${tranzillaMode} mode`,
      critical: false,
      fix: 'Set TRANZILA_MODE=production for live payments'
    });
  }

  if (tranzillaTerminal && !tranzillaTerminal.includes('test')) {
    checks.push({
      name: 'Tranzila Terminal',
      status: 'pass',
      message: 'Tranzila terminal configured',
      critical: true
    });
  } else if (tranzillaTerminal?.includes('test')) {
    checks.push({
      name: 'Tranzila Terminal',
      status: 'warn',
      message: 'Using test terminal ID',
      critical: false,
      fix: 'Use production terminal ID for live payments'
    });
  }

  if (tranzillaApiKey && !tranzillaApiKey.includes('test')) {
    checks.push({
      name: 'Tranzila API Key',
      status: 'pass',
      message: 'Tranzila API key configured',
      critical: true
    });
  } else if (tranzillaApiKey?.includes('test')) {
    checks.push({
      name: 'Tranzila API Key',
      status: 'warn',
      message: 'Using test API key',
      critical: false,
      fix: 'Use production API key for live payments'
    });
  }

  // Webhook security
  const webhookSecret = process.env.WEBHOOK_SECRET;
  if (!webhookSecret || webhookSecret.includes('your-')) {
    checks.push({
      name: 'Webhook Security',
      status: 'fail',
      message: 'Webhook secret not configured',
      critical: true,
      fix: 'Set WEBHOOK_SECRET for secure payment webhooks'
    });
  } else {
    checks.push({
      name: 'Webhook Security',
      status: 'pass',
      message: 'Webhook secret configured',
      critical: true
    });
  }

  return summarizeChecks('Payment Configuration', checks);
}

async function validateEmailConfiguration(): Promise<ValidationResult> {
  const checks: ValidationCheck[] = [];

  // SMTP configuration
  const smtpHost = process.env.SMTP_HOST;
  const smtpUser = process.env.SMTP_USER;
  const smtpPass = process.env.SMTP_PASS;

  if (smtpHost === 'localhost' || smtpHost === '127.0.0.1') {
    checks.push({
      name: 'SMTP Configuration',
      status: 'warn',
      message: 'Using local SMTP server',
      critical: false,
      fix: 'Configure production SMTP service (SES, SendGrid, etc.)'
    });
  } else if (smtpHost && smtpUser && smtpPass) {
    checks.push({
      name: 'SMTP Configuration',
      status: 'pass',
      message: 'SMTP configured',
      critical: false
    });
  } else {
    checks.push({
      name: 'SMTP Configuration',
      status: 'fail',
      message: 'SMTP not properly configured',
      critical: false,
      fix: 'Configure SMTP_HOST, SMTP_USER, and SMTP_PASS'
    });
  }

  // AWS SES configuration
  const sesFromEmail = process.env.AWS_SES_FROM_EMAIL;
  if (sesFromEmail) {
    checks.push({
      name: 'AWS SES',
      status: 'pass',
      message: 'AWS SES configured',
      critical: false
    });
  }

  return summarizeChecks('Email Configuration', checks);
}

async function validateMonitoringConfiguration(): Promise<ValidationResult> {
  const checks: ValidationCheck[] = [];

  // Logging level
  const logLevel = process.env.LOG_LEVEL;
  if (logLevel === 'debug' || logLevel === 'silly') {
    checks.push({
      name: 'Log Level',
      status: 'warn',
      message: `Log level set to ${logLevel} (may impact performance)`,
      critical: false,
      fix: 'Set LOG_LEVEL to info or warn for production'
    });
  } else {
    checks.push({
      name: 'Log Level',
      status: 'pass',
      message: `Log level set to ${logLevel || 'info'}`,
      critical: false
    });
  }

  // Sentry configuration
  const sentryDsn = process.env.SENTRY_DSN;
  if (sentryDsn && !sentryDsn.includes('your-')) {
    checks.push({
      name: 'Error Tracking',
      status: 'pass',
      message: 'Sentry configured for error tracking',
      critical: false
    });
  } else {
    checks.push({
      name: 'Error Tracking',
      status: 'warn',
      message: 'Error tracking not configured',
      critical: false,
      fix: 'Configure Sentry or similar error tracking service'
    });
  }

  return summarizeChecks('Monitoring Configuration', checks);
}

function summarizeChecks(category: string, checks: ValidationCheck[]): ValidationResult {
  const passed = checks.filter(c => c.status === 'pass').length;
  const failed = checks.filter(c => c.status === 'fail').length;
  const warnings = checks.filter(c => c.status === 'warn').length;

  let status: 'pass' | 'fail' | 'warn' = 'pass';
  if (failed > 0) {
    status = 'fail';
  } else if (warnings > 0) {
    status = 'warn';
  }

  return {
    category,
    checks,
    passed,
    failed,
    warnings,
    status
  };
}

function printValidationSummary(results: ValidationResult[]) {
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('🔍 DPNR Production Validation Summary');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

  let overallPassed = 0;
  let overallFailed = 0;
  let overallWarnings = 0;
  let criticalFailures = 0;

  results.forEach(result => {
    const statusEmoji = result.status === 'pass' ? '✅' : result.status === 'warn' ? '⚠️' : '❌';
    console.log(`\n${statusEmoji} ${result.category}: ${result.passed}✅ ${result.warnings}⚠️  ${result.failed}❌`);

    overallPassed += result.passed;
    overallFailed += result.failed;
    overallWarnings += result.warnings;

    // Show failed and warning checks
    result.checks.forEach(check => {
      if (check.status !== 'pass') {
        const emoji = check.status === 'warn' ? '⚠️' : '❌';
        console.log(`   ${emoji} ${check.name}: ${check.message}`);
        if (check.fix) {
          console.log(`      💡 Fix: ${check.fix}`);
        }
        if (check.critical && check.status === 'fail') {
          criticalFailures++;
        }
      }
    });
  });

  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('📊 Overall Results:');
  console.log(`   ✅ Passed: ${overallPassed}`);
  console.log(`   ⚠️  Warnings: ${overallWarnings}`);
  console.log(`   ❌ Failed: ${overallFailed}`);
  console.log(`   🚨 Critical Failures: ${criticalFailures}`);

  console.log('\n💡 Recommendations:');
  if (criticalFailures === 0 && overallFailed === 0) {
    console.log('   🎉 Production environment is ready for deployment!');
    if (overallWarnings > 0) {
      console.log('   📝 Address warnings for optimal production setup');
    }
  } else if (criticalFailures > 0) {
    console.log('   🚨 Critical issues must be resolved before production deployment');
    console.log('   🔧 Fix all failed critical checks above');
  } else {
    console.log('   ⚠️  Address failed checks before deployment');
  }

  console.log('\n📚 Next Steps:');
  if (criticalFailures === 0) {
    console.log('   • Run database deployment: npm run db:deploy:prod');
    console.log('   • Deploy application to production');
    console.log('   • Monitor deployment health');
  } else {
    console.log('   • Fix critical configuration issues');
    console.log('   • Re-run validation: npm run validate:prod');
    console.log('   • Review production deployment guide');
  }

  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
}

// CLI interface
async function main() {
  const args = process.argv.slice(2);
  const jsonOutput = args.includes('--json');
  const exitOnFailure = args.includes('--exit-on-failure');

  try {
    const results = await validateProductionEnvironment();

    if (jsonOutput) {
      console.log(JSON.stringify(results, null, 2));
    }

    const criticalFailures = results.reduce((acc, result) =>
      acc + result.checks.filter(c => c.critical && c.status === 'fail').length, 0);

    if (exitOnFailure && criticalFailures > 0) {
      process.exit(1);
    }

    process.exit(0);
  } catch (error) {
    console.error('❌ Validation failed:', error);
    process.exit(1);
  }
}

// Self-executing function
if (require.main === module) {
  main();
}

export { validateProductionEnvironment };