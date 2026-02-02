import Image from '@tiptap/extension-image';
import { mergeAttributes } from '@tiptap/core';

export type ImageAlign = 'left' | 'center' | 'right';

export const ResizableImageExtension = Image.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
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
    const align = (HTMLAttributes as any)?.align as ImageAlign | undefined;
    const width = (HTMLAttributes as any)?.width as string | undefined;

    const baseStyleParts: string[] = ['max-width: 100%', 'height: auto', 'display: block'];
    if (width) baseStyleParts.push(`width: ${width}`);

    // Align via margins (works for block images)
    const a = align || 'center';
    if (a === 'left') baseStyleParts.push('margin-left: 0', 'margin-right: auto');
    if (a === 'right') baseStyleParts.push('margin-left: auto', 'margin-right: 0');
    if (a === 'center') baseStyleParts.push('margin-left: auto', 'margin-right: auto');

    // Keep vertical rhythm
    baseStyleParts.push('margin-top: 0.75rem', 'margin-bottom: 0.75rem');

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
