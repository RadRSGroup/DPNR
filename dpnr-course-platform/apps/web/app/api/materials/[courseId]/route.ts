import { cookies } from 'next/headers';
import { getIronSession } from 'iron-session';
import prisma from '@dpnr/database/src/client';
import { sessionOptions, type AppSession } from '../../../../lib/session';

export async function GET(_: Request, { params }: { params: { courseId: string } }) {
  const courseId = params.courseId;
  const c = await cookies();
  const session = await getIronSession<AppSession>(c, sessionOptions);
  const userSession = session.user;

  const isEnrolled = userSession?.id
    ? (await prisma.enrollment.findFirst({
        where: { courseId, user: { cognitoId: userSession.id }, status: 'CONFIRMED' },
        select: { id: true },
      })) != null
    : false;

  const materials = await prisma.material.findMany({
    where: {
      courseId,
      OR: [
        { isPublic: true },
        ...(isEnrolled ? [{ isPublic: false }] as const : []),
      ],
    },
    orderBy: { title: 'asc' },
    select: { id: true, title: true, type: true, isPublic: true },
  });

  return Response.json({ courseId, materials, enrolled: isEnrolled }, { status: 200 });
}
