import Image from '@tiptap/extension-image';
import { mergeAttributes } from '@tiptap/core';
import { ReactNodeViewRenderer } from '@tiptap/react';

import ResizableImageNodeView from './ResizableImageNodeView';

export type ImageAlign = 'left' | 'center' | 'right';

export const ResizableImageExtension = Image.extend({
  draggable: true,

  addAttributes() {
    return {
      ...this.parent?.(),
      x: {
        default: 0,
        parseHTML: (element) => {
          const raw = element.getAttribute('data-x');
          const n = raw == null ? 0 : Number(raw);
          return Number.isFinite(n) ? n : 0;
        },
        renderHTML: (attributes) =>
          typeof attributes.x === 'number' && attributes.x !== 0
            ? { 'data-x': String(attributes.x) }
            : {},
      },
      y: {
        default: 0,
        parseHTML: (element) => {
          const raw = element.getAttribute('data-y');
          const n = raw == null ? 0 : Number(raw);
          return Number.isFinite(n) ? n : 0;
        },
        renderHTML: (attributes) =>
          typeof attributes.y === 'number' && attributes.y !== 0
            ? { 'data-y': String(attributes.y) }
            : {},
      },
      width: {
        default: null,
        parseHTML: (element) => element.getAttribute('data-width') || null,
        renderHTML: (attributes) => (attributes.width ? { 'data-width': attributes.width } : {}),
      },
      align: {
        default: 'center',
        parseHTML: (element) => (element.getAttribute('data-align') as ImageAlign) || 'center',
        renderHTML: (attributes) => (attributes.align ? { 'data-align': attributes.align } : {}),
      },
    };
  },

  renderHTML({ HTMLAttributes }) {
    const align = (HTMLAttributes as { align?: ImageAlign })?.align;
    const width = (HTMLAttributes as { width?: string })?.width;
    const x = (HTMLAttributes as { x?: number })?.x;
    const y = (HTMLAttributes as { y?: number })?.y;

    const baseStyleParts: string[] = ['max-width: 100%', 'height: auto', 'display: block'];
    if (width) baseStyleParts.push(`width: ${width}`);

    // Align via margins (works for block images)
    const a = align || 'center';
    if (a === 'left') baseStyleParts.push('margin-left: 0', 'margin-right: auto');
    if (a === 'right') baseStyleParts.push('margin-left: auto', 'margin-right: 0');
    if (a === 'center') baseStyleParts.push('margin-left: auto', 'margin-right: auto');

    // Keep vertical rhythm
    baseStyleParts.push('margin-top: 0.75rem', 'margin-bottom: 0.75rem');

    // Optional positional offset (used by our drag UX).
    if (typeof x === 'number' && typeof y === 'number' && (x !== 0 || y !== 0)) {
      baseStyleParts.push(`transform: translate(${Math.round(x)}px, ${Math.round(y)}px)`);
      baseStyleParts.push('will-change: transform');
    }

    const style = baseStyleParts.join('; ');

    return [
      'img',
      mergeAttributes(
        this.options.HTMLAttributes,
        HTMLAttributes,
        {
          style,
        }
      ),
    ];
  },

  addNodeView() {
    return ReactNodeViewRenderer(ResizableImageNodeView);
  },

  addCommands() {
    return {
      ...this.parent?.(),
      setImageWidth:
        (width: string | null) =>
        ({ commands }) =>
          commands.updateAttributes(this.name, { width }),
      setImageAlign:
        (align: ImageAlign) =>
        ({ commands }) =>
          commands.updateAttributes(this.name, { align }),
    };
  },
});

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    resizableImage: {
      setImageWidth: (width: string | null) => ReturnType;
      setImageAlign: (align: ImageAlign) => ReturnType;
    };
  }
}
