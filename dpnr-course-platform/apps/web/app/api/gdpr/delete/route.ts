import { z } from 'zod';
import { cookies } from 'next/headers';

const DeleteSchema = z.object({ confirm: z.literal(true) });

export async function POST(request: Request) {
  const cookieStore = cookies();
  const sessionCookie = cookieStore.get(process.env.IRON_SESSION_COOKIE_NAME || 'dpnr_session');
  if (!sessionCookie) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const json = await request.json().catch(() => null);
  const parsed = DeleteSchema.safeParse(json);
  if (!parsed.success) {
    return Response.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  // TODO: Implement deletion of user data across tables.
  return Response.json({ ok: true }, { status: 200 });
}

