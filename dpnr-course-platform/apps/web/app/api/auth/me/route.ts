import { cookies } from 'next/headers';
import { getIronSession } from 'iron-session';
import { sessionOptions, type AppSession } from '../../../../lib/session';

export async function GET() {
  const cookieStore = cookies();
  // @ts-ignore
  const session = (await getIronSession({ cookies: cookieStore }, sessionOptions)) as unknown as AppSession;
  return Response.json({ user: session.user ?? null }, { status: 200 });
}
