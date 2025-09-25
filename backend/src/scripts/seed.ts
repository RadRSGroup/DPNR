import { PrismaClient, Language, UserRole, CohortStatus, PaymentPlan, EnrollmentStatus } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting database seed...');

  try {
    // Create admin user
    const adminUser = await prisma.user.upsert({
      where: { email: 'admin@dpnr.co.il' },
      update: {},
      create: {
        cognitoId: 'admin-cognito-id',
        email: 'admin@dpnr.co.il',
        firstName: 'DPNR',
        lastName: 'Administrator',
        phone: '+972-50-123-4567',
        preferredLanguage: Language.HE,
        role: UserRole.ADMIN,
      },
    });
    console.log('✅ Created admin user:', adminUser.email);

    // Create instructor user
    const instructorUser = await prisma.user.upsert({
      where: { email: 'instructor@dpnr.co.il' },
      update: {},
      create: {
        cognitoId: 'instructor-cognito-id',
        email: 'instructor@dpnr.co.il',
        firstName: 'Sarah',
        lastName: 'Cohen',
        phone: '+972-50-987-6543',
        preferredLanguage: Language.HE,
        role: UserRole.INSTRUCTOR,
      },
    });
    console.log('✅ Created instructor user:', instructorUser.email);

    // Create current cohort (starting in 2 weeks)
    const startDate = new Date();
    startDate.setDate(startDate.getDate() + 14); // Start in 2 weeks
    const endDate = new Date(startDate);
    endDate.setMonth(endDate.getMonth() + 6); // 6-month course

    const currentCohort = await prisma.cohort.upsert({
      where: { name: 'DPNR Program - Spring 2025' },
      update: {},
      create: {
        name: 'DPNR Program - Spring 2025',
        startDate,
        endDate,
        maxCapacity: 20,
        currentEnrollment: 3,
        status: CohortStatus.OPEN_ENROLLMENT,
        location: 'Mazkeret Batya',
        schedule: 'Sunday evenings, 19:00-21:00',
      },
    });
    console.log('✅ Created current cohort:', currentCohort.name);

    // Create upcoming cohort
    const futureStartDate = new Date(endDate);
    futureStartDate.setMonth(futureStartDate.getMonth() + 2); // Start 2 months after current ends
    const futureEndDate = new Date(futureStartDate);
    futureEndDate.setMonth(futureEndDate.getMonth() + 6);

    const upcomingCohort = await prisma.cohort.upsert({
      where: { name: 'DPNR Program - Fall 2025' },
      update: {},
      create: {
        name: 'DPNR Program - Fall 2025',
        startDate: futureStartDate,
        endDate: futureEndDate,
        maxCapacity: 20,
        currentEnrollment: 0,
        status: CohortStatus.UPCOMING,
        location: 'Mazkeret Batya',
        schedule: 'Sunday evenings, 19:00-21:00',
      },
    });
    console.log('✅ Created upcoming cohort:', upcomingCohort.name);

    // Create sample student users
    const students = [
      {
        cognitoId: 'student1-cognito-id',
        email: 'student1@example.com',
        firstName: 'David',
        lastName: 'Levi',
        phone: '+972-54-111-2222',
        preferredLanguage: Language.HE,
      },
      {
        cognitoId: 'student2-cognito-id',
        email: 'student2@example.com',
        firstName: 'Rachel',
        lastName: 'Cohen',
        phone: '+972-52-333-4444',
        preferredLanguage: Language.HE,
      },
      {
        cognitoId: 'student3-cognito-id',
        email: 'student3@example.com',
        firstName: 'Michael',
        lastName: 'Brown',
        phone: '+972-50-555-6666',
        preferredLanguage: Language.EN,
      },
    ];

    const createdStudents = [];
    for (const student of students) {
      const createdStudent = await prisma.user.upsert({
        where: { email: student.email },
        update: {},
        create: {
          ...student,
          role: UserRole.STUDENT,
        },
      });
      createdStudents.push(createdStudent);
      console.log('✅ Created student user:', createdStudent.email);
    }

    // Create sample enrollments
    const sampleQuestionnaire = {
      motivation: 'I want to improve my personal development skills',
      experience: 'Some previous experience with self-improvement courses',
      goals: 'Better self-awareness and goal achievement',
      timeCommitment: 'I can dedicate 4-5 hours per week',
      specificInterests: ['time management', 'goal setting', 'mindfulness'],
      communicationPreference: 'email',
      additionalComments: 'Looking forward to starting this journey',
    };

    for (let i = 0; i < 3; i++) {
      const paymentPlans = [PaymentPlan.FULL, PaymentPlan.FIVE_INSTALLMENTS, PaymentPlan.TWELVE_INSTALLMENTS];
      const amounts = [6400, 6800, 6960]; // Full, 5 installments, 12 installments

      const enrollment = await prisma.enrollment.upsert({
        where: {
          userId_cohortId: {
            userId: createdStudents[i].id,
            cohortId: currentCohort.id,
          },
        },
        update: {},
        create: {
          userId: createdStudents[i].id,
          cohortId: currentCohort.id,
          status: i === 0 ? EnrollmentStatus.ACTIVE : EnrollmentStatus.PENDING_PAYMENT,
          paymentPlan: paymentPlans[i],
          totalAmount: amounts[i],
          paidAmount: i === 0 ? amounts[i] : 0,
          questionnaire: sampleQuestionnaire,
        },
      });
      console.log(`✅ Created enrollment for ${createdStudents[i].email}`);

      // Create payment transaction for the first student (completed payment)
      if (i === 0) {
        await prisma.paymentTransaction.upsert({
          where: { tranzillaReference: `TRX-SEED-${Date.now()}-${i}` },
          update: {},
          create: {
            enrollmentId: enrollment.id,
            tranzillaReference: `TRX-SEED-${Date.now()}-${i}`,
            amount: amounts[i],
            installmentNumber: 1,
            status: 'SUCCESS',
            paymentMethod: 'Credit Card',
          },
        });
        console.log(`✅ Created payment transaction for ${createdStudents[i].email}`);
      }
    }

    // Create sample consultation requests
    const consultationRequests = [
      {
        firstName: 'Anna',
        lastName: 'Goldberg',
        email: 'anna.goldberg@example.com',
        phone: '+972-50-777-8888',
        preferredLanguage: Language.HE,
        preferredTimeSlot: 'Sunday morning',
        message: 'I would like to learn more about the program structure and requirements.',
        status: 'NEW' as const,
      },
      {
        firstName: 'John',
        lastName: 'Smith',
        email: 'john.smith@example.com',
        phone: '+972-52-999-0000',
        preferredLanguage: Language.EN,
        preferredTimeSlot: 'Weekday evening',
        message: 'Interested in understanding how this program can help with career development.',
        status: 'CONTACTED' as const,
      },
    ];

    for (const request of consultationRequests) {
      const consultation = await prisma.consultationRequest.upsert({
        where: { email: request.email },
        update: {},
        create: request,
      });
      console.log('✅ Created consultation request for:', consultation.email);
    }

    // Create privacy consents for enrolled students
    for (const student of createdStudents) {
      await prisma.privacyConsent.upsert({
        where: {
          userId_consentType: {
            userId: student.id,
            consentType: 'PRIVACY_POLICY',
          },
        },
        update: {},
        create: {
          userId: student.id,
          consentType: 'PRIVACY_POLICY',
          granted: true,
          ipAddress: '127.0.0.1',
          userAgent: 'Seed Script',
          version: '1.0',
        },
      });

      await prisma.privacyConsent.upsert({
        where: {
          userId_consentType: {
            userId: student.id,
            consentType: 'TERMS_OF_SERVICE',
          },
        },
        update: {},
        create: {
          userId: student.id,
          consentType: 'TERMS_OF_SERVICE',
          granted: true,
          ipAddress: '127.0.0.1',
          userAgent: 'Seed Script',
          version: '1.0',
        },
      });
      console.log('✅ Created privacy consents for:', student.email);
    }

    console.log('\n🎉 Database seeding completed successfully!');
    console.log('\n📊 Seeded data summary:');
    console.log(`   • Users: ${createdStudents.length + 2} (${createdStudents.length} students, 1 admin, 1 instructor)`);
    console.log(`   • Cohorts: 2 (1 open for enrollment, 1 upcoming)`);
    console.log(`   • Enrollments: ${createdStudents.length}`);
    console.log(`   • Consultation requests: ${consultationRequests.length}`);
    console.log(`   • Payment transactions: 1`);
    console.log(`   • Privacy consents: ${createdStudents.length * 2}`);

  } catch (error) {
    console.error('❌ Error during seeding:', error);
    throw error;
  }
}

main()
  .catch((e) => {
    console.error('❌ Seed script failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    console.log('🔌 Database connection closed.');
  });