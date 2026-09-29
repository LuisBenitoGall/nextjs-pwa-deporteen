/**
 * Saneado HTML para textos legales (i18n controlado).
 * Usa sanitize-html en Node y navegador — evita isomorphic-dompurify/jsdom
 * que en Next 15 SSR falla con ENOENT en default-stylesheet.css.
 */
import sanitizeHtml from 'sanitize-html';

const LEGAL_SANITIZE_OPTIONS: sanitizeHtml.IOptions = {
  allowedTags: [
    ...sanitizeHtml.defaults.allowedTags,
    'h1',
    'h2',
    'h3',
    'h4',
    'img',
  ],
  allowedAttributes: {
    ...sanitizeHtml.defaults.allowedAttributes,
    a: ['href', 'name', 'target', 'rel', 'class', 'id'],
    div: ['class', 'id'],
    section: ['class', 'id'],
    p: ['class', 'id'],
    span: ['class', 'id'],
    ul: ['class', 'id'],
    ol: ['class', 'id'],
    li: ['class', 'id'],
    h1: ['class', 'id'],
    h2: ['class', 'id'],
    h3: ['class', 'id'],
    h4: ['class', 'id'],
    b: ['class'],
    i: ['class'],
    strong: ['class'],
    em: ['class'],
    br: [],
  },
  allowedSchemes: ['http', 'https', 'mailto'],
};

export function sanitizeLegalHtml(html: string): string {
  return sanitizeHtml(html, LEGAL_SANITIZE_OPTIONS);
}
