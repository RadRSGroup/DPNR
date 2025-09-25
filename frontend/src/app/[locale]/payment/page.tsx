'use client';

import { Suspense } from 'react';
import PaymentFlow from '@/components/PaymentFlow';

function PaymentPageContent() {
  return <PaymentFlow locale="he" />;
}

export default function PaymentPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center">טוען...</div>}>
      <PaymentPageContent />
    </Suspense>
  );
}