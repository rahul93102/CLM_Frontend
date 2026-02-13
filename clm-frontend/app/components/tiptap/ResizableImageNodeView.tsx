'use client';

import React, { useCallback, useMemo, useRef } from 'react';
import { NodeViewWrapper, type NodeViewProps } from '@tiptap/react';

type ImageAlign = 'left' | 'center' | 'right';

type ResizeHandle =
  | 'nw'
  | 'ne'
  | 'sw'
  | 'se'
  | 'n'
  | 's'
  | 'w'
  | 'e';

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

function getAlignStyles(align: ImageAlign) {
  if (align === 'left') return { marginLeft: 0, marginRight: 'auto' } as const;
  if (align === 'right') return { marginLeft: 'auto', marginRight: 0 } as const;
  return { marginLeft: 'auto', marginRight: 'auto' } as const;
}

export default function ResizableImageNodeView(props: NodeViewProps) {
  const wrapperRef = useRef<HTMLDivElement | null>(null);
  const imgRef = useRef<HTMLImageElement | null>(null);
  const dragStateRef = useRef<{
    startClientX: number;
    startClientY: number;
    startX: number;
    startY: number;
    containerRect: DOMRect;
    selfRect: DOMRect;
    raf: number | null;
    nextX: number;
    nextY: number;
  } | null>(null);

  const attrs = props.node.attrs as {
    src?: string;
    alt?: string;
    title?: string;
    width?: string | null;
    x?: number;
    y?: number;
    align?: ImageAlign;
  };

  const align: ImageAlign = (attrs.align as ImageAlign) || 'center';
  const width = typeof attrs.width === 'string' ? attrs.width : null;
  const x = typeof attrs.x === 'number' && Number.isFinite(attrs.x) ? attrs.x : 0;
  const y = typeof attrs.y === 'number' && Number.isFinite(attrs.y) ? attrs.y : 0;

  const wrapperStyle = useMemo(() => {
    const base: React.CSSProperties = {
      display: 'block',
      width: width || 'fit-content',
      maxWidth: '100%',
      ...getAlignStyles(align),
      marginTop: '0.75rem',
      marginBottom: '0.75rem',
      transform: x !== 0 || y !== 0 ? `translate(${Math.round(x)}px, ${Math.round(y)}px)` : undefined,
      willChange: x !== 0 || y !== 0 ? 'transform' : undefined,
    };
    return base;
  }, [align, width, x, y]);

  const imgStyle = useMemo(() => {
    const base: React.CSSProperties = {
      maxWidth: '100%',
      height: 'auto',
      display: 'block',
      ...(width ? { width: '100%' } : null),
    };
    return base;
  }, [width]);

  const stopDrag = useCallback(() => {
    const s = dragStateRef.current;
    if (!s) return;
    if (s.raf != null) cancelAnimationFrame(s.raf);
    dragStateRef.current = null;
    window.removeEventListener('pointermove', onPointerMove);
    window.removeEventListener('pointerup', onPointerUp);
    window.removeEventListener('pointercancel', onPointerUp);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const onPointerUp = useCallback(() => {
    stopDrag();
  }, [stopDrag]);

  const onPointerMove = useCallback(
    (ev: PointerEvent) => {
      const s = dragStateRef.current;
      if (!s) return;

      const dx = ev.clientX - s.startClientX;
      const dy = ev.clientY - s.startClientY;

      // Clamp within the immediate editor/content container.
      // The node view is translated, so approximate bounds based on original rects.
      const maxX = Math.max(0, s.containerRect.width - s.selfRect.width);
      const maxY = Math.max(0, s.containerRect.height - s.selfRect.height);

      const unclampedX = s.startX + dx;
      const unclampedY = s.startY + dy;

      s.nextX = clamp(unclampedX, 0, maxX);
      s.nextY = clamp(unclampedY, 0, maxY);

      if (s.raf == null) {
        s.raf = requestAnimationFrame(() => {
          const cur = dragStateRef.current;
          if (!cur) return;
          cur.raf = null;
          props.updateAttributes({ x: Math.round(cur.nextX), y: Math.round(cur.nextY) });
        });
      }
    },
    [props]
  );

  const startDrag = useCallback(
    (e: React.PointerEvent) => {
      if (!props.selected) return;
      // Left click / primary only.
      if (e.button !== 0) return;

      const wrapperEl = wrapperRef.current;
      if (!wrapperEl) return;
      const containerEl = wrapperEl.parentElement;
      if (!containerEl) return;

      e.preventDefault();
      e.stopPropagation();

      const containerRect = containerEl.getBoundingClientRect();
      const selfRect = wrapperEl.getBoundingClientRect();

      dragStateRef.current = {
        startClientX: e.clientX,
        startClientY: e.clientY,
        startX: x,
        startY: y,
        containerRect,
        selfRect,
        raf: null,
        nextX: x,
        nextY: y,
      };

      window.addEventListener('pointermove', onPointerMove);
      window.addEventListener('pointerup', onPointerUp);
      window.addEventListener('pointercancel', onPointerUp);
    },
    [onPointerMove, onPointerUp, props.selected, x, y]
  );

  const startResize = useCallback(
    (handle: ResizeHandle) =>
      (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();

        const wrapperEl = wrapperRef.current;
        const imgEl = imgRef.current;
        if (!wrapperEl || !imgEl) return;

        const containerEl = wrapperEl.parentElement;
        const containerWidthPx = containerEl?.getBoundingClientRect().width || wrapperEl.getBoundingClientRect().width;
        if (!containerWidthPx || containerWidthPx <= 0) return;

        const startX = e.clientX;
        const startY = e.clientY;
        const startRect = imgEl.getBoundingClientRect();
        const startWidthPx = startRect.width;
        const startHeightPx = startRect.height;

        const isLeft = handle === 'nw' || handle === 'sw' || handle === 'w';
        const isRight = handle === 'ne' || handle === 'se' || handle === 'e';
        const isTop = handle === 'nw' || handle === 'ne' || handle === 'n';
        const isBottom = handle === 'sw' || handle === 'se' || handle === 's';

        const onMove = (ev: MouseEvent) => {
          const dx = ev.clientX - startX;
          const dy = ev.clientY - startY;

          // Width driven resizing (primary). For corner handles, keep aspect ratio.
          let nextWidthPx = startWidthPx;
          if (isRight) nextWidthPx = startWidthPx + dx;
          if (isLeft) nextWidthPx = startWidthPx - dx;

          const keepAspect = handle === 'nw' || handle === 'ne' || handle === 'sw' || handle === 'se';
          if (keepAspect) {
            // Estimate via whichever delta is larger.
            const ratio = startWidthPx / Math.max(1, startHeightPx);
            const heightDrivenWidthPx = startWidthPx + (isBottom ? dy : -dy) * ratio;
            if (Math.abs(dy) > Math.abs(dx)) nextWidthPx = heightDrivenWidthPx;
          }

          const pct = clamp((nextWidthPx / containerWidthPx) * 100, 10, 100);
          props.updateAttributes({ width: `${Math.round(pct)}%` });
        };

        const onUp = () => {
          window.removeEventListener('mousemove', onMove);
          window.removeEventListener('mouseup', onUp);
        };

        window.addEventListener('mousemove', onMove);
        window.addEventListener('mouseup', onUp);
      },
    [props]
  );

  const Handle = ({ pos }: { pos: ResizeHandle }) => {
    const base =
      'absolute w-3 h-3 rounded-sm bg-white border border-slate-300 shadow-sm';

    const style: React.CSSProperties =
      pos === 'nw'
        ? { left: -6, top: -6, cursor: 'nwse-resize' }
        : pos === 'ne'
          ? { right: -6, top: -6, cursor: 'nesw-resize' }
          : pos === 'sw'
            ? { left: -6, bottom: -6, cursor: 'nesw-resize' }
            : pos === 'se'
              ? { right: -6, bottom: -6, cursor: 'nwse-resize' }
              : pos === 'n'
                ? { left: '50%', top: -6, transform: 'translateX(-50%)', cursor: 'ns-resize' }
                : pos === 's'
                  ? { left: '50%', bottom: -6, transform: 'translateX(-50%)', cursor: 'ns-resize' }
                  : pos === 'w'
                    ? { left: -6, top: '50%', transform: 'translateY(-50%)', cursor: 'ew-resize' }
                    : { right: -6, top: '50%', transform: 'translateY(-50%)', cursor: 'ew-resize' };

    return <div className={base} style={style} onMouseDown={startResize(pos)} />;
  };

  return (
    <NodeViewWrapper
      ref={wrapperRef}
      className="relative"
      data-align={align}
      data-width={width || undefined}
      data-x={x || undefined}
      data-y={y || undefined}
      style={wrapperStyle}
    >
      {/* Drag handle: lets users move the image within the document flow */}
      {props.selected ? (
        <div
          data-drag-handle
          contentEditable={false}
          className="absolute -left-3 -top-3 w-6 h-6 rounded-full bg-white border border-slate-200 shadow flex items-center justify-center cursor-grab"
          title="Drag to move"
        >
          <div className="w-3 h-3 rounded bg-slate-300" />
        </div>
      ) : null}

      <img
        ref={imgRef}
        src={attrs.src || ''}
        alt={attrs.alt || ''}
        title={attrs.title || ''}
        style={imgStyle}
        draggable={false}
        onPointerDown={startDrag}
      />

      {props.selected ? (
        <div
          className="pointer-events-none absolute inset-0 rounded"
          style={{ outline: '2px solid rgba(59, 130, 246, 0.65)', outlineOffset: 2 }}
        />
      ) : null}

      {props.selected ? (
        <>
          {/* Handles must receive pointer events */}
          <div className="absolute inset-0 pointer-events-none" />
          <div className="pointer-events-auto">
            <Handle pos="nw" />
            <Handle pos="ne" />
            <Handle pos="sw" />
            <Handle pos="se" />
            <Handle pos="n" />
            <Handle pos="s" />
            <Handle pos="w" />
            <Handle pos="e" />
          </div>
        </>
      ) : null}
    </NodeViewWrapper>
  );
}
