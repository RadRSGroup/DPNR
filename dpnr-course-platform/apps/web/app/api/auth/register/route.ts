import { z } from 'zod';
import prisma from '@dpnr/database/src/client';

const RegisterSchema = z.object({
  cognitoId: z.string().min(3),
  email: z.string().email(),
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  phone: z.string().min(7).optional(),
});

export async function POST(request: Request) {
  const json = await request.json().catch(() => null);
  const parsed = RegisterSchema.safeParse(json);
  if (!parsed.success) {
    return Response.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  const { cognitoId, email, firstName, lastName, phone } = parsed.data;

  try {
    const user = await prisma.user.upsert({
      where: { email },
      update: { cognitoId, firstName, lastName, phone },
      create: { cognitoId, email, firstName, lastName, phone },
    });
    return Response.json({ ok: true, user: { id: user.id, email: user.email } }, { status: 201 });
  } catch (err) {
    return Response.json({ error: 'Failed to create user' }, { status: 500 });
  }
}
