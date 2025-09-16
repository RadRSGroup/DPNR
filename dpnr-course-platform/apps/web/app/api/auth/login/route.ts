import { z } from 'zod';
import { cookies } from 'next/headers';
import { getIronSession } from 'iron-session';
import { CognitoJwtVerifier } from 'aws-jwt-verify';
import prisma from '@dpnr/database/src/client';
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

  // Verify Cognito ID token server-side
  const verifier = CognitoJwtVerifier.create({
    userPoolId: process.env.NEXT_PUBLIC_USER_POOL_ID!,
    tokenUse: 'id',
    clientId: process.env.NEXT_PUBLIC_CLIENT_ID!,
  });
  try {
    const payload = await verifier.verify(idToken);
    // Cross-check sub only; email casing may differ
    if (payload.sub && payload.sub !== cognitoId) {
      return Response.json({ error: 'User mismatch' }, { status: 401 });
    }
    // Ensure a corresponding user exists in DB (first-login sync)
    const firstName = (payload as any)?.given_name || (payload as any)?.name?.split(' ')?.[0] || 'User';
    const lastName = (payload as any)?.family_name || (payload as any)?.name?.split(' ')?.slice(1).join(' ') || '';
    await prisma.user.upsert({
      where: { email },
      update: { cognitoId, firstName, lastName },
      create: { cognitoId, email, firstName, lastName },
    });
  } catch (err) {
    return Response.json({ error: 'Invalid token' }, { status: 401 });
  }

  // Create session using App Router cookies()
  const session = await getIronSession<AppSession>(cookies(), sessionOptions);
  session.user = { id: cognitoId, email };
  await session.save();

  return Response.json({ ok: true }, { status: 200 });
}
