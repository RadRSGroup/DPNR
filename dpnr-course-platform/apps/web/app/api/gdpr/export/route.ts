import { cookies } from 'next/headers';
import { getIronSession } from 'iron-session';
import prisma from '@dpnr/database/src/client';
import { sessionOptions, type AppSession } from '../../../../lib/session';

export async function GET() {
  const c = await cookies();
  const session = await getIronSession<AppSession>(c, sessionOptions);
  const userSession = session.user;
  if (!userSession?.id) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const dbUser = await prisma.user.findUnique({
    where: { cognitoId: userSession.id },
    include: {
      enrollments: { include: { course: true } },
      orders: { include: { items: { include: { product: true } } } },
      feedbacks: true,
    },
  });

  if (!dbUser) {
    return Response.json({ error: 'User not found' }, { status: 404 });
  }

  const exportPayload = {
    user: {
      id: dbUser.id,
      cognitoId: dbUser.cognitoId,
      email: dbUser.email,
      firstName: dbUser.firstName,
      lastName: dbUser.lastName,
      phone: dbUser.phone ?? null,
      createdAt: dbUser.createdAt,
      updatedAt: dbUser.updatedAt,
    },
    enrollments: dbUser.enrollments.map((e) => ({
      id: e.id,
      status: e.status,
      createdAt: e.createdAt,
      course: {
        id: e.course.id,
        title: e.course.title,
        startDate: e.course.startDate,
        endDate: e.course.endDate,
      },
    })),
    orders: dbUser.orders.map((o) => ({
      id: o.id,
      status: o.status,
      total: o.total,
      createdAt: o.createdAt,
      items: o.items.map((it) => ({
        id: it.id,
        quantity: it.quantity,
        price: it.price,
        product: {
          id: it.product.id,
          sku: it.product.sku,
          name: it.product.name,
          category: it.product.category,
        },
      })),
    })),
    feedbacks: dbUser.feedbacks.map((f) => ({
      id: f.id,
      type: f.type,
      subject: f.subject,
      message: f.message,
      status: f.status,
      createdAt: f.createdAt,
    })),
  };

  const body = JSON.stringify(exportPayload, null, 2);
  return new Response(body, {
    status: 200,
    headers: {
      'Content-Type': 'application/json',
      'Content-Disposition': 'attachment; filename="gdpr-export.json"',
    },
  });
}
