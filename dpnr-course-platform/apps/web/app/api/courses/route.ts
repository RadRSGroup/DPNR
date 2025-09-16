import prisma from '@dpnr/database/src/client';

export async function GET() {
  try {
    const courses = await prisma.course.findMany({
      orderBy: { startDate: 'asc' },
      select: {
        id: true,
        title: true,
        description: true,
        price: true,
        startDate: true,
        endDate: true,
        capacity: true,
      },
    });
    return Response.json({ courses }, { status: 200 });
  } catch {
    // Fallback sample data if DB not reachable
    const now = Date.now();
    const day = 86400000;
    const courses = [
      {
        id: 'c_demo_1',
        title: 'Intro to DPNR',
        description: 'Foundations and hands-on exercises.',
        price: 100,
        startDate: new Date(now + day * 7),
        endDate: new Date(now + day * 8),
        capacity: 20,
      },
    ];
    return Response.json({ courses }, { status: 200 });
  }
}
