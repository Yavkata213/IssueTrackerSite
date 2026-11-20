// Issue page and side panel API: read one issue, change it, comment, attach files.
// Same rules as `settings.ts`: scoped by workspace and section, permission-checked per field,
// validated like the server will, and `ApiError` is thrown for refusals.

import type {
  ActivityEntry,
  Attachment,
  IssueComment,
  IssueDetailData,
  IssuePatch,
  Priority,
  User,
} from '../types';
import { checkAttachmentFile } from '../utils/attachments';
import { LIMITS } from '../utils/limits';
import { PERMISSION } from '../utils/permissions';
import { checkRichText, collectImageIds } from '../utils/richText';
import { ApiError } from './errors';
import { cleanText, clone, findSectionByKey, permissionsOf, requirePermission, requireSection } from './internal';
import { categories, CURRENT_USER_ID, issueRecords, sectionMembers, statuses, users } from './mockData';
import type { IssueRecord } from './mockData';
import { assignmentEvents, attachmentRecords, commentRecords } from './mockIssueData';
import type { AttachmentRecord } from './mockIssueData';

const ISSUE_KEY = /^([A-Za-z]{2,5})-(\d{1,9})$/;
const PRIORITIES: Priority[] = ['NONE', 'LOW', 'MEDIUM', 'HIGH', 'URGENT'];
const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

function userOf(userId: string | null): User | null {
  return userId ? (users.find((u) => u.id === userId) ?? null) : null;
}

function findRecord(workspaceId: string, sectionId: string, issueId: string): IssueRecord {
  const record = issueRecords.find(
    (r) => r.issue.id === issueId && r.issue.sectionId === sectionId && r.issue.workspaceId === workspaceId,
  );
  if (!record) throw new ApiError('NOT_FOUND', 'Issue not found.');
  return record;
}

// ---- Attachment files -----------------------------------------------

/** Makes a picture for a seed image: the mock has no real files. */
function drawSeedImage(): Promise<Blob> {
  const canvas = document.createElement('canvas');
  canvas.width = 480;
  canvas.height = 270;
  const context = canvas.getContext('2d');
  if (context) {
    context.fillStyle = '#E3F2FD';
    context.fillRect(0, 0, 480, 270);
    context.fillStyle = '#FFE082';
    context.beginPath();
    context.arc(380, 60, 22, 0, Math.PI * 2);
    context.fill();
    context.fillStyle = '#90CAF9';
    context.beginPath();
    context.moveTo(0, 270);
    context.lineTo(120, 110);
    context.lineTo(220, 200);
    context.lineTo(300, 60);
    context.lineTo(480, 270);
    context.closePath();
    context.fill();
    context.fillStyle = '#64B5F6';
    context.beginPath();
    context.moveTo(0, 270);
    context.lineTo(140, 180);
    context.lineTo(260, 230);
    context.lineTo(420, 160);
    context.lineTo(480, 270);
    context.closePath();
    context.fill();
  }
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error('Could not draw the picture.'))), 'image/png');
  });
}

/** The URL a file is downloaded from. The real backend answers with a short-lived signed URL. */
async function downloadUrlOf(record: AttachmentRecord): Promise<string> {
  if (record.url) return record.url;
  let blob = record.file;
  if (!blob && record.seed === 'image') blob = await drawSeedImage();
  if (!blob) blob = new Blob(['%PDF-1.4\n% sample file for the mock backend\n'], { type: 'application/pdf' });
  record.url = URL.createObjectURL(blob);
  return record.url;
}

async function toAttachment(record: AttachmentRecord): Promise<Attachment> {
  return { ...record.attachment, downloadUrl: await downloadUrlOf(record) };
}

// ---- Read -----------------------------------------------------------

async function buildDetail(workspaceId: string, record: IssueRecord): Promise<IssueDetailData> {
  const { issue } = record;
  const section = requireSection(workspaceId, issue.sectionId);

  const memberIds = new Set(sectionMembers.filter((m) => m.sectionId === section.id).map((m) => m.userId));
  const assignableUsers = users
    .filter((u) => memberIds.has(u.id) || record.assigneeIds.includes(u.id))
    .sort((a, b) => a.displayName.localeCompare(b.displayName));

  const comments: IssueComment[] = commentRecords
    .filter((c) => c.issueId === issue.id)
    .sort((a, b) => Date.parse(a.createdAt) - Date.parse(b.createdAt))
    .map((c) => ({
      id: c.id,
      issueId: c.issueId,
      author: userOf(c.authorId),
      parentCommentId: c.parentCommentId,
      body: c.body,
      createdAt: c.createdAt,
      editedAt: c.editedAt,
    }));

  const activity: ActivityEntry[] = assignmentEvents
    .filter((e) => e.issueId === issue.id)
    .sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt))
    .flatMap((e) => {
      const user = userOf(e.userId);
      return user ? [{ id: e.id, event: e.event, user, actor: userOf(e.actorId), createdAt: e.createdAt }] : [];
    });

  const attachments = await Promise.all(
    attachmentRecords.filter((a) => a.attachment.issueId === issue.id).map(toAttachment),
  );

  return clone({
    issue,
    section,
    permissions: permissionsOf(section.id),
    statuses: statuses.filter((s) => s.sectionId === section.id).sort((a, b) => a.position - b.position),
    categories: categories.filter(
      (c) => c.sectionId === section.id && (!c.isArchived || record.categoryIds.includes(c.id)),
    ),
    categoryIds: record.categoryIds,
    assignableUsers,
    assigneeIds: record.assigneeIds,
    createdBy: userOf(issue.createdBy),
    attachments,
    comments,
    activity,
  });
}

/**
 * GET /workspaces/{workspaceId}/issues/by-key/{issueKey}   (e.g. `IT-142`)
 * Returns `null` when there is no such issue. An old section key still finds the issue.
 */
export async function getIssueDetail(workspaceId: string, issueKey: string): Promise<IssueDetailData | null> {
  const match = ISSUE_KEY.exec(issueKey);
  if (!match) return null;
  const section = findSectionByKey(workspaceId, match[1]);
  if (!section) return null;
  const number = Number(match[2]);
  const record = issueRecords.find((r) => r.issue.sectionId === section.id && r.issue.number === number);
  return record ? buildDetail(workspaceId, record) : null;
}

// ---- Write ----------------------------------------------------------

function idsEqual(a: readonly string[], b: readonly string[]): boolean {
  return a.length === b.length && a.every((id) => b.includes(id));
}

/**
 * PATCH /workspaces/{workspaceId}/sections/{sectionId}/issues/{issueId}
 * Writes only the fields that are given. `issue.edit` is needed for title, text, priority,
 * categories, effort and due date; `issue.move` for the status; `issue.assign.others` (or
 * `issue.assign.self` when only the user themself is added or removed) for the assignees.
 * Returns the issue as the page shows it.
 */
export async function updateIssue(
  workspaceId: string,
  sectionId: string,
  issueId: string,
  patch: IssuePatch,
): Promise<IssueDetailData> {
  requireSection(workspaceId, sectionId);
  const record = findRecord(workspaceId, sectionId, issueId);
  const { issue } = record;
  const granted = permissionsOf(sectionId);

  const editsContent =
    patch.title !== undefined ||
    patch.description !== undefined ||
    patch.priority !== undefined ||
    patch.categoryIds !== undefined ||
    patch.effortHours !== undefined ||
    patch.dueDate !== undefined;
  if (editsContent) requirePermission(sectionId, PERMISSION.issueEdit);
  if (patch.statusId !== undefined) requirePermission(sectionId, PERMISSION.issueMove);

  // Validate everything before anything is written.
  const title = patch.title === undefined ? undefined : cleanText(patch.title, 'Title', LIMITS.issueTitle, true, 'title');
  if (patch.description) {
    const problem = checkRichText(patch.description);
    if (problem) throw new ApiError('VALIDATION', problem, 'description');
    const ownImages = new Set(
      attachmentRecords.filter((a) => a.attachment.issueId === issueId).map((a) => a.attachment.id),
    );
    if (collectImageIds(patch.description).some((id) => !ownImages.has(id))) {
      throw new ApiError('VALIDATION', 'The text refers to a picture that does not belong to this issue.', 'description');
    }
  }
  if (patch.statusId !== undefined && !statuses.some((s) => s.id === patch.statusId && s.sectionId === sectionId)) {
    throw new ApiError('VALIDATION', 'Unknown status.', 'statusId');
  }
  if (patch.priority !== undefined && !PRIORITIES.includes(patch.priority)) {
    throw new ApiError('VALIDATION', 'Unknown priority.', 'priority');
  }
  if (patch.categoryIds !== undefined) {
    const own = categories.filter((c) => c.sectionId === sectionId).map((c) => c.id);
    if (patch.categoryIds.some((id) => !own.includes(id))) throw new ApiError('VALIDATION', 'Unknown category.', 'categoryIds');
  }
  if (patch.effortHours !== undefined && patch.effortHours !== null) {
    if (!Number.isFinite(patch.effortHours) || patch.effortHours < 0 || patch.effortHours > LIMITS.effortHoursMax) {
      throw new ApiError('VALIDATION', `Effort must be between 0 and ${LIMITS.effortHoursMax} hours.`, 'effortHours');
    }
  }
  if (patch.dueDate !== undefined && patch.dueDate !== null) {
    if (!ISO_DATE.test(patch.dueDate) || Number.isNaN(Date.parse(patch.dueDate))) {
      throw new ApiError('VALIDATION', 'The due date is not valid.', 'dueDate');
    }
  }
  let assigneeIds: string[] | undefined;
  if (patch.assigneeIds !== undefined) {
    assigneeIds = [...new Set(patch.assigneeIds)];
    const members = new Set(sectionMembers.filter((m) => m.sectionId === sectionId).map((m) => m.userId));
    if (assigneeIds.some((id) => !members.has(id) && !record.assigneeIds.includes(id))) {
      throw new ApiError('VALIDATION', 'Only members of the section can be assigned.', 'assigneeIds');
    }
    const added = assigneeIds.filter((id) => !record.assigneeIds.includes(id));
    const removed = record.assigneeIds.filter((id) => !assigneeIds?.includes(id));
    const changed = [...added, ...removed];
    const onlySelf = changed.every((id) => id === CURRENT_USER_ID);
    if (
      changed.length > 0 &&
      !granted.includes(PERMISSION.issueAssignOthers) &&
      !(onlySelf && granted.includes(PERMISSION.issueAssignSelf))
    ) {
      throw new ApiError('FORBIDDEN', 'You do not have permission to do this.');
    }
  }

  // Write.
  if (title !== undefined) issue.title = title;
  if (patch.description !== undefined) {
    issue.description = patch.description;
    // Pictures that the text no longer shows are removed with it.
    const used = new Set(collectImageIds(patch.description));
    for (let i = attachmentRecords.length - 1; i >= 0; i -= 1) {
      const { attachment } = attachmentRecords[i];
      if (attachment.issueId === issueId && attachment.isInline && !used.has(attachment.id)) {
        attachmentRecords.splice(i, 1);
      }
    }
  }
  if (patch.priority !== undefined) issue.priority = patch.priority;
  if (patch.effortHours !== undefined) issue.effortHours = patch.effortHours;
  if (patch.dueDate !== undefined) issue.dueDate = patch.dueDate;
  if (patch.categoryIds !== undefined && !idsEqual(record.categoryIds, patch.categoryIds)) {
    record.categoryIds = [...new Set(patch.categoryIds)];
  }
  if (patch.statusId !== undefined && patch.statusId !== issue.statusId) {
    const positions = issueRecords
      .filter((r) => r.issue.statusId === patch.statusId)
      .map((r) => r.issue.boardPosition);
    issue.statusId = patch.statusId;
    issue.boardPosition = (positions.length > 0 ? Math.max(...positions) : 0) + 1000;
  }
  if (assigneeIds !== undefined) {
    for (const id of assigneeIds.filter((u) => !record.assigneeIds.includes(u))) {
      assignmentEvents.push({
        id: crypto.randomUUID(),
        workspaceId,
        issueId,
        userId: id,
        actorId: CURRENT_USER_ID,
        event: 'ASSIGNED',
        createdAt: new Date().toISOString(),
      });
    }
    for (const id of record.assigneeIds.filter((u) => !assigneeIds?.includes(u))) {
      assignmentEvents.push({
        id: crypto.randomUUID(),
        workspaceId,
        issueId,
        userId: id,
        actorId: CURRENT_USER_ID,
        event: 'UNASSIGNED',
        createdAt: new Date().toISOString(),
      });
    }
    record.assigneeIds = assigneeIds;
  }
  issue.updatedAt = new Date().toISOString();
  return buildDetail(workspaceId, record);
}

/**
 * PUT or DELETE /workspaces/{workspaceId}/sections/{sectionId}/issues/{issueId}/completion
 * "Mark as complete" / "Reopen": only the done flag changes, never the status. Needs `issue.move`.
 */
export async function setIssueCompleted(
  workspaceId: string,
  sectionId: string,
  issueId: string,
  completed: boolean,
): Promise<IssueDetailData> {
  requireSection(workspaceId, sectionId);
  requirePermission(sectionId, PERMISSION.issueMove);
  const record = findRecord(workspaceId, sectionId, issueId);
  record.issue.completedAt = completed ? new Date().toISOString() : null;
  record.issue.completedBy = completed ? CURRENT_USER_ID : null;
  record.issue.updatedAt = new Date().toISOString();
  return buildDetail(workspaceId, record);
}

// ---- Comments -------------------------------------------------------

export interface CommentInput {
  body: string;
  /** The comment this one answers. Replies to a reply go under the same comment. */
  parentCommentId: string | null;
}

/** POST /workspaces/{workspaceId}/sections/{sectionId}/issues/{issueId}/comments. Needs `issue.comment`. */
export async function addComment(
  workspaceId: string,
  sectionId: string,
  issueId: string,
  input: CommentInput,
): Promise<IssueComment> {
  requireSection(workspaceId, sectionId);
  requirePermission(sectionId, PERMISSION.issueComment);
  findRecord(workspaceId, sectionId, issueId);
  const body = cleanText(input.body, 'Comment', LIMITS.commentBody, true, 'body');

  let parentId: string | null = null;
  if (input.parentCommentId !== null) {
    const parent = commentRecords.find((c) => c.id === input.parentCommentId && c.issueId === issueId);
    if (!parent) throw new ApiError('NOT_FOUND', 'The comment you answer no longer exists.');
    parentId = parent.parentCommentId ?? parent.id;
  }
  const record = {
    id: crypto.randomUUID(),
    workspaceId,
    issueId,
    authorId: CURRENT_USER_ID,
    parentCommentId: parentId,
    body,
    createdAt: new Date().toISOString(),
    editedAt: null,
  };
  commentRecords.push(record);
  return clone({ ...record, author: userOf(CURRENT_USER_ID) });
}

// ---- Attachments ----------------------------------------------------

/**
 * POST /workspaces/{workspaceId}/sections/{sectionId}/issues/{issueId}/attachments   (multipart)
 * Needs `issue.edit`. `inline` is for a picture that goes into the text. The real endpoint also
 * checks the real content of the file, not only the type the browser reports.
 */
export async function uploadAttachment(
  workspaceId: string,
  sectionId: string,
  issueId: string,
  file: File,
  inline: boolean,
): Promise<Attachment> {
  requireSection(workspaceId, sectionId);
  requirePermission(sectionId, PERMISSION.issueEdit);
  findRecord(workspaceId, sectionId, issueId);
  const problem = checkAttachmentFile(file, inline);
  if (problem) throw new ApiError('VALIDATION', problem, 'file');

  const record: AttachmentRecord = {
    attachment: {
      id: crypto.randomUUID(),
      workspaceId,
      issueId,
      uploadedBy: CURRENT_USER_ID,
      fileName: file.name.slice(0, 200),
      contentType: file.type,
      sizeBytes: file.size,
      isInline: inline,
      createdAt: new Date().toISOString(),
    },
    file,
    seed: null,
    url: null,
  };
  attachmentRecords.push(record);
  return clone(await toAttachment(record));
}

/**
 * DELETE /workspaces/{workspaceId}/sections/{sectionId}/issues/{issueId}/attachments/{attachmentId}
 * Needs `issue.edit`. For files shown as cards; pictures in the text go away with the text.
 */
export async function deleteAttachment(
  workspaceId: string,
  sectionId: string,
  issueId: string,
  attachmentId: string,
): Promise<void> {
  requireSection(workspaceId, sectionId);
  requirePermission(sectionId, PERMISSION.issueEdit);
  findRecord(workspaceId, sectionId, issueId);
  const index = attachmentRecords.findIndex(
    (a) => a.attachment.id === attachmentId && a.attachment.issueId === issueId && !a.attachment.isInline,
  );
  if (index < 0) throw new ApiError('NOT_FOUND', 'File not found.');
  attachmentRecords.splice(index, 1);
}
