import { z } from 'zod';
import { cookies } from 'next/headers';
import { getIronSession } from 'iron-session';
import { validateCsrf } from '../../../../lib/csrf';
import { TranzilaClient } from '../../../../lib/tranzila';
import prisma from '@dpnr/database/src/client';
import { sessionOptions, type AppSession } from '../../../../lib/session';

const ItemSchema = z.object({
  productId: z.string().min(1), // Use actual product ID from database
  quantity: z.number().int().positive(),
});

const CheckoutSchema = z.object({
  items: z.array(ItemSchema).min(1),
  customerName: z.string().optional(),
  customerEmail: z.string().email().optional(),
  customerPhone: z.string().optional(),
});

export async function POST(request: Request) {
  // Validate CSRF token
  if (!(await validateCsrf(request))) {
    return Response.json({ error: 'Invalid CSRF token' }, { status: 403 });
  }

  // Get user session
  const c = await cookies();
  const session = await getIronSession<AppSession>(c, sessionOptions);
  const userSession = session.user;

  if (!userSession?.id) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Parse and validate request
  const json = await request.json().catch(() => null);
  const parsed = CheckoutSchema.safeParse(json);
  if (!parsed.success) {
    return Response.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const { items, customerName, customerEmail, customerPhone } = parsed.data;

  try {
    // Get user details from database
    const user = await prisma.user.findUnique({
      where: { cognitoId: userSession.id },
      select: { id: true, firstName: true, lastName: true, email: true, phone: true }
    });

    if (!user) {
      return Response.json({ error: 'User not found' }, { status: 404 });
    }

    // Fetch products and validate they exist
    const productIds = items.map(item => item.productId);
    const products = await prisma.product.findMany({
      where: { id: { in: productIds } },
      select: { id: true, name: true, price: true, inventory: true }
    });

    if (products.length !== productIds.length) {
      return Response.json({ error: 'Some products not found' }, { status: 404 });
    }

    // Create product map for easy lookup
    const productMap = new Map(products.map(p => [p.id, p]));

    // Validate inventory and calculate total
    let total = 0;
    const orderItems = [];

    for (const item of items) {
      const product = productMap.get(item.productId);
      if (!product) {
        return Response.json({ error: `Product ${item.productId} not found` }, { status: 404 });
      }

      if (product.inventory < item.quantity) {
        return Response.json({
          error: `Insufficient inventory for ${product.name}. Available: ${product.inventory}, Requested: ${item.quantity}`
        }, { status: 400 });
      }

      const itemTotal = Number(product.price) * item.quantity;
      total += itemTotal;

      orderItems.push({
        productId: item.productId,
        quantity: item.quantity,
        price: product.price,
      });
    }

    // Create order in database
    const order = await prisma.order.create({
      data: {
        userId: user.id,
        total,
        status: 'PENDING',
        paymentProvider: 'tranzila',
        paymentStatus: 'PENDING',
        items: {
          create: orderItems
        }
      }
    });

    // Initialize Tranzila client
    const tranzila = new TranzilaClient();

    // Format amount for Tranzila (convert to agorot for ILS)
    const formattedAmount = TranzilaClient.formatAmount(total, 'ILS');

    // Create payment session
    const paymentSession = await tranzila.createPaymentSession({
      orderId: order.id,
      amount: formattedAmount,
      customerName: customerName || `${user.firstName} ${user.lastName}`.trim(),
      customerEmail: customerEmail || user.email,
      customerPhone: customerPhone || user.phone || undefined,
      description: `DPNR Course Platform - Order ${order.id}`,
    });

    // Return redirect URL for Tranzila payment page
    return Response.json({
      success: true,
      orderId: order.id,
      redirectUrl: paymentSession.redirectUrl,
      amount: total,
      currency: 'ILS',
    });

  } catch (error) {
    console.error('Checkout error:', error);
    return Response.json({
      error: 'Failed to create payment session',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
