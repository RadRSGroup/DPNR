import { Suspense } from 'react';
import Link from 'next/link';

interface PageProps {
  searchParams: { orderId?: string };
}

function SuccessContent({ orderId }: { orderId: string | undefined }) {
  return (
    <main className="p-8 max-w-2xl mx-auto text-center">
      <div className="bg-green-50 border border-green-200 rounded-lg p-8">
        <div className="text-green-600 text-6xl mb-4">✓</div>
        <h1 className="text-2xl font-semibold text-green-800 mb-4">
          Payment Successful!
        </h1>
        <p className="text-gray-700 mb-6">
          Your payment has been processed successfully. You will receive a confirmation email shortly.
        </p>

        {orderId && (
          <div className="bg-white border border-green-200 rounded p-4 mb-6">
            <p className="text-sm text-gray-600">Order ID:</p>
            <p className="font-mono text-sm font-medium">{orderId}</p>
          </div>
        )}

        <div className="space-y-3">
          <Link
            href="/dashboard"
            className="block w-full bg-violet-600 text-white px-6 py-3 rounded-lg hover:bg-violet-700 transition-colors"
          >
            Go to Dashboard
          </Link>
          <Link
            href="/library"
            className="block w-full border border-violet-600 text-violet-600 px-6 py-3 rounded-lg hover:bg-violet-50 transition-colors"
          >
            View Course Materials
          </Link>
          <Link
            href="/"
            className="block w-full text-gray-600 px-6 py-3 rounded-lg hover:bg-gray-50 transition-colors"
          >
            Return to Home
          </Link>
        </div>
      </div>
    </main>
  );
}

export default function PaymentSuccessPage({ searchParams }: PageProps) {
  return (
    <Suspense fallback={<div className="p-8 text-center">Loading...</div>}>
      <SuccessContent orderId={searchParams.orderId} />
    </Suspense>
  );
}