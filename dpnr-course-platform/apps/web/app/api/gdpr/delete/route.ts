import { z } from 'zod';
import { cookies } from 'next/headers';
import { getIronSession } from 'iron-session';
import prisma from '@dpnr/database/src/client';
import { sessionOptions, type AppSession } from '../../../../lib/session';
import { validateCsrf } from '../../../../lib/csrf';

const DeleteSchema = z.object({ confirm: z.literal(true) });

export async function POST(request: Request) {
  if (!(await validateCsrf(request))) {
    return Response.json({ error: 'Invalid CSRF token' }, { status: 403 });
  }
  const c = await cookies();
  const session = await getIronSession<AppSession>(c, sessionOptions);
  const userSession = session.user;
  if (!userSession?.id) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const json = await request.json().catch(() => null);
  const parsed = DeleteSchema.safeParse(json);
  if (!parsed.success) {
    return Response.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  // Best-effort deletion of user-owned data across tables
  try {
    const user = await prisma.user.findUnique({
      where: { cognitoId: userSession.id },
      select: { id: true },
    });
    if (!user) {
      return Response.json({ ok: true, note: 'No user record' }, { status: 200 });
    }

    const userId = user.id;
    await prisma.$transaction([
      // Order items linked via orders
      prisma.orderItem.deleteMany({ where: { order: { userId } } }),
      prisma.order.deleteMany({ where: { userId } }),
      prisma.enrollment.deleteMany({ where: { userId } }),
      prisma.feedback.deleteMany({ where: { userId } }),
      prisma.user.delete({ where: { id: userId } }),
    ]);
    return Response.json({ ok: true }, { status: 200 });
  } catch (err) {
    return Response.json({ error: 'Deletion failed' }, { status: 500 });
  }
}
