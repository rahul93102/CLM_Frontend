'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { X, Type as TypeIcon, PenLine, Upload } from 'lucide-react';
import { Allura, Pacifico, Dancing_Script, Great_Vibes, Sacramento, Caveat } from 'next/font/google';

const allura = Allura({ weight: '400', subsets: ['latin'] });
const pacifico = Pacifico({ weight: '400', subsets: ['latin'] });
const dancingScript = Dancing_Script({ weight: ['400', '700'], subsets: ['latin'] });
const greatVibes = Great_Vibes({ weight: '400', subsets: ['latin'] });
const sacramento = Sacramento({ weight: '400', subsets: ['latin'] });
const caveat = Caveat({ weight: ['400', '700'], subsets: ['latin'] });

type SignatureMode = 'type' | 'draw' | 'upload';

type Props = {
  open: boolean;
  onClose: () => void;
  onApply: (payload: { name: string; dataUrl: string }) => void;
  initialName?: string;
  storageKey?: string;
};

const COLOR_SWATCHES: Array<{ label: string; value: string }> = [
  { label: 'Blue', value: '#1d4ed8' },
  { label: 'Indigo', value: '#1e40af' },
  { label: 'Purple', value: '#5b21b6' },
  { label: 'Navy', value: '#0f172a' },
  { label: 'Gray', value: '#334155' },
  { label: 'Black', value: '#000000' },
];

const SIGNATURE_FONTS: Array<{ label: string; fontFamily: string; className: string }> = [
  { label: 'Allura', fontFamily: allura.style.fontFamily, className: allura.className },
  { label: 'Great Vibes', fontFamily: greatVibes.style.fontFamily, className: greatVibes.className },
  { label: 'Sacramento', fontFamily: sacramento.style.fontFamily, className: sacramento.className },
  { label: 'Pacifico', fontFamily: pacifico.style.fontFamily, className: pacifico.className },
  { label: 'Dancing Script', fontFamily: dancingScript.style.fontFamily, className: dancingScript.className },
  { label: 'Caveat', fontFamily: caveat.style.fontFamily, className: caveat.className },
];

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

async function ensureFontsReady() {
  // In modern browsers this waits for all web fonts.
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const fonts = (document as any)?.fonts;
    if (fonts?.ready) await fonts.ready;
  } catch {
    // ignore
  }
}

function createTypedSignaturePng(args: {
  name: string;
  fontFamily: string;
  color: string;
  widthPx?: number;
  heightPx?: number;
}): string {
  const width = args.widthPx ?? 1200;
  const height = args.heightPx ?? 360;
  const canvas = document.createElement('canvas');
  const dpr = typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1;
  canvas.width = Math.round(width * dpr);
  canvas.height = Math.round(height * dpr);
  canvas.style.width = `${width}px`;
  canvas.style.height = `${height}px`;

  const ctx = canvas.getContext('2d');
  if (!ctx) return '';
  ctx.scale(dpr, dpr);

  ctx.clearRect(0, 0, width, height);
  ctx.fillStyle = args.color;
  ctx.textBaseline = 'middle';

  const safeName = (args.name || '').trim() || 'Signature';

  // Fit text into width.
  let fontSize = 140;
  const padX = 48;
  const padY = 48;
  const maxWidth = width - padX * 2;

  for (let i = 0; i < 20; i++) {
    ctx.font = `${fontSize}px ${args.fontFamily}`;
    const m = ctx.measureText(safeName);
    const textWidth = m.width;
    if (textWidth <= maxWidth) break;
    fontSize = Math.max(48, Math.floor(fontSize * 0.9));
  }

  ctx.font = `${fontSize}px ${args.fontFamily}`;
  const x = padX;
  const y = height / 2;
  ctx.fillText(safeName, x, y);

  // Crop to content so it inserts cleanly in the editor.
  return cropCanvasToPngDataUrl(canvas, Math.round(24 * dpr));
}

function cropCanvasToPngDataUrl(source: HTMLCanvasElement, paddingPx: number): string {
  try {
    const ctx = source.getContext('2d', { willReadFrequently: true });
    if (!ctx) return source.toDataURL('image/png');

    const w = source.width;
    const h = source.height;
    if (!w || !h) return source.toDataURL('image/png');

    const img = ctx.getImageData(0, 0, w, h);
    const data = img.data;
    const alphaThreshold = 12;

    let minX = w;
    let minY = h;
    let maxX = -1;
    let maxY = -1;

    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const a = data[(y * w + x) * 4 + 3];
        if (a > alphaThreshold) {
          if (x < minX) minX = x;
          if (y < minY) minY = y;
          if (x > maxX) maxX = x;
          if (y > maxY) maxY = y;
        }
      }
    }

    if (maxX < minX || maxY < minY) return source.toDataURL('image/png');

    const pad = Math.max(0, Math.floor(paddingPx || 0));
    const sx = Math.max(0, minX - pad);
    const sy = Math.max(0, minY - pad);
    const ex = Math.min(w - 1, maxX + pad);
    const ey = Math.min(h - 1, maxY + pad);
    const cw = Math.max(1, ex - sx + 1);
    const ch = Math.max(1, ey - sy + 1);

    const out = document.createElement('canvas');
    out.width = cw;
    out.height = ch;
    const octx = out.getContext('2d');
    if (!octx) return source.toDataURL('image/png');

    octx.clearRect(0, 0, cw, ch);
    octx.drawImage(source, sx, sy, cw, ch, 0, 0, cw, ch);
    return out.toDataURL('image/png');
  } catch {
    // If readback/cropping fails for any reason, fall back to the uncropped PNG
    // so the signature still inserts.
    return source.toDataURL('image/png');
  }
}

export default function SignatureModal({ open, onClose, onApply, initialName, storageKey }: Props) {
  const [mode, setMode] = useState<SignatureMode>('type');
  const [name, setName] = useState(initialName || '');
  const [color, setColor] = useState(COLOR_SWATCHES[COLOR_SWATCHES.length - 1].value);
  const [selectedFontIdx, setSelectedFontIdx] = useState(0);
  const [remember, setRemember] = useState(true);
  const [uploadDataUrl, setUploadDataUrl] = useState<string>('');
  const [hasInk, setHasInk] = useState(false);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const drawingRef = useRef<{
    drawing: boolean;
    lastX: number;
    lastY: number;
    lastMidX: number;
    lastMidY: number;
    lastT: number;
  }>({
    drawing: false,
    lastX: 0,
    lastY: 0,
    lastMidX: 0,
    lastMidY: 0,
    lastT: 0,
  });

  const pendingPointRef = useRef<{ x: number; y: number; t: number; pressure: number } | null>(null);
  const drawRafRef = useRef<number | null>(null);
  const pointQueueRef = useRef<Array<{ x: number; y: number; t: number; pressure: number }>>([]);

  const resolvedStorageKey = storageKey || 'clm:signatureModal:default:v1';

  const selectedFont = SIGNATURE_FONTS[clamp(selectedFontIdx, 0, SIGNATURE_FONTS.length - 1)];

  const canApply = useMemo(() => {
    if (mode === 'type') return (name || '').trim().length > 0;
    if (mode === 'upload') return uploadDataUrl.startsWith('data:image/');
    // draw
    return hasInk;
  }, [mode, name, uploadDataUrl, hasInk]);

  const close = () => {
    onClose();
  };

  const clearCanvas = () => {
    const c = canvasRef.current;
    if (!c) return;
    const ctx = c.getContext('2d');
    if (!ctx) return;
    // Clear in CSS pixel space (we set a DPR transform on the context).
    const rect = c.getBoundingClientRect();
    ctx.clearRect(0, 0, rect.width, rect.height);
    setHasInk(false);
  };

  const getCanvasPoint = (e: React.PointerEvent<HTMLCanvasElement>) => {
    // Prefer offsetX/Y (CSS pixels relative to the element) to avoid any DPR/layout drift.
    const native = e.nativeEvent as PointerEvent & { offsetX?: number; offsetY?: number };
    const ox = typeof native.offsetX === 'number' ? native.offsetX : null;
    const oy = typeof native.offsetY === 'number' ? native.offsetY : null;
    if (ox != null && oy != null) return { x: ox, y: oy };

    const c = canvasRef.current;
    if (!c) return { x: 0, y: 0 };
    const rect = c.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  };

  const setDrawLineWidth = (ctx: CanvasRenderingContext2D, nextWidth: number) => {
    // Keep it subtle: signature-like variable width.
    ctx.lineWidth = clamp(nextWidth, 1.8, 4.2);
  };

  const enqueuePointsFromPointerEvent = (e: React.PointerEvent<HTMLCanvasElement>) => {
    // Use coalesced events when available for much smoother strokes.
    const native = e.nativeEvent as PointerEvent & {
      getCoalescedEvents?: () => PointerEvent[];
      offsetX?: number;
      offsetY?: number;
    };

    const events = typeof native.getCoalescedEvents === 'function' ? native.getCoalescedEvents() : [native];
    for (const ev of events) {
      const ox = typeof (ev as any).offsetX === 'number' ? Number((ev as any).offsetX) : null;
      const oy = typeof (ev as any).offsetY === 'number' ? Number((ev as any).offsetY) : null;

      let x = 0;
      let y = 0;
      if (ox != null && oy != null) {
        x = ox;
        y = oy;
      } else {
        const c = canvasRef.current;
        if (!c) continue;
        const rect = c.getBoundingClientRect();
        x = (ev.clientX || 0) - rect.left;
        y = (ev.clientY || 0) - rect.top;
      }

      const t = typeof ev.timeStamp === 'number' ? ev.timeStamp : performance.now();
      const pressure = Math.max(0, Number((ev as any).pressure || 0));
      pointQueueRef.current.push({ x, y, t, pressure });
    }
  };

  const drainPointQueue = () => {
    const c = canvasRef.current;
    if (!c) return;
    const ctx = c.getContext('2d');
    if (!ctx) return;
    if (!drawingRef.current.drawing) return;

    // Drain all queued points for maximum smoothness.
    const pts = pointQueueRef.current;
    if (!pts.length) return;

    while (pts.length) {
      const p = pts.shift();
      if (!p) break;

      const prevX = drawingRef.current.lastX;
      const prevY = drawingRef.current.lastY;
      const dist = Math.hypot(p.x - prevX, p.y - prevY);
      // Skip micro-movements to reduce jitter.
      if (dist < 0.35) {
        drawingRef.current.lastT = p.t;
        continue;
      }
      const midX = (prevX + p.x) / 2;
      const midY = (prevY + p.y) / 2;

      const dt = Math.max(1, p.t - drawingRef.current.lastT);
      const speed = dist / dt; // px per ms
      const base = 4.0 - speed * 6.0;
      const pressure = p.pressure > 0 ? p.pressure : 0.5;
      const targetW = base * (0.6 + pressure * 0.8);
      const nextW = ctx.lineWidth * 0.65 + targetW * 0.35;
      setDrawLineWidth(ctx, nextW);

      ctx.beginPath();
      ctx.moveTo(drawingRef.current.lastMidX, drawingRef.current.lastMidY);
      ctx.quadraticCurveTo(prevX, prevY, midX, midY);
      ctx.stroke();

      drawingRef.current.lastX = p.x;
      drawingRef.current.lastY = p.y;
      drawingRef.current.lastMidX = midX;
      drawingRef.current.lastMidY = midY;
      drawingRef.current.lastT = p.t;
      setHasInk(true);
    }
  };

  const getCanvasDataUrl = () => {
    const c = canvasRef.current;
    if (!c) return '';
    const dpr = typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1;
    return cropCanvasToPngDataUrl(c, Math.round(24 * dpr));
  };

  const apply = async () => {
    if (!canApply) return;
    let dataUrl = '';
    const safeName = (name || '').trim();

    if (mode === 'type') {
      await ensureFontsReady();
      dataUrl = createTypedSignaturePng({
        name: safeName,
        fontFamily: selectedFont.fontFamily,
        color,
      });
    } else if (mode === 'upload') {
      dataUrl = uploadDataUrl;
    } else {
      dataUrl = getCanvasDataUrl();
    }

    if (!dataUrl || !dataUrl.startsWith('data:image/')) return;

    if (remember && typeof window !== 'undefined') {
      try {
        localStorage.setItem(
          resolvedStorageKey,
          JSON.stringify({
            mode,
            name: safeName,
            color,
            selectedFontIdx,
            uploadDataUrl: mode === 'upload' ? dataUrl : '',
            savedAt: Date.now(),
          })
        );
      } catch {
        // ignore
      }
    }

    onApply({ name: safeName, dataUrl });
    onClose();
  };

  // Restore saved defaults.
  useEffect(() => {
    if (!open) return;
    if (typeof window === 'undefined') return;
    try {
      const raw = localStorage.getItem(resolvedStorageKey);
      if (!raw) return;
      const obj = JSON.parse(raw);
      if (!obj || typeof obj !== 'object') return;
      if (typeof obj.name === 'string' && !initialName) setName(obj.name);
      if (typeof obj.color === 'string') setColor(obj.color);
      if (Number.isFinite(Number(obj.selectedFontIdx))) setSelectedFontIdx(Number(obj.selectedFontIdx));
      if (typeof obj.mode === 'string' && ['type', 'draw', 'upload'].includes(obj.mode)) setMode(obj.mode);
      if (typeof obj.uploadDataUrl === 'string') setUploadDataUrl(obj.uploadDataUrl);
    } catch {
      // ignore
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  // Initialize draw canvas size each time it opens.
  useEffect(() => {
    if (!open) return;
    const c = canvasRef.current;
    if (!c) return;

    const resize = () => {
      const parent = c.parentElement;
      const cssW = parent ? parent.clientWidth : 640;
      const cssH = 220;
      const dpr = typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1;
      c.width = Math.round(cssW * dpr);
      c.height = Math.round(cssH * dpr);
      c.style.width = `${cssW}px`;
      c.style.height = `${cssH}px`;

      const ctx = c.getContext('2d');
      if (!ctx) return;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.lineWidth = 3;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.strokeStyle = color;
      ctx.imageSmoothingEnabled = true;
      // Clear after transform.
      ctx.clearRect(0, 0, cssW, cssH);
      setHasInk(false);
    };

    resize();
    window.addEventListener('resize', resize);
    return () => window.removeEventListener('resize', resize);
  }, [open]);

  // Keep draw ink color in sync.
  useEffect(() => {
    const c = canvasRef.current;
    if (!c) return;
    const ctx = c.getContext('2d');
    if (!ctx) return;
    ctx.strokeStyle = color;
  }, [color]);

  // Close on ESC.
  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [open]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[60] bg-black/40 flex items-center justify-center p-4" role="dialog" aria-modal="true">
      <div className="w-full max-w-3xl bg-white rounded-[28px] border border-black/10 shadow-2xl overflow-hidden">
        <div className="px-6 pt-6 pb-4 border-b border-black/5 flex items-start justify-between gap-3">
          <div>
            <p className="text-lg font-bold text-[#111827]">Add signature</p>
            <p className="text-xs text-black/45 mt-1">Type your name or draw your signature.</p>
          </div>
          <button
            type="button"
            onClick={close}
            className="w-10 h-10 rounded-full hover:bg-black/5 text-black/45"
            aria-label="Close"
          >
            <X className="w-5 h-5 mx-auto" />
          </button>
        </div>

        <div className="p-6 space-y-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setMode('type')}
                className={`h-9 px-3 rounded-full border text-sm font-semibold flex items-center gap-2 ${
                  mode === 'type' ? 'bg-[#0F141F] text-white border-[#0F141F]' : 'bg-white border-black/10 text-black/70 hover:bg-black/5'
                }`}
              >
                <TypeIcon className="w-4 h-4" />
                Type
              </button>
              <button
                type="button"
                onClick={() => setMode('draw')}
                className={`h-9 px-3 rounded-full border text-sm font-semibold flex items-center gap-2 ${
                  mode === 'draw' ? 'bg-[#0F141F] text-white border-[#0F141F]' : 'bg-white border-black/10 text-black/70 hover:bg-black/5'
                }`}
              >
                <PenLine className="w-4 h-4" />
                Draw
              </button>
              <button
                type="button"
                onClick={() => setMode('upload')}
                className={`h-9 px-3 rounded-full border text-sm font-semibold flex items-center gap-2 ${
                  mode === 'upload' ? 'bg-[#0F141F] text-white border-[#0F141F]' : 'bg-white border-black/10 text-black/70 hover:bg-black/5'
                }`}
              >
                <Upload className="w-4 h-4" />
                Upload
              </button>
            </div>

            <label className="flex items-center gap-2 text-sm text-black/70 select-none">
              <input type="checkbox" checked={remember} onChange={(e) => setRemember(e.target.checked)} />
              Save signature
            </label>
          </div>

          <div className="grid grid-cols-12 gap-3 items-center">
            <div className="col-span-12 sm:col-span-7">
              <input
                className="h-11 w-full rounded-2xl bg-white border border-black/10 px-4 text-sm outline-none"
                placeholder="Type your name"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>
            <div className="col-span-12 sm:col-span-5">
              <div className="flex items-center justify-between gap-2">
                <div className="text-xs font-semibold text-black/45">Ink</div>
                <div className="flex items-center gap-2">
                  {COLOR_SWATCHES.map((s) => (
                    <button
                      key={s.value}
                      type="button"
                      aria-label={s.label}
                      title={s.label}
                      onClick={() => setColor(s.value)}
                      className={`w-7 h-7 rounded-full border ${color === s.value ? 'border-black/40' : 'border-black/10'} grid place-items-center`}
                    >
                      <span className="w-5 h-5 rounded-full" style={{ background: s.value }} />
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {mode === 'type' ? (
            <div className="space-y-3">
              <div className="text-sm font-semibold text-[#111827]">Choose a style</div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {SIGNATURE_FONTS.map((f, idx) => {
                  const selected = idx === selectedFontIdx;
                  return (
                    <button
                      type="button"
                      key={f.label}
                      onClick={() => setSelectedFontIdx(idx)}
                      className={`rounded-2xl border p-3 text-left transition ${selected ? 'border-[#0F141F] ring-2 ring-black/10' : 'border-black/10 hover:bg-black/5'}`}
                    >
                      <div className="text-[11px] text-black/45 font-semibold">{f.label}</div>
                      <div
                        className={`mt-2 h-14 rounded-xl bg-[#F6F3ED] px-3 grid items-center overflow-hidden ${f.className}`}
                        style={{ color }}
                      >
                        <div className="text-[34px] leading-none truncate">
                          {(name || 'Your Signature').trim()}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          ) : null}

          {mode === 'draw' ? (
            <div className="space-y-3">
              <div className="flex items-center justify-between gap-3">
                <div className="text-sm font-semibold text-[#111827]">Draw your signature</div>
                <button
                  type="button"
                  onClick={clearCanvas}
                  className="h-9 px-3 rounded-full bg-white border border-black/10 text-sm font-semibold text-black/70 hover:bg-black/5"
                >
                  Clear
                </button>
              </div>
              <div className="rounded-2xl border border-black/10 bg-white p-3">
                <div className="rounded-xl bg-[#F6F3ED] p-2">
                  <canvas
                    ref={canvasRef}
                    className="w-full h-[220px] rounded-lg bg-transparent touch-none cursor-crosshair"
                    style={{ imageRendering: 'auto' }}
                    onPointerDown={(e) => {
                      const c = canvasRef.current;
                      if (!c) return;
                      const ctx = c.getContext('2d');
                      if (!ctx) return;

                      e.preventDefault();
                      e.stopPropagation();

                      const { x, y } = getCanvasPoint(e);
                      const t = typeof e.timeStamp === 'number' ? e.timeStamp : performance.now();

                      drawingRef.current.drawing = true;
                      drawingRef.current.lastX = x;
                      drawingRef.current.lastY = y;
                      drawingRef.current.lastMidX = x;
                      drawingRef.current.lastMidY = y;
                      drawingRef.current.lastT = t;

                      pointQueueRef.current = [];
                      pendingPointRef.current = { x, y, t, pressure: Math.max(0, Number(e.pressure || 0)) };

                      // Start a dot.
                      ctx.beginPath();
                      ctx.arc(x, y, ctx.lineWidth / 2, 0, Math.PI * 2);
                      ctx.fillStyle = color;
                      ctx.fill();
                      setHasInk(true);

                      try {
                        c.setPointerCapture(e.pointerId);
                      } catch {
                        // ignore
                      }
                    }}
                    onPointerMove={(e) => {
                      const c = canvasRef.current;
                      if (!c) return;
                      if (!drawingRef.current.drawing) return;

                      e.preventDefault();
                      e.stopPropagation();

                      enqueuePointsFromPointerEvent(e);
                      if (drawRafRef.current == null) {
                        drawRafRef.current = requestAnimationFrame(() => {
                          drawRafRef.current = null;
                          drainPointQueue();
                        });
                      }
                    }}
                    onPointerUp={(e) => {
                      if (drawRafRef.current != null) {
                        cancelAnimationFrame(drawRafRef.current);
                        drawRafRef.current = null;
                      }
                      drainPointQueue();

                      drawingRef.current.drawing = false;
                      const c = canvasRef.current;
                      if (!c) return;
                      try {
                        c.releasePointerCapture(e.pointerId);
                      } catch {
                        // ignore
                      }
                    }}
                    onPointerCancel={() => {
                      if (drawRafRef.current != null) {
                        cancelAnimationFrame(drawRafRef.current);
                        drawRafRef.current = null;
                      }
                      drainPointQueue();
                      drawingRef.current.drawing = false;
                    }}
                  />
                </div>
              </div>
              <div className="text-xs text-black/45">Tip: use a trackpad or mouse; touch works too.</div>
            </div>
          ) : null}

          {mode === 'upload' ? (
            <div className="space-y-3">
              <div className="text-sm font-semibold text-[#111827]">Upload signature image</div>
              <div className="flex items-center gap-2">
                <input
                  type="file"
                  accept="image/*"
                  className="block w-full text-sm text-black/70 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:bg-[#0F141F] file:text-white file:text-sm file:font-semibold hover:file:bg-black"
                  onChange={async (e) => {
                    const f = e.target.files?.[0];
                    if (!f) return;
                    const dataUrl: string = await new Promise((resolve, reject) => {
                      const r = new FileReader();
                      r.onload = () => resolve(String(r.result || ''));
                      r.onerror = () => reject(new Error('Failed to read image'));
                      r.readAsDataURL(f);
                    });
                    if (dataUrl.startsWith('data:image/')) setUploadDataUrl(dataUrl);
                    e.currentTarget.value = '';
                  }}
                />
              </div>
              {uploadDataUrl ? (
                <div className="rounded-2xl border border-black/10 bg-[#F6F3ED] p-3">
                  <img src={uploadDataUrl} alt="Uploaded signature" className="max-h-[200px] object-contain" />
                </div>
              ) : (
                <div className="text-xs text-black/45">Upload a PNG/JPG with transparent background if possible.</div>
              )}
            </div>
          ) : null}

          <div className="pt-2 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={close}
              className="h-10 px-4 rounded-full bg-white border border-black/10 text-black/70 text-sm font-semibold hover:bg-black/5"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={apply}
              disabled={!canApply}
              className="h-10 px-4 rounded-full bg-[#FF5C7A] text-white text-sm font-semibold disabled:opacity-60"
            >
              Add to document
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
