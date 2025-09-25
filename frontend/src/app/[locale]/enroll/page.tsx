'use client';

import { Suspense } from 'react';
import EnrollmentForm from '@/components/EnrollmentForm';

function EnrollmentPageContent() {
  return <EnrollmentForm locale="he" />;
}

export default function EnrollPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center">טוען...</div>}>
      <EnrollmentPageContent />
    </Suspense>
  );
}