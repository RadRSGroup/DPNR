import { cookies } from 'next/headers';
import { getIronSession } from 'iron-session';
import { sessionOptions, type AppSession } from '../../../../lib/session';

export async function GET() {
  const session = await getIronSession<AppSession>(cookies(), sessionOptions);
  return Response.json({ user: session.user ?? null }, { status: 200 });
}
