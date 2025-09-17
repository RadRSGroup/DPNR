import Link from 'next/link';

function FailureContent({ orderId, error }: { orderId: string | undefined; error: string | undefined }) {
  const decodedError = error ? decodeURIComponent(error) : 'Payment was not completed';

  return (
    <main className="p-8 max-w-2xl mx-auto text-center">
      <div className="bg-red-50 border border-red-200 rounded-lg p-8">
        <div className="text-red-600 text-6xl mb-4">✗</div>
        <h1 className="text-2xl font-semibold text-red-800 mb-4">
          Payment Failed
        </h1>
        <p className="text-gray-700 mb-6">
          Unfortunately, your payment could not be processed. Please try again or contact support if the problem persists.
        </p>

        {error && (
          <div className="bg-white border border-red-200 rounded p-4 mb-6">
            <p className="text-sm text-gray-600 mb-2">Error details:</p>
            <p className="text-sm text-red-700 font-medium">{decodedError}</p>
          </div>
        )}

        {orderId && (
          <div className="bg-white border border-red-200 rounded p-4 mb-6">
            <p className="text-sm text-gray-600">Order ID:</p>
            <p className="font-mono text-sm font-medium">{orderId}</p>
          </div>
        )}

        <div className="space-y-3">
          <Link
            href="/dashboard/shop"
            className="block w-full bg-violet-600 text-white px-6 py-3 rounded-lg hover:bg-violet-700 transition-colors"
          >
            Try Again
          </Link>
          <Link
            href="/dashboard"
            className="block w-full border border-violet-600 text-violet-600 px-6 py-3 rounded-lg hover:bg-violet-50 transition-colors"
          >
            Go to Dashboard
          </Link>
          <Link
            href="/contact"
            className="block w-full text-gray-600 px-6 py-3 rounded-lg hover:bg-gray-50 transition-colors"
          >
            Contact Support
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

export default async function PaymentFailurePage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const orderId = Array.isArray(sp.orderId) ? sp.orderId[0] : sp.orderId;
  const error = Array.isArray(sp.error) ? sp.error[0] : sp.error;
  return <FailureContent orderId={orderId} error={error} />;
}
