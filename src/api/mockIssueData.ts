import type { Attachment, RichTextDoc } from '../types';
import { issueRecords } from './mockData';

// In-memory stand-ins for the issue tables the board does not need: comments, attachments and
// the assignment history. Kept apart from `mockData.ts` so that file stays about the workspace.

const NOW = Date.now();

function minutesAgo(minutes: number): string {
  return new Date(NOW - minutes * 60 * 1000).toISOString();
}

export interface AttachmentRecord {
  attachment: Omit<Attachment, 'downloadUrl'>;
  /** The uploaded file, kept in memory. The real backend keeps it in object storage. */
  file: Blob | null;
  /** Seed files have no real bytes: a picture or a PDF is made when it is first asked for. */
  seed: 'pdf' | 'image' | null;
  /** Object URL handed out as the download URL. */
  url: string | null;
}

export interface CommentRecord {
  id: string;
  workspaceId: string;
  issueId: string;
  authorId: string | null;
  parentCommentId: string | null;
  body: string;
  createdAt: string;
  editedAt: string | null;
}

export interface AssignmentEventRecord {
  id: string;
  workspaceId: string;
  issueId: string;
  userId: string;
  actorId: string | null;
  event: 'ASSIGNED' | 'UNASSIGNED';
  createdAt: string;
}

const SEED_ISSUE_ID = 'issue-it-148';

const PDF_ID = 'att-it148-layout';
const IMAGE_ID = 'att-it148-image';

export const attachmentRecords: AttachmentRecord[] = [
  {
    attachment: {
      id: PDF_ID,
      workspaceId: 'ws-acme',
      issueId: SEED_ISSUE_ID,
      uploadedBy: 'user-maria',
      fileName: 'desk-14B-layout.pdf',
      contentType: 'application/pdf',
      sizeBytes: 1258291,
      isInline: false,
      createdAt: minutesAgo(60 * 24 * 12),
    },
    file: null,
    seed: 'pdf',
    url: null,
  },
  {
    attachment: {
      id: IMAGE_ID,
      workspaceId: 'ws-acme',
      issueId: SEED_ISSUE_ID,
      uploadedBy: 'user-maria',
      fileName: 'desk-14B.png',
      contentType: 'image/png',
      sizeBytes: 86016,
      isInline: true,
      createdAt: minutesAgo(60 * 24 * 12),
    },
    file: null,
    seed: 'image',
    url: null,
  },
];

function text(value: string): { type: 'text'; text: string } {
  return { type: 'text', text: value };
}

const seedDescription: RichTextDoc = {
  type: 'doc',
  content: [
    {
      type: 'paragraph',
      content: [
        text('Hi team, our new hire Daniel starts on Monday and needs a second monitor and a docking station at desk 14B.'),
        { type: 'hardBreak' },
        text('His laptop is the same model as Elena’s from the Design team, so the same dock should work.'),
      ],
    },
    { type: 'heading', attrs: { level: 2 }, content: [text('What we need')] },
    {
      type: 'bulletList',
      content: [
        { type: 'listItem', content: [{ type: 'paragraph', content: [text('27-inch monitor with an HDMI or DisplayPort input')] }] },
        { type: 'listItem', content: [{ type: 'paragraph', content: [text('USB-C docking station with power delivery')] }] },
        { type: 'listItem', content: [{ type: 'paragraph', content: [text('Two display cables and a spare power cable')] }] },
      ],
    },
    { type: 'image', attrs: { attachmentId: IMAGE_ID, alt: 'Desk 14B' } },
    { type: 'paragraph' },
  ],
};

const seeded = issueRecords.find((r) => r.issue.id === SEED_ISSUE_ID);
if (seeded) seeded.issue.description = seedDescription;

export const commentRecords: CommentRecord[] = [
  {
    id: 'cmt-it148-1',
    workspaceId: 'ws-acme',
    issueId: SEED_ISSUE_ID,
    authorId: 'user-anton',
    parentCommentId: null,
    body: 'Ordered the monitor and the dock. Delivery is expected on Thursday.',
    createdAt: minutesAgo(60),
    editedAt: null,
  },
  {
    id: 'cmt-it148-2',
    workspaceId: 'ws-acme',
    issueId: SEED_ISSUE_ID,
    authorId: 'user-maria',
    parentCommentId: null,
    body: 'Thanks! I will set up the accounts before Monday.',
    createdAt: minutesAgo(5),
    editedAt: null,
  },
];

export const assignmentEvents: AssignmentEventRecord[] = [
  {
    id: 'evt-it148-1',
    workspaceId: 'ws-acme',
    issueId: SEED_ISSUE_ID,
    userId: 'user-anton',
    actorId: 'user-maria',
    event: 'ASSIGNED',
    createdAt: minutesAgo(60 * 24 * 18),
  },
  {
    id: 'evt-it148-2',
    workspaceId: 'ws-acme',
    issueId: SEED_ISSUE_ID,
    userId: 'user-maria',
    actorId: 'user-anton',
    event: 'ASSIGNED',
    createdAt: minutesAgo(5),
  },
];
