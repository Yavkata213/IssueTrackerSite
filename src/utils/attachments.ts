// What may be attached to an issue. The backend checks the same rules again (and sniffs the real
// content type); the UI uses them to refuse a file before it is uploaded.

export const MAX_ATTACHMENT_BYTES = 10 * 1024 * 1024;

/** Images that may be shown inside the description. SVG is left out on purpose: it can carry script. */
export const IMAGE_TYPES = ['image/png', 'image/jpeg', 'image/gif', 'image/webp'] as const;

interface FileKind {
  /** Short badge text on the file card. */
  badge: string;
  /** What the second line of the card says: "PDF document". */
  label: string;
  tone: 'error' | 'info' | 'primary' | 'success' | 'neutral';
}

const FILE_KINDS: Record<string, FileKind> = {
  'application/pdf': { badge: 'PDF', label: 'PDF document', tone: 'error' },
  'application/msword': { badge: 'DOC', label: 'Word document', tone: 'primary' },
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': { badge: 'DOC', label: 'Word document', tone: 'primary' },
  'application/vnd.ms-excel': { badge: 'XLS', label: 'Excel spreadsheet', tone: 'success' },
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': { badge: 'XLS', label: 'Excel spreadsheet', tone: 'success' },
  'application/vnd.ms-powerpoint': { badge: 'PPT', label: 'PowerPoint presentation', tone: 'error' },
  'application/vnd.openxmlformats-officedocument.presentationml.presentation': { badge: 'PPT', label: 'PowerPoint presentation', tone: 'error' },
  'text/plain': { badge: 'TXT', label: 'Text file', tone: 'neutral' },
  'text/csv': { badge: 'CSV', label: 'CSV file', tone: 'success' },
  'application/zip': { badge: 'ZIP', label: 'ZIP archive', tone: 'neutral' },
  'image/png': { badge: 'IMG', label: 'PNG image', tone: 'info' },
  'image/jpeg': { badge: 'IMG', label: 'JPEG image', tone: 'info' },
  'image/gif': { badge: 'IMG', label: 'GIF image', tone: 'info' },
  'image/webp': { badge: 'IMG', label: 'WebP image', tone: 'info' },
};

export const ALLOWED_ATTACHMENT_TYPES: string[] = Object.keys(FILE_KINDS);

export function describeFile(contentType: string): FileKind {
  return FILE_KINDS[contentType] ?? { badge: 'FILE', label: 'File', tone: 'neutral' };
}

export function isImageType(contentType: string): boolean {
  return (IMAGE_TYPES as readonly string[]).includes(contentType);
}

/** "1.2 MB", "340 KB", "12 B". */
export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/** Why a file cannot be attached, or `null` when it can. */
export function checkAttachmentFile(file: { name: string; type: string; size: number }, inline = false): string | null {
  if (file.size === 0) return `${file.name} is empty.`;
  if (file.size > MAX_ATTACHMENT_BYTES) return `${file.name} is larger than 10 MB.`;
  if (inline && !isImageType(file.type)) return 'Only PNG, JPG, GIF or WebP images can be placed in the text.';
  if (!ALLOWED_ATTACHMENT_TYPES.includes(file.type)) return `${file.name}: this type of file cannot be attached.`;
  return null;
}
