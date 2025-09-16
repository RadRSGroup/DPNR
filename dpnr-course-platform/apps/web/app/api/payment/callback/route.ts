import { NextRequest } from 'next/server';
import { TranzilaClient } from '../../../../lib/tranzila';
import prisma from '@dpnr/database/src/client';

export async function POST(request: NextRequest) {
  try {
    // Parse form data from Tranzila callback
    const formData = await request.formData();
    const responseData: Record<string, string> = {};

    // Convert FormData to object
    formData.forEach((value, key) => {
      responseData[key] = value.toString();
    });

    console.log('Tranzila callback received:', responseData);

    // Initialize Tranzila client
    const tranzila = new TranzilaClient();

    // Verify the transaction
    const verification = await tranzila.verifyTransaction(responseData);

    if (!verification.orderId) {
      console.error('No order ID in Tranzila response');
      return Response.json({ error: 'Invalid response: missing order ID' }, { status: 400 });
    }

    // Find the order in database
    const order = await prisma.order.findUnique({
      where: { id: verification.orderId },
      include: { user: true, items: true }
    });

    if (!order) {
      console.error('Order not found:', verification.orderId);
      return Response.json({ error: 'Order not found' }, { status: 404 });
    }

    // Update order based on payment verification
    if (verification.success) {
      // Payment successful
      await prisma.order.update({
        where: { id: order.id },
        data: {
          status: 'PAID',
          paymentId: verification.transactionId,
          paymentStatus: 'COMPLETED',
        }
      });

      console.log(`Payment successful for order ${order.id}, transaction ${verification.transactionId}`);

      // TODO: Send confirmation email to user
      // TODO: Process order fulfillment (enrollment, material access, etc.)

      // Redirect to success page
      return Response.redirect(new URL(`/payment/success?orderId=${order.id}`, request.url));

    } else {
      // Payment failed
      await prisma.order.update({
        where: { id: order.id },
        data: {
          status: 'CANCELLED',
          paymentStatus: 'FAILED',
        }
      });

      console.log(`Payment failed for order ${order.id}: ${verification.error}`);

      // Redirect to failure page with error message
      const errorMessage = encodeURIComponent(verification.error || 'Payment failed');
      return Response.redirect(new URL(`/payment/failure?orderId=${order.id}&error=${errorMessage}`, request.url));
    }

  } catch (error) {
    console.error('Error processing Tranzila callback:', error);
    return Response.json({
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

// Handle GET requests (for testing or direct access)
export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const orderId = url.searchParams.get('orderId');
  const transactionId = url.searchParams.get('transactionId');

  if (!orderId) {
    return Response.json({ error: 'Missing orderId parameter' }, { status: 400 });
  }

  try {
    // Find the order
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      select: { id: true, status: true, paymentStatus: true, paymentId: true, total: true }
    });

    if (!order) {
      return Response.json({ error: 'Order not found' }, { status: 404 });
    }

    // If we have a transaction ID, verify it with Tranzila
    if (transactionId) {
      const tranzila = new TranzilaClient();
      const verification = await tranzila.queryTransaction(transactionId);

      return Response.json({
        order,
        verification,
        message: 'Transaction verification completed'
      });
    }

    return Response.json({
      order,
      message: 'Order status retrieved'
    });

  } catch (error) {
    console.error('Error retrieving order status:', error);
    return Response.json({
      error: 'Failed to retrieve order status',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}