import type { RichTextDoc, RichTextNode } from '../types';

// Helpers for the rich-text documents of the issue description (ProseMirror JSON).

export const EMPTY_DOC: RichTextDoc = { type: 'doc', content: [{ type: 'paragraph' }] };

/** Largest document the backend accepts, in characters of JSON. */
export const MAX_RICH_TEXT_CHARS = 200_000;

const ALLOWED_NODES = new Set([
  'doc',
  'paragraph',
  'text',
  'hardBreak',
  'heading',
  'bulletList',
  'orderedList',
  'listItem',
  'taskList',
  'taskItem',
  'blockquote',
  'codeBlock',
  'horizontalRule',
  'image',
  'table',
  'tableRow',
  'tableCell',
  'tableHeader',
]);
const ALLOWED_MARKS = new Set(['bold', 'italic', 'underline', 'strike', 'code', 'link']);
const MAX_DEPTH = 24;

/** Links in the text may only be web or mail links; `javascript:` and `data:` never pass. */
export function isSafeLinkUrl(value: string): boolean {
  try {
    const { protocol } = new URL(value);
    return protocol === 'https:' || protocol === 'http:' || protocol === 'mailto:';
  } catch {
    return false;
  }
}

function visit(node: RichTextNode, depth: number, onNode: (node: RichTextNode) => void): void {
  if (depth > MAX_DEPTH) throw new Error('The text is nested too deeply.');
  onNode(node);
  for (const child of node.content ?? []) visit(child, depth + 1, onNode);
}

/**
 * What the backend does with a document it receives: only known nodes and marks, safe links,
 * a limited size. Returns an error message, or `null` when the document is fine.
 */
export function checkRichText(doc: unknown): string | null {
  if (typeof doc !== 'object' || doc === null || (doc as { type?: unknown }).type !== 'doc') return 'The text is not valid.';
  if (JSON.stringify(doc).length > MAX_RICH_TEXT_CHARS) return 'The text is too long.';
  try {
    visit(doc as RichTextNode, 0, (node) => {
      if (!ALLOWED_NODES.has(node.type)) throw new Error('The text contains something that is not allowed.');
      for (const mark of node.marks ?? []) {
        if (!ALLOWED_MARKS.has(mark.type)) throw new Error('The text contains something that is not allowed.');
        if (mark.type === 'link') {
          const href = mark.attrs?.href;
          if (typeof href !== 'string' || !isSafeLinkUrl(href)) throw new Error('A link in the text is not allowed.');
        }
      }
    });
  } catch (error) {
    return error instanceof Error ? error.message : 'The text is not valid.';
  }
  return null;
}

/** Ids of the attachments the document shows as images. */
export function collectImageIds(doc: RichTextDoc | null): string[] {
  const ids: string[] = [];
  if (!doc) return ids;
  visit(doc, 0, (node) => {
    const id = node.attrs?.attachmentId;
    if (node.type === 'image' && typeof id === 'string') ids.push(id);
  });
  return ids;
}

function mapNodes(node: RichTextNode, map: (node: RichTextNode) => RichTextNode | null): RichTextNode | null {
  const mapped = map(node);
  if (!mapped) return null;
  if (!mapped.content) return mapped;
  const content = mapped.content.flatMap((child) => {
    const next = mapNodes(child, map);
    return next ? [next] : [];
  });
  return { ...mapped, content };
}

/**
 * Document as stored -> document for the editor: every image gets the URL of its attachment as
 * `src`. An image whose attachment is unknown is dropped.
 */
export function withImageUrls(doc: RichTextDoc | null, urlById: ReadonlyMap<string, string>): RichTextDoc {
  if (!doc) return EMPTY_DOC;
  const result = mapNodes(doc, (node) => {
    if (node.type !== 'image') return node;
    const id = node.attrs?.attachmentId;
    const src = typeof id === 'string' ? urlById.get(id) : undefined;
    return src ? { ...node, attrs: { ...node.attrs, src } } : null;
  });
  return (result as RichTextDoc | null) ?? EMPTY_DOC;
}

/** Document from the editor -> document to store: images keep only their attachment id, never a URL. */
export function withoutImageUrls(doc: RichTextDoc): RichTextDoc {
  const result = mapNodes(doc, (node) => {
    if (node.type !== 'image') return node;
    const id = node.attrs?.attachmentId;
    if (typeof id !== 'string') return null;
    return { type: 'image', attrs: { attachmentId: id, alt: typeof node.attrs?.alt === 'string' ? node.attrs.alt : '' } };
  });
  return (result as RichTextDoc | null) ?? EMPTY_DOC;
}

/** True when the document has no text and no image (what the editor shows as empty). */
export function isEmptyDoc(doc: RichTextDoc | null): boolean {
  if (!doc) return true;
  let hasContent = false;
  visit(doc, 0, (node) => {
    if ((node.type === 'text' && (node.text ?? '').trim() !== '') || node.type === 'image' || node.type === 'table') {
      hasContent = true;
    }
  });
  return !hasContent;
}
