import { Suspense } from 'react';
import SigningStatusClient from './SigningStatusClient';

export default function SigningStatusPage() {
  return (
    <Suspense fallback={<div className="py-16 text-center text-slate-500">Loading…</div>}>
      <SigningStatusClient />
    </Suspense>
  );
}
