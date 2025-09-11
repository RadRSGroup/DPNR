import { cookies } from 'next/headers';
import { getIronSession } from 'iron-session';
import { sessionOptions, type AppSession } from '../../../../lib/session';

export async function POST() {
  const cookieStore = cookies();
  // @ts-ignore
  const session = (await getIronSession({ cookies: cookieStore }, sessionOptions)) as unknown as AppSession;
  // @ts-ignore
  await session.destroy();
  return Response.json({ ok: true }, { status: 200 });
}
