'use client';

import DOMPurify from 'dompurify';

// Sanitizes rich-text HTML before persisting or rendering.
// We allow inline styles (needed for color/font/size) but forbid dangerous tags.
export function sanitizeEditorHtml(html: string): string {
  const dirty = String(html || '');

  return DOMPurify.sanitize(dirty, {
    USE_PROFILES: { html: true },
    ADD_TAGS: ['img'],
    ADD_ATTR: [
      'style',
      'target',
      'rel',
      'src',
      'alt',
      'title',
      'width',
      'height',
      'class',
      'data-width',
      'data-align',
      'data-x',
      'data-y',
    ],
    ADD_DATA_URI_TAGS: ['img'],
    FORBID_TAGS: ['script', 'style', 'iframe', 'object', 'embed', 'link', 'meta'],
    FORBID_ATTR: ['onerror', 'onclick', 'onload', 'onmouseover'],
  });
}
