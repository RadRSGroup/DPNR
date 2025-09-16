import { cookies } from 'next/headers';
import { getIronSession } from 'iron-session';
import prisma from '@dpnr/database/src/client';
import { sessionOptions, type AppSession } from '../../../lib/session';

export async function GET() {
  const c = await cookies();
  const session = await getIronSession<AppSession>(c, sessionOptions);
  const suser = session.user;
  if (!suser?.id) return Response.json({ user: null }, { status: 200 });

  const user = await prisma.user.findUnique({
    where: { cognitoId: suser.id },
    select: { id: true, email: true, firstName: true, lastName: true, createdAt: true },
  });
  return Response.json({ user }, { status: 200 });
}
