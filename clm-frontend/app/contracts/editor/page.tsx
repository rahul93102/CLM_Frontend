import { Suspense } from 'react';
import EditorClient from './EditorClient';

export default function ContractEditorPage() {
  return (
    <Suspense fallback={<div className="py-16 text-center text-slate-500">Loading…</div>}>
      <EditorClient />
    </Suspense>
  );
}
