import { Suspense } from 'react';
import ReviewDetailClient from './ReviewDetailClient';

export default function ReviewDetailPage() {
  return (
    <Suspense fallback={<div className="py-16 text-center text-slate-500">Loading…</div>}>
      <ReviewDetailClient />
    </Suspense>
  );
}
