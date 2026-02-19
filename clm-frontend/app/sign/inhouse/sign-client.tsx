'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { ApiClient } from '@/app/lib/api-client';
import { API_BASE_URL } from '@/app/lib/env';
import SignatureModal from '@/app/components/SignatureModal';
import SignatureFieldPlacer, { type SignatureFieldPlacement } from '@/app/components/SignatureFieldPlacer';

function getOrCreateDeviceId(): string {
  if (typeof window === 'undefined') return '';
  const key = 'clm:device_id:v1';
  const existing = window.localStorage.getItem(key);
  if (existing) return existing;
  const next =
    typeof window.crypto?.randomUUID === 'function'
      ? window.crypto.randomUUID()
      : `${Date.now()}_${Math.random().toString(16).slice(2)}`;
  window.localStorage.setItem(key, next);
  return next;
}

export default function InhouseSignClient() {
  const sp = useSearchParams();
  const token = sp?.get('token') || '';

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [session, setSession] = useState<any | null>(null);

  const [sigOpen, setSigOpen] = useState(false);
  const [placeOpen, setPlaceOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [signed, setSigned] = useState(false);
  const [pdfRev, setPdfRev] = useState(0);
  const [placement, setPlacement] = useState<SignatureFieldPlacement | null>(null);

  const deviceId = useMemo(() => getOrCreateDeviceId(), []);

  const pdfSrc = useMemo(() => {
    const pdfUrl = String(session?.pdf_url || '').trim();
    if (!pdfUrl) return '';
    const base = String(API_BASE_URL || '').trim().replace(/\/+$/, '');
    if (!base) return pdfUrl;
    const full = `${base}${pdfUrl.startsWith('/') ? '' : '/'}${pdfUrl}`;
    const sep = full.includes('?') ? '&' : '?';
    return `${full}${sep}v=${pdfRev}`;
  }, [session, pdfRev]);

  const refresh = async () => {
    if (!token) {
      setError('Missing token');
      setLoading(false);
      return;
    }
    try {
      setLoading(true);
      setError(null);
      const client = new ApiClient();
      const res = await client.inhouseSignerSession(token, deviceId);
      if (!res.success) {
        setError(res.error || 'Failed to load signing session');
        return;
      }
      const data = res.data as any;
      setSession(data);
      setSigned(String(data?.signer?.status || '').toLowerCase() === 'signed');
      if (data?.placement && typeof data.placement === 'object') {
        setPlacement(data.placement as SignatureFieldPlacement);
      }
      setPdfRev((v) => v + 1);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  const doSign = async (dataUrl: string) => {
    if (!token) return;
    try {
      setSubmitting(true);
      setError(null);
      const client = new ApiClient();
      const res = await client.inhouseSignerSign(token, dataUrl, deviceId, placement || undefined);
      if (!res.success) {
        setError(res.error || 'Failed to sign');
        return;
      }
      setSigned(true);
      setPdfRev((v) => v + 1);
      setSigOpen(false);
      void refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to sign');
    } finally {
      setSubmitting(false);
    }
  };

  const contractTitle = String(session?.contract_title || 'Contract');
  const signerName = String(session?.signer?.name || session?.signer?.email || '').trim();

  return (
    <div className="min-h-[100dvh] bg-slate-50">
      <div className="max-w-5xl mx-auto px-4 py-8">
        <div className="flex flex-col gap-2">
          <h1 className="text-2xl md:text-3xl font-extrabold text-slate-900">Sign Contract</h1>
          <div className="text-sm text-slate-600">
            <span className="font-semibold text-slate-700">Document:</span> {contractTitle}
            {signerName ? (
              <>
                {' '}
                <span className="mx-2 text-slate-300">•</span>
                <span className="font-semibold text-slate-700">Signer:</span> {signerName}
              </>
            ) : null}
          </div>
        </div>

        {error ? <div className="mt-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">{error}</div> : null}

        <div className="mt-6 grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-6">
          <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden">
            <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between gap-3">
              <div className="text-sm font-semibold text-slate-800">Preview</div>
              {loading ? <div className="text-xs text-slate-500">Loading…</div> : null}
            </div>
            <div className="h-[70vh] bg-slate-50">
              {pdfSrc ? (
                <iframe title="Contract PDF" src={pdfSrc} className="w-full h-full" />
              ) : (
                <div className="h-full flex items-center justify-center text-sm text-slate-500">No PDF available</div>
              )}
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-4">
            <div className="text-sm font-semibold text-slate-800">Your signature</div>
            <div className="mt-1 text-xs text-slate-500">Type or draw your signature and submit.</div>

            <button
              type="button"
              onClick={() => setPlaceOpen(true)}
              disabled={submitting || loading || !token || !pdfSrc}
              className="mt-3 w-full h-10 rounded-xl border border-slate-200 bg-white text-slate-900 text-sm font-semibold hover:bg-slate-50 disabled:opacity-60"
            >
              Choose signature position
            </button>

            <button
              type="button"
              onClick={() => setSigOpen(true)}
              disabled={submitting || loading || !token}
              className="mt-4 w-full h-10 rounded-xl bg-slate-900 text-white text-sm font-semibold hover:bg-slate-800 disabled:opacity-60"
            >
              {submitting ? 'Submitting…' : signed ? 'Signed' : 'Add signature'}
            </button>

            {signed ? <div className="mt-3 text-xs text-emerald-700 font-semibold">Signature submitted successfully.</div> : null}

            <div className="mt-4 text-[11px] text-slate-500">
              Link token is used as authentication for this page. Keep it private.
            </div>
          </div>
        </div>

        <SignatureModal
          open={sigOpen}
          onClose={() => setSigOpen(false)}
          onApply={(payload) => void doSign(payload.dataUrl)}
          initialName={signerName}
          storageKey="clm:inhouseSigner:signatureModal:v1"
        />

        <SignatureFieldPlacer
          open={placeOpen}
          pdfUrl={pdfSrc}
          signers={[
            {
              name: String(session?.signer?.name || session?.signer?.email || 'Signer'),
              email: String(session?.signer?.email || ''),
              recipient_index: Number(session?.signer?.recipient_index ?? 0),
            },
          ]}
          initialPlacements={placement ? [placement] : undefined}
          onCancel={() => setPlaceOpen(false)}
          onSave={async (placements) => {
            const first = Array.isArray(placements) ? placements[0] : null;
            if (first) setPlacement(first);
            setPlaceOpen(false);
          }}
        />
      </div>
    </div>
  );
}
