import { z } from 'zod';

const ItemSchema = z.object({
  name: z.string().min(1),
  price: z.number().positive(),
  quantity: z.number().int().positive(),
});

const CheckoutSchema = z.object({
  items: z.array(ItemSchema).min(1),
  userId: z.string().min(3),
});

export async function POST(request: Request) {
  const json = await request.json().catch(() => null);
  const parsed = CheckoutSchema.safeParse(json);
  if (!parsed.success) {
    return Response.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  const { items, userId } = parsed.data;

  // TODO: Replace with real Stripe session creation using secret key.
  const lineItems = items.map((i) => ({
    name: i.name,
    unit_amount: Math.round(i.price * 100),
    quantity: i.quantity,
  }));
  return Response.json({ sessionId: 'demo_session', userId, lineItems }, { status: 200 });
}
