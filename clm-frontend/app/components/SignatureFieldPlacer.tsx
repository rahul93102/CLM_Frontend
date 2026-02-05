'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Rnd } from 'react-rnd';

export type PlacerSigner = { name: string; email: string };

export type SignatureFieldPlacement = {
  recipient_index: number;
  page_number: number;
  position: { x: number; y: number; width: number; height: number }; // percent 0..100
};

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

function normalizePlacement(p: SignatureFieldPlacement): SignatureFieldPlacement {
  const x = clamp(Number(p.position?.x ?? 0), 0, 100);
  const y = clamp(Number(p.position?.y ?? 0), 0, 100);
  const width = clamp(Number(p.position?.width ?? 1), 1, 100);
  const height = clamp(Number(p.position?.height ?? 1), 1, 100);
  const maxW = 100 - x;
  const maxH = 100 - y;
  return {
    recipient_index: Math.max(0, Number(p.recipient_index ?? 0) || 0),
    page_number: Math.max(1, Number(p.page_number ?? 1) || 1),
    position: {
      x,
      y,
      width: clamp(width, 1, maxW),
      height: clamp(height, 1, maxH),
    },
  };
}

function defaultPlacementsForSigners(signers: PlacerSigner[]): SignatureFieldPlacement[] {
  const baseX = 10;
  const baseY = 80;
  const width = 30;
  const height = 8;
  const spacing = 12;
  return signers.map((_, i) => ({
    recipient_index: i,
    page_number: 1,
    position: {
      x: baseX,
      y: clamp(baseY - i * spacing, 5, 90),
      width,
      height,
    },
  }));
}

type Props = {
  open: boolean;
  pdfUrl: string;
  signers: PlacerSigner[];
  initialPlacements?: SignatureFieldPlacement[];
  onCancel: () => void;
  onSave: (placements: SignatureFieldPlacement[]) => Promise<void> | void;
};

export default function SignatureFieldPlacer({
  open,
  pdfUrl,
  signers,
  initialPlacements,
  onCancel,
  onSave,
}: Props) {
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [numPages, setNumPages] = useState(1);
  const [page, setPage] = useState(1);

  const containerRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const [pagePx, setPagePx] = useState<{ w: number; h: number }>({ w: 800, h: 1035 });

  const [placements, setPlacements] = useState<SignatureFieldPlacement[]>([]);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const palette = ['#2563eb', '#16a34a', '#dc2626', '#9333ea', '#0ea5e9', '#f97316'];

  // Reconcile placements with signers
  useEffect(() => {
    if (!open) return;

    const base = Array.isArray(initialPlacements) && initialPlacements.length > 0 ? initialPlacements : defaultPlacementsForSigners(signers);
    const byRecipient = new Map<number, SignatureFieldPlacement>();
    for (const p of base) {
      if (typeof p?.recipient_index === 'number') byRecipient.set(p.recipient_index, normalizePlacement(p));
    }

    const merged: SignatureFieldPlacement[] = [];
    for (let i = 0; i < signers.length; i++) {
      merged.push(
        normalizePlacement(
          byRecipient.get(i) || {
            recipient_index: i,
            page_number: 1,
            position: defaultPlacementsForSigners([signers[i]])[0].position,
          }
        )
      );
    }
    setPlacements(merged);
  }, [open, signers, initialPlacements]);

  const visiblePlacements = useMemo(() => placements.filter((p) => (p.page_number || 1) === page), [placements, page]);

  useEffect(() => {
    if (!open) return;
    if (!pdfUrl) return;

    let cancelled = false;

    const run = async () => {
      setLoading(true);
      setLoadError(null);

      try {
        // Dynamic import so this stays client-only and avoids SSR bundling issues.
        const pdfjs = await import('pdfjs-dist');
        (pdfjs as any).GlobalWorkerOptions.workerSrc = new URL('pdfjs-dist/build/pdf.worker.min.mjs', import.meta.url).toString();

        const loadingTask = (pdfjs as any).getDocument(pdfUrl);
        const doc = await loadingTask.promise;
        if (cancelled) return;

        setNumPages(doc.numPages || 1);
        setPage((p) => clamp(p, 1, doc.numPages || 1));

        const renderPage = async (pageNumber: number) => {
          const pg = await doc.getPage(pageNumber);
          if (cancelled) return;

          const containerWidth = containerRef.current?.clientWidth || 900;
          const viewport1 = pg.getViewport({ scale: 1 });
          const scale = Math.max(0.5, Math.min(2.5, (containerWidth - 24) / viewport1.width));
          const viewport = pg.getViewport({ scale });

          const canvas = canvasRef.current;
          if (!canvas) return;
          const ctx = canvas.getContext('2d');
          if (!ctx) return;

          canvas.width = Math.floor(viewport.width);
          canvas.height = Math.floor(viewport.height);
          setPagePx({ w: canvas.width, h: canvas.height });

          await pg.render({ canvasContext: ctx, viewport }).promise;
        };

        await renderPage(page);

        const ro = new ResizeObserver(() => {
          void renderPage(page);
        });
        if (containerRef.current) ro.observe(containerRef.current);

        return () => ro.disconnect();
      } catch (e) {
        setLoadError(e instanceof Error ? e.message : 'Failed to load PDF');
      } finally {
        setLoading(false);
      }
    };

    void run();

    return () => {
      cancelled = true;
    };
  }, [open, pdfUrl, page]);

  const updatePlacement = (recipientIndex: number, patch: Partial<SignatureFieldPlacement>) => {
    setPlacements((prev) =>
      prev.map((p) => (p.recipient_index === recipientIndex ? normalizePlacement({ ...p, ...patch, position: { ...p.position, ...(patch as any).position } }) : p))
    );
  };

  const onDragResizeStop = (recipientIndex: number, xPx: number, yPx: number, wPx: number, hPx: number) => {
    const w = pagePx.w || 1;
    const h = pagePx.h || 1;

    const x = clamp((xPx / w) * 100, 0, 100);
    const y = clamp((yPx / h) * 100, 0, 100);
    const width = clamp((wPx / w) * 100, 1, 100);
    const height = clamp((hPx / h) * 100, 1, 100);

    updatePlacement(recipientIndex, { position: { x, y, width, height } } as any);
  };

  const handlePrev = () => setPage((p) => Math.max(1, p - 1));
  const handleNext = () => setPage((p) => Math.min(numPages, p + 1));

  const handleSave = async () => {
    setSaving(true);
    setSaveError(null);
    try {
      const normalized = placements.map(normalizePlacement);
      await onSave(normalized);
    } catch (e) {
      setSaveError(e instanceof Error ? e.message : 'Failed to save positions');
    } finally {
      setSaving(false);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="w-full max-w-6xl overflow-hidden rounded-xl bg-white shadow-xl">
        <div className="flex items-center justify-between border-b px-5 py-3">
          <div>
            <div className="text-sm font-semibold text-gray-900">Place signature fields</div>
            <div className="text-xs text-gray-500">Drag and resize. Positions are saved per template and used by Firma.</div>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              className="rounded-md border px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50"
              onClick={onCancel}
              disabled={saving}
            >
              Cancel
            </button>
            <button
              type="button"
              className="rounded-md bg-blue-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-60"
              onClick={handleSave}
              disabled={saving || loading || !!loadError}
            >
              {saving ? 'Saving…' : 'Save & Continue'}
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-0 md:grid-cols-[280px_1fr]">
          <div className="border-b md:border-b-0 md:border-r p-4">
            <div className="mb-3 flex items-center justify-between">
              <div className="text-sm font-medium text-gray-900">Signers</div>
              <div className="text-xs text-gray-500">Page {page}/{numPages}</div>
            </div>

            <div className="space-y-2">
              {signers.map((s, idx) => {
                const p = placements.find((pp) => pp.recipient_index === idx);
                const color = palette[idx % palette.length];
                return (
                  <div key={`${s.email}-${idx}`} className="rounded-lg border p-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="truncate text-sm font-medium text-gray-900">{s.name || `Signer ${idx + 1}`}</div>
                        <div className="truncate text-xs text-gray-500">{s.email}</div>
                      </div>
                      <div className="h-3 w-3 flex-none rounded" style={{ background: color }} />
                    </div>

                    <div className="mt-2 flex items-center gap-2">
                      <label className="text-xs text-gray-600">Page</label>
                      <select
                        className="w-full rounded-md border px-2 py-1 text-sm"
                        value={p?.page_number || 1}
                        onChange={(e) => updatePlacement(idx, { page_number: Number(e.target.value) || 1 })}
                      >
                        {Array.from({ length: numPages }, (_, i) => i + 1).map((n) => (
                          <option key={n} value={n}>
                            {n}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="mt-2 text-xs text-gray-500">
                      x={p?.position.x.toFixed(1)}%, y={p?.position.y.toFixed(1)}%, w={p?.position.width.toFixed(1)}%, h={p?.position.height.toFixed(1)}%
                    </div>

                    <button
                      type="button"
                      className="mt-2 w-full rounded-md border px-2 py-1.5 text-sm text-gray-700 hover:bg-gray-50"
                      onClick={() => setPage(p?.page_number || 1)}
                    >
                      Jump to field
                    </button>
                  </div>
                );
              })}
            </div>

            {saveError ? <div className="mt-3 text-sm text-red-600">{saveError}</div> : null}
          </div>

          <div className="p-4">
            <div className="mb-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <button type="button" className="rounded-md border px-3 py-1.5 text-sm hover:bg-gray-50" onClick={handlePrev} disabled={page <= 1}>
                  Prev
                </button>
                <button
                  type="button"
                  className="rounded-md border px-3 py-1.5 text-sm hover:bg-gray-50"
                  onClick={handleNext}
                  disabled={page >= numPages}
                >
                  Next
                </button>
              </div>

              <div className="text-xs text-gray-500">Drag fields on the document</div>
            </div>

            {loadError ? (
              <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">{loadError}</div>
            ) : (
              <div ref={containerRef} className="relative mx-auto w-full max-w-[980px] overflow-auto rounded-lg border bg-gray-50 p-3">
                <div className="relative inline-block bg-white">
                  <canvas ref={canvasRef} className="block" />

                  {loading ? (
                    <div className="absolute inset-0 flex items-center justify-center bg-white/70 text-sm text-gray-700">Rendering…</div>
                  ) : null}

                  {/* Overlay */}
                  <div className="absolute left-0 top-0" style={{ width: pagePx.w, height: pagePx.h }}>
                    {visiblePlacements.map((p) => {
                      const idx = p.recipient_index;
                      const color = palette[idx % palette.length];

                      const xPx = (p.position.x / 100) * pagePx.w;
                      const yPx = (p.position.y / 100) * pagePx.h;
                      const wPx = (p.position.width / 100) * pagePx.w;
                      const hPx = (p.position.height / 100) * pagePx.h;

                      const label = signers[idx]?.name ? `Sign: ${signers[idx].name}` : `Signature ${idx + 1}`;

                      return (
                        <Rnd
                          key={`${idx}-${p.page_number}`}
                          bounds="parent"
                          size={{ width: wPx, height: hPx }}
                          position={{ x: xPx, y: yPx }}
                          minWidth={Math.max(40, (2 / 100) * pagePx.w)}
                          minHeight={Math.max(24, (2 / 100) * pagePx.h)}
                          onDragStop={(_, d) => onDragResizeStop(idx, d.x, d.y, wPx, hPx)}
                          onResizeStop={(_, __, ref, ___, pos) => {
                            const newW = ref.offsetWidth;
                            const newH = ref.offsetHeight;
                            onDragResizeStop(idx, pos.x, pos.y, newW, newH);
                          }}
                          enableResizing
                        >
                          <div
                            className="h-full w-full rounded-md border bg-white/70 px-2 py-1 text-xs font-medium"
                            style={{ borderColor: color, color }}
                          >
                            <div className="truncate">{label}</div>
                            <div className="mt-0.5 text-[10px] font-normal text-gray-600">Drag / resize</div>
                          </div>
                        </Rnd>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="border-t px-5 py-3">
          <div className="text-xs text-gray-500">
            Coordinates are stored as percentages (0–100) so they’re stable across different PDF sizes.
          </div>
        </div>
      </div>
    </div>
  );
}
