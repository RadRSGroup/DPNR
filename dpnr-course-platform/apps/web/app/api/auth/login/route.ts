import { z } from 'zod';
import { cookies } from 'next/headers';
import { getIronSession } from 'iron-session';
import { sessionOptions, type AppSession } from '../../../../lib/session';

const LoginSchema = z.object({
  // Expect ID token from Amplify client after signIn
  idToken: z.string().min(10, 'Invalid token'),
  email: z.string().email(),
  cognitoId: z.string().min(3),
});

export async function POST(request: Request) {
  const json = await request.json().catch(() => null);
  const parsed = LoginSchema.safeParse(json);
  if (!parsed.success) {
    return Response.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const { idToken, email, cognitoId } = parsed.data;

  // TODO: Verify `idToken` server-side using aws-jwt-verify against Cognito JWKs.
  // For now, guard on presence only (placeholder, not production secure).
  if (!idToken) {
    return Response.json({ error: 'Missing token' }, { status: 401 });
  }

  // Create session
  const cookieStore = cookies();
  // @ts-ignore - types mismatch in App Router; works at runtime
  const session = (await getIronSession({ cookies: cookieStore }, sessionOptions)) as unknown as AppSession;
  session.user = { id: cognitoId, email };
  // @ts-ignore
  await session.save();

  return Response.json({ ok: true }, { status: 200 });
}
