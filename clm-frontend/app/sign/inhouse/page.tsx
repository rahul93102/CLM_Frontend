import { Suspense } from 'react';
import InhouseSignClient from './sign-client';

export default function InhouseSignPage() {
  return (
    <Suspense fallback={<div className="min-h-[100dvh] bg-slate-50" />}>
      <InhouseSignClient />
    </Suspense>
  );
}
