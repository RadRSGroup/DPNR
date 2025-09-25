import { PrismaClient } from '@prisma/client';
import * as dotenv from 'dotenv';

dotenv.config();

const prisma = new PrismaClient();

interface HealthCheckResult {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: string;
  checks: {
    database: CheckResult;
    tables: CheckResult;
    data: CheckResult;
    performance: CheckResult;
  };
  summary: {
    totalChecks: number;
    passed: number;
    failed: number;
    warnings: number;
  };
}

interface CheckResult {
  status: 'pass' | 'fail' | 'warn';
  message: string;
  duration?: number;
  details?: any;
}

async function performHealthCheck(): Promise<HealthCheckResult> {
  console.log('🏥 Starting DPNR Database Health Check...\n');

  const startTime = Date.now();
  const checks = {
    database: await checkDatabaseConnection(),
    tables: await checkTableIntegrity(),
    data: await checkDataConsistency(),
    performance: await checkPerformance()
  };

  const summary = {
    totalChecks: 4,
    passed: Object.values(checks).filter(c => c.status === 'pass').length,
    failed: Object.values(checks).filter(c => c.status === 'fail').length,
    warnings: Object.values(checks).filter(c => c.status === 'warn').length
  };

  let overallStatus: 'healthy' | 'degraded' | 'unhealthy' = 'healthy';
  if (summary.failed > 0) {
    overallStatus = 'unhealthy';
  } else if (summary.warnings > 0) {
    overallStatus = 'degraded';
  }

  const result: HealthCheckResult = {
    status: overallStatus,
    timestamp: new Date().toISOString(),
    checks,
    summary
  };

  // Print results
  printHealthCheckResults(result);

  return result;
}

async function checkDatabaseConnection(): Promise<CheckResult> {
  const startTime = Date.now();

  try {
    await prisma.$connect();

    // Test basic query
    const result = await prisma.$queryRaw`SELECT version(), current_database(), current_user` as any[];
    const duration = Date.now() - startTime;

    return {
      status: 'pass',
      message: 'Database connection successful',
      duration,
      details: {
        version: result[0]?.version?.split(' ')[1] || 'Unknown',
        database: result[0]?.current_database,
        user: result[0]?.current_user
      }
    };
  } catch (error) {
    return {
      status: 'fail',
      message: `Database connection failed: ${error}`,
      duration: Date.now() - startTime
    };
  }
}

async function checkTableIntegrity(): Promise<CheckResult> {
  const startTime = Date.now();

  try {
    const expectedTables = [
      'users',
      'cohorts',
      'enrollments',
      'consultation_requests',
      'payment_transactions',
      'privacy_consents'
    ];

    const tables = await prisma.$queryRaw`
      SELECT tablename FROM pg_tables
      WHERE schemaname = 'public'
      AND tablename NOT LIKE 'pg_%'
      AND tablename != 'information_schema'
      AND tablename != '_prisma_migrations'
    ` as any[];

    const existingTableNames = tables.map(t => t.tablename);
    const missingTables = expectedTables.filter(table => !existingTableNames.includes(table));
    const extraTables = existingTableNames.filter(table => !expectedTables.includes(table));

    const duration = Date.now() - startTime;

    if (missingTables.length > 0) {
      return {
        status: 'fail',
        message: `Missing required tables: ${missingTables.join(', ')}`,
        duration,
        details: { missing: missingTables, existing: existingTableNames }
      };
    }

    if (extraTables.length > 0) {
      return {
        status: 'warn',
        message: `Found unexpected tables: ${extraTables.join(', ')}`,
        duration,
        details: { extra: extraTables, expected: expectedTables }
      };
    }

    return {
      status: 'pass',
      message: `All ${expectedTables.length} required tables exist`,
      duration,
      details: { tables: existingTableNames }
    };
  } catch (error) {
    return {
      status: 'fail',
      message: `Table integrity check failed: ${error}`,
      duration: Date.now() - startTime
    };
  }
}

async function checkDataConsistency(): Promise<CheckResult> {
  const startTime = Date.now();

  try {
    const checks = [];

    // Check for orphaned enrollments
    const orphanedEnrollments = await prisma.$queryRaw`
      SELECT COUNT(*) as count FROM enrollments e
      LEFT JOIN users u ON e."userId" = u.id
      LEFT JOIN cohorts c ON e."cohortId" = c.id
      WHERE u.id IS NULL OR c.id IS NULL
    ` as any[];

    if (Number(orphanedEnrollments[0]?.count) > 0) {
      checks.push(`${orphanedEnrollments[0].count} orphaned enrollments`);
    }

    // Check for inconsistent enrollment counts
    const cohortConsistency = await prisma.$queryRaw`
      SELECT c.id, c.name, c."currentEnrollment", COUNT(e.id) as actual_count
      FROM cohorts c
      LEFT JOIN enrollments e ON c.id = e."cohortId" AND e.status IN ('ACTIVE', 'PENDING_PAYMENT')
      GROUP BY c.id, c.name, c."currentEnrollment"
      HAVING c."currentEnrollment" != COUNT(e.id)
    ` as any[];

    if (cohortConsistency.length > 0) {
      checks.push(`${cohortConsistency.length} cohorts with inconsistent enrollment counts`);
    }

    // Check for payment inconsistencies
    const paymentConsistency = await prisma.$queryRaw`
      SELECT e.id, e."totalAmount", e."paidAmount", SUM(pt.amount) as total_paid
      FROM enrollments e
      LEFT JOIN payment_transactions pt ON e.id = pt."enrollmentId" AND pt.status = 'SUCCESS'
      GROUP BY e.id, e."totalAmount", e."paidAmount"
      HAVING e."paidAmount" != COALESCE(SUM(pt.amount), 0)
    ` as any[];

    if (paymentConsistency.length > 0) {
      checks.push(`${paymentConsistency.length} enrollments with payment inconsistencies`);
    }

    const duration = Date.now() - startTime;

    if (checks.length > 0) {
      return {
        status: 'warn',
        message: `Data consistency issues found: ${checks.join(', ')}`,
        duration,
        details: { issues: checks }
      };
    }

    return {
      status: 'pass',
      message: 'Data consistency checks passed',
      duration
    };
  } catch (error) {
    return {
      status: 'fail',
      message: `Data consistency check failed: ${error}`,
      duration: Date.now() - startTime
    };
  }
}

async function checkPerformance(): Promise<CheckResult> {
  const startTime = Date.now();

  try {
    // Test query performance
    const testQueries = [];

    // Query 1: User lookup
    const userQueryStart = Date.now();
    await prisma.user.findFirst();
    const userQueryTime = Date.now() - userQueryStart;
    testQueries.push({ name: 'user_lookup', duration: userQueryTime });

    // Query 2: Cohort with enrollments
    const cohortQueryStart = Date.now();
    await prisma.cohort.findFirst({
      include: { enrollments: true }
    });
    const cohortQueryTime = Date.now() - cohortQueryStart;
    testQueries.push({ name: 'cohort_with_enrollments', duration: cohortQueryTime });

    // Query 3: Complex enrollment query
    const enrollmentQueryStart = Date.now();
    await prisma.enrollment.findMany({
      where: { status: 'ACTIVE' },
      include: {
        user: true,
        cohort: true,
        paymentTransactions: true
      },
      take: 10
    });
    const enrollmentQueryTime = Date.now() - enrollmentQueryStart;
    testQueries.push({ name: 'complex_enrollment_query', duration: enrollmentQueryTime });

    const totalDuration = Date.now() - startTime;
    const avgQueryTime = testQueries.reduce((sum, q) => sum + q.duration, 0) / testQueries.length;

    // Performance thresholds
    const slowQueryThreshold = 1000; // 1 second
    const avgQueryThreshold = 500;   // 500ms

    const slowQueries = testQueries.filter(q => q.duration > slowQueryThreshold);

    if (slowQueries.length > 0 || avgQueryTime > avgQueryThreshold) {
      return {
        status: 'warn',
        message: `Performance concerns: ${slowQueries.length} slow queries, avg: ${avgQueryTime.toFixed(2)}ms`,
        duration: totalDuration,
        details: {
          avgQueryTime: Math.round(avgQueryTime),
          slowQueries: slowQueries.map(q => `${q.name}: ${q.duration}ms`),
          allQueries: testQueries
        }
      };
    }

    return {
      status: 'pass',
      message: `Performance good: avg query time ${avgQueryTime.toFixed(2)}ms`,
      duration: totalDuration,
      details: {
        avgQueryTime: Math.round(avgQueryTime),
        testQueries
      }
    };
  } catch (error) {
    return {
      status: 'fail',
      message: `Performance check failed: ${error}`,
      duration: Date.now() - startTime
    };
  }
}

function printHealthCheckResults(result: HealthCheckResult) {
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`🏥 DPNR Database Health Check Report`);
  console.log(`📅 Timestamp: ${result.timestamp}`);
  console.log(`🎯 Overall Status: ${getStatusEmoji(result.status)} ${result.status.toUpperCase()}`);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

  // Summary
  console.log('\n📊 Summary:');
  console.log(`   Total Checks: ${result.summary.totalChecks}`);
  console.log(`   ✅ Passed: ${result.summary.passed}`);
  console.log(`   ⚠️  Warnings: ${result.summary.warnings}`);
  console.log(`   ❌ Failed: ${result.summary.failed}`);

  // Detailed results
  console.log('\n🔍 Detailed Results:');
  Object.entries(result.checks).forEach(([checkName, checkResult]) => {
    const emoji = getStatusEmoji(checkResult.status);
    const duration = checkResult.duration ? ` (${checkResult.duration}ms)` : '';
    console.log(`\n   ${emoji} ${checkName.toUpperCase()}${duration}`);
    console.log(`      ${checkResult.message}`);

    if (checkResult.details) {
      const details = JSON.stringify(checkResult.details, null, 8);
      console.log(`      Details: ${details}`);
    }
  });

  // Recommendations
  console.log('\n💡 Recommendations:');
  if (result.status === 'healthy') {
    console.log('   🎉 Database is healthy! Continue monitoring regularly.');
  } else if (result.status === 'degraded') {
    console.log('   ⚠️  Address warnings to prevent future issues.');
    console.log('   📈 Consider performance optimization if queries are slow.');
    console.log('   🔄 Run data consistency fixes if needed.');
  } else {
    console.log('   🚨 Critical issues detected! Immediate attention required.');
    console.log('   🔧 Check database connectivity and configuration.');
    console.log('   📞 Contact database administrator if issues persist.');
  }

  console.log('\n📋 Next Steps:');
  console.log('   • Schedule regular health checks (recommended: daily)');
  console.log('   • Monitor query performance trends');
  console.log('   • Review backup and recovery procedures');
  console.log('   • Update monitoring alerts based on results');

  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
}

function getStatusEmoji(status: string): string {
  switch (status) {
    case 'pass':
    case 'healthy': return '✅';
    case 'warn':
    case 'degraded': return '⚠️';
    case 'fail':
    case 'unhealthy': return '❌';
    default: return '❓';
  }
}

// CLI interface
async function main() {
  const args = process.argv.slice(2);
  const jsonOutput = args.includes('--json');
  const exitOnFailure = args.includes('--exit-on-failure');

  try {
    const result = await performHealthCheck();

    if (jsonOutput) {
      console.log(JSON.stringify(result, null, 2));
    }

    if (exitOnFailure && result.status === 'unhealthy') {
      process.exit(1);
    } else if (exitOnFailure && result.status === 'degraded') {
      process.exit(2);
    }

    process.exit(0);
  } catch (error) {
    console.error('❌ Health check failed:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// Self-executing function
if (require.main === module) {
  main();
}

export { performHealthCheck, HealthCheckResult };