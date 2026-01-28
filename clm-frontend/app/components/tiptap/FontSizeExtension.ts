import { Extension } from '@tiptap/core';

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    fontSize: {
      setFontSize: (fontSize: string) => ReturnType;
      unsetFontSize: () => ReturnType;
    };
  }
}

export const FontSizeExtension = Extension.create({
  name: 'fontSize',

  addOptions() {
    return {
      types: ['textStyle'],
    };
  },

  addGlobalAttributes() {
    return [
      {
        types: this.options.types,
        attributes: {
          fontSize: {
            default: null,
            parseHTML: (element) => {
              const size = (element as HTMLElement).style.fontSize;
              if (!size) return null;
              const m = size.match(/(\d+(?:\.\d+)?)px/);
              if (!m) return null;
              return Number(m[1]);
            },
            renderHTML: (attributes) => {
              if (!attributes.fontSize) return {};
              const size = Number(attributes.fontSize);
              if (!Number.isFinite(size) || size <= 0) return {};
              return { style: `font-size: ${size}px` };
            },
          },
        },
      },
    ];
  },

  addCommands() {
    return {
      setFontSize:
        (fontSize) =>
        ({ chain }) => {
          const n = Number(fontSize);
          if (!Number.isFinite(n) || n <= 0) return false;
          return chain().setMark('textStyle', { fontSize: n }).run();
        },
      unsetFontSize:
        () =>
        ({ chain }) => {
          return chain().setMark('textStyle', { fontSize: null }).run();
        },
    };
  },
});
