'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Rnd } from 'react-rnd';

export type PlacerSigner = { name: string; email: string; recipient_index?: number };

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
    recipient_index: typeof signers[i]?.recipient_index === 'number' ? Number(signers[i]!.recipient_index) : i,
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
  // Reduce default zoom so the PDF isn't overly magnified.
  // (User feedback: ~30%+ less zoom)
  const DEFAULT_ZOOM_FACTOR = 0.65;

  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [numPages, setNumPages] = useState(1);
  const [page, setPage] = useState(1);

  const containerRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const pdfjsRef = useRef<any>(null);
  const pdfDocRef = useRef<any>(null);
  const loadingTaskRef = useRef<any>(null);
  const renderTaskRef = useRef<any>(null);
  const renderSeqRef = useRef(0);

  const [containerWidth, setContainerWidth] = useState<number>(0);

  const [pagePx, setPagePx] = useState<{ w: number; h: number }>({ w: 800, h: 1035 });

  const [placements, setPlacements] = useState<SignatureFieldPlacement[]>([]);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const palette = ['#2563eb', '#16a34a', '#dc2626', '#9333ea', '#0ea5e9', '#f97316'];

  // Reconcile placements with signers
  useEffect(() => {
    if (!open) return;

    const defaults = defaultPlacementsForSigners(signers);
    const base = Array.isArray(initialPlacements) && initialPlacements.length > 0 ? initialPlacements : defaults;
    const byRecipient = new Map<number, SignatureFieldPlacement>();
    for (const p of base) {
      if (typeof p?.recipient_index === 'number') byRecipient.set(p.recipient_index, normalizePlacement(p));
    }

    const merged: SignatureFieldPlacement[] = [];
    for (let i = 0; i < signers.length; i++) {
      const recipientIndex = defaults[i]?.recipient_index ?? i;
      merged.push(
        normalizePlacement(
          byRecipient.get(recipientIndex) || {
            recipient_index: recipientIndex,
            page_number: 1,
            position: defaults[i]!.position,
          }
        )
      );
    }
    setPlacements(merged);
  }, [open, signers, initialPlacements]);

  const visiblePlacements = useMemo(() => placements.filter((p) => (p.page_number || 1) === page), [placements, page]);

  // Track container width (used to scale PDF rendering) and trigger re-render.
  useEffect(() => {
    if (!open) return;
    const el = containerRef.current;
    if (!el) return;

    const update = () => setContainerWidth(el.clientWidth || 0);
    update();

    const ro = new ResizeObserver(() => update());
    ro.observe(el);
    return () => ro.disconnect();
  }, [open]);

  // Load the PDF document once per open/pdfUrl. Keep it in a ref.
  useEffect(() => {
    if (!open) return;
    if (!pdfUrl) return;

    let cancelled = false;

    const cleanup = async () => {
      const rt = renderTaskRef.current;
      renderTaskRef.current = null;
      if (rt) {
        try {
          rt.cancel();
        } catch {
          // ignore
        }
        try {
          await rt.promise;
        } catch {
          // ignore
        }
      }

      const doc = pdfDocRef.current;
      pdfDocRef.current = null;
      if (doc) {
        try {
          await doc.destroy();
        } catch {
          // ignore
        }
      }

      const lt = loadingTaskRef.current;
      loadingTaskRef.current = null;
      if (lt) {
        try {
          await lt.destroy();
        } catch {
          // ignore
        }
      }
    };

    const run = async () => {
      setLoading(true);
      setLoadError(null);

      await cleanup();

      try {
        const pdfjs = await import('pdfjs-dist');
        if (cancelled) return;
        pdfjsRef.current = pdfjs;

        (pdfjs as any).GlobalWorkerOptions.workerSrc = new URL('pdfjs-dist/build/pdf.worker.min.mjs', import.meta.url).toString();

        const task = (pdfjs as any).getDocument({
          url: pdfUrl,
          // Served from Next.js /public via scripts/copy-pdfjs-assets.mjs
          standardFontDataUrl: '/pdfjs/standard_fonts/',
          cMapUrl: '/pdfjs/cmaps/',
          cMapPacked: true,
        });
        loadingTaskRef.current = task;
        const doc = await task.promise;
        if (cancelled) {
          try {
            await doc.destroy();
          } catch {
            // ignore
          }
          return;
        }

        pdfDocRef.current = doc;
        setNumPages(doc.numPages || 1);
        setPage((p) => clamp(p || 1, 1, doc.numPages || 1));
      } catch (e) {
        if (!cancelled) setLoadError(e instanceof Error ? e.message : 'Failed to load PDF');
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    void run();

    return () => {
      cancelled = true;
      void cleanup();
    };
  }, [open, pdfUrl]);

  // Render the currently selected page into the shared canvas.
  useEffect(() => {
    if (!open) return;
    if (loadError) return;
    const doc = pdfDocRef.current;
    if (!doc) return;
    const canvas = canvasRef.current;
    if (!canvas) return;

    let cancelled = false;
    const seq = ++renderSeqRef.current;

    const run = async () => {
      const prev = renderTaskRef.current;
      if (prev) {
        try {
          prev.cancel();
        } catch {
          // ignore
        }
        try {
          await prev.promise;
        } catch {
          // ignore
        }
      }

      const pg = await doc.getPage(page);
      if (cancelled || renderSeqRef.current !== seq) return;

      const containerW = containerWidth || containerRef.current?.clientWidth || 980;
      const viewport1 = pg.getViewport({ scale: 1 });
      const fitWidthScale = (Math.max(360, containerW) - 24) / viewport1.width;
      const scale = Math.max(0.25, Math.min(2.25, fitWidthScale * DEFAULT_ZOOM_FACTOR));
      const viewport = pg.getViewport({ scale });

      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      canvas.width = Math.floor(viewport.width);
      canvas.height = Math.floor(viewport.height);
      setPagePx({ w: canvas.width, h: canvas.height });

      const task = pg.render({ canvasContext: ctx, viewport });
      renderTaskRef.current = task;

      try {
        await task.promise;
      } catch (e: any) {
        // Expected when we cancel on resize/page change.
        const name = String(e?.name || '');
        const msg = String(e?.message || '');
        const isCancel = name.toLowerCase().includes('cancel') || msg.toLowerCase().includes('cancel');
        if (!isCancel && !cancelled) {
          setLoadError(msg || 'Failed to render PDF');
        }
      }
    };

    void run();
    return () => {
      cancelled = true;
    };
  }, [open, page, containerWidth, loadError]);

  useEffect(() => {
    // Reset error state when reopened
    if (!open) return;
    setSaveError(null);
    setLoadError(null);
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
    <div className="fixed inset-0 z-[80] flex items-center justify-center p-4" role="dialog" aria-modal="true">
      <div className="absolute inset-0 bg-black/40" onClick={() => (!saving ? onCancel() : undefined)} />
      <div className="relative w-full max-w-6xl max-h-[92vh] bg-white rounded-[28px] border border-black/10 shadow-2xl overflow-hidden flex flex-col">
        <div className="px-6 pt-6 pb-4 border-b border-black/5 flex items-start justify-between gap-3">
          <div>
            <p className="text-lg font-bold text-[#111827]">Place signature fields</p>
            <p className="text-xs text-black/45 mt-1">Drag and resize. Positions are saved per template and used by Firma.</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onCancel}
              disabled={saving}
              className="h-10 px-4 rounded-full bg-white border border-black/10 text-sm font-semibold text-[#0F141F] hover:bg-black/5 disabled:opacity-60"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={saving || loading || !!loadError}
              className="h-10 px-4 rounded-full bg-[#0F141F] text-white text-sm font-semibold hover:bg-[#0F141F]/90 disabled:opacity-60"
            >
              {saving ? 'Saving…' : 'Save & Continue'}
            </button>
            <button
              type="button"
              onClick={onCancel}
              disabled={saving}
              className="w-10 h-10 rounded-full hover:bg-black/5 text-black/45"
              aria-label="Close"
            >
              <svg className="w-6 h-6 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        <div className="flex-1 min-h-0 grid grid-cols-1 gap-0 md:grid-cols-[280px_1fr]">
          <div className="border-b md:border-b-0 md:border-r border-black/5 p-5 bg-[#F6F3ED] overflow-auto">
            <div className="mb-3 flex items-center justify-between">
              <div className="text-sm font-semibold text-[#111827]">Signers</div>
              <div className="text-xs text-black/45">
                Page {page}/{numPages}
              </div>
            </div>

            <div className="space-y-3">
              {signers.map((s, idx) => {
                const p = placements.find((pp) => pp.recipient_index === idx);
                const color = palette[idx % palette.length];
                return (
                  <div key={`${s.email}-${idx}`} className="rounded-2xl border border-black/10 bg-white p-4">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="truncate text-sm font-semibold text-[#111827]">{s.name || `Signer ${idx + 1}`}</div>
                        <div className="truncate text-xs text-black/45">{s.email}</div>
                      </div>
                      <div className="h-3 w-3 flex-none rounded" style={{ background: color }} />
                    </div>

                    <div className="mt-2 flex items-center gap-2">
                      <label className="text-xs text-black/60">Page</label>
                      <select
                        className="w-full h-9 rounded-2xl bg-white border border-black/10 px-3 text-sm outline-none"
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

                    <div className="mt-2 text-[11px] text-black/45">
                      x={p?.position.x.toFixed(1)}%, y={p?.position.y.toFixed(1)}%, w={p?.position.width.toFixed(1)}%, h={p?.position.height.toFixed(1)}%
                    </div>

                    <button
                      type="button"
                      className="mt-3 w-full h-9 rounded-full bg-white border border-black/10 text-sm font-semibold text-[#0F141F] hover:bg-black/5"
                      onClick={() => setPage(p?.page_number || 1)}
                    >
                      Jump to field
                    </button>
                  </div>
                );
              })}
            </div>

            {saveError ? <div className="mt-3 text-sm text-rose-600">{saveError}</div> : null}
          </div>

          <div className="p-5 overflow-auto">
            <div className="mb-3 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  className="h-9 px-3 rounded-full bg-white border border-black/10 text-sm font-semibold text-[#0F141F] hover:bg-black/5 disabled:opacity-60"
                  onClick={handlePrev}
                  disabled={page <= 1}
                >
                  Prev
                </button>
                <button
                  type="button"
                  className="h-9 px-3 rounded-full bg-white border border-black/10 text-sm font-semibold text-[#0F141F] hover:bg-black/5 disabled:opacity-60"
                  onClick={handleNext}
                  disabled={page >= numPages}
                >
                  Next
                </button>
              </div>

              <div className="text-xs text-black/45">Drag fields on the document</div>
            </div>

            {loadError ? (
              <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">{loadError}</div>
            ) : (
              <div ref={containerRef} className="relative mx-auto w-full max-w-[980px] rounded-2xl border border-black/10 bg-white p-3 shadow-sm">
                <div className="relative inline-block bg-white rounded-xl">
                  <canvas ref={canvasRef} className="block" />

                  {loading ? (
                    <div className="absolute inset-0 flex items-center justify-center bg-white/70 text-sm text-black/60">Rendering…</div>
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
                            className="h-full w-full rounded-2xl border bg-white/80 px-3 py-2 text-xs font-semibold shadow-sm"
                            style={{ borderColor: color, color }}
                          >
                            <div className="truncate">{label}</div>
                            <div className="mt-0.5 text-[10px] font-normal text-black/45">Drag / resize</div>
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

        <div className="border-t border-black/5 px-6 py-4">
          <div className="text-xs text-black/45">
            Coordinates are stored as percentages (0–100) so they’re stable across different PDF sizes.
          </div>
        </div>
      </div>
    </div>
  );
}
