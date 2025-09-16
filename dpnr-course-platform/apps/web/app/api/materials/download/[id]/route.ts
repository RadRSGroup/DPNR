import { cookies } from 'next/headers';
import { getIronSession } from 'iron-session';
import prisma from '@dpnr/database/src/client';
import { sessionOptions, type AppSession } from '../../../../../lib/session';

type Params = { params: { id: string } };

export async function GET(_: Request, { params }: Params) {
  const c = await cookies();
  const session = await getIronSession<AppSession>(c, sessionOptions);
  const userSession = session.user;
  if (!userSession?.id) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const material = await prisma.material.findUnique({
    where: { id: params.id },
    select: { id: true, title: true, isPublic: true, courseId: true, url: true },
  });
  if (!material) {
    return Response.json({ error: 'Not found' }, { status: 404 });
  }

  if (!material.isPublic) {
    const enrollment = await prisma.enrollment.findFirst({
      where: {
        courseId: material.courseId,
        user: { cognitoId: userSession.id },
        status: 'CONFIRMED',
      },
      select: { id: true },
    });
    if (!enrollment) {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }
  }

  // Stub: In production, generate S3 presigned URL constrained to key prefix and TTL
  const fallbackUrl = `http://localhost:7070/signed-url?id=${material.id}`;
  return Response.json({ id: material.id, title: material.title, url: material.url || fallbackUrl }, { status: 200 });
}
