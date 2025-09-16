import { cookies } from 'next/headers';
import { getIronSession } from 'iron-session';
import { sessionOptions, type AppSession } from '../../../../lib/session';

export async function POST() {
  const session = await getIronSession<AppSession>(cookies(), sessionOptions);
  await session.destroy();
  return Response.json({ ok: true }, { status: 200 });
}
