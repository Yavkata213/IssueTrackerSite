import { useCallback, useEffect, useState } from 'react';
import {
  addComment,
  deleteAttachment,
  getErrorMessage,
  getIssueDetail,
  setIssueCompleted,
  updateIssue,
  uploadAttachment,
} from '../../api';
import type { Attachment, IssueDetailData, IssuePatch } from '../../types';

/** What a page shows locally while a change is on its way to the server. */
function applyPatch(data: IssueDetailData, patch: IssuePatch): IssueDetailData {
  const { issue } = data;
  return {
    ...data,
    issue: {
      ...issue,
      ...(patch.title !== undefined && { title: patch.title }),
      ...(patch.description !== undefined && { description: patch.description }),
      ...(patch.statusId !== undefined && { statusId: patch.statusId }),
      ...(patch.priority !== undefined && { priority: patch.priority }),
      ...(patch.effortHours !== undefined && { effortHours: patch.effortHours }),
      ...(patch.dueDate !== undefined && { dueDate: patch.dueDate }),
    },
    categoryIds: patch.categoryIds ?? data.categoryIds,
    assigneeIds: patch.assigneeIds ?? data.assigneeIds,
  };
}

export interface IssueActions {
  /** Saves some fields. The page changes at once; a refused change is rolled back with a message. */
  patch: (patch: IssuePatch) => void;
  toggleComplete: () => void;
  addComment: (body: string, parentCommentId: string | null) => Promise<boolean>;
  upload: (file: File, inline: boolean) => Promise<Attachment>;
  removeAttachment: (attachmentId: string) => void;
}

/**
 * Loads one issue and offers the changes the issue page and the side panel make. Both views use
 * it, so they behave the same. `onChanged` tells the board behind the panel what the server now has.
 */
export function useIssueDetail(
  workspaceId: string,
  issueKey: string,
  onChanged?: (detail: IssueDetailData) => void,
) {
  const [data, setData] = useState<IssueDetailData | null | undefined>(undefined);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    getIssueDetail(workspaceId, issueKey)
      .then((result) => {
        if (!cancelled) setData(result);
      })
      .catch((error: unknown) => {
        if (!cancelled) setLoadError(getErrorMessage(error));
      });
    return () => {
      cancelled = true;
    };
  }, [workspaceId, issueKey, attempt]);

  const retry = useCallback(() => {
    setLoadError(null);
    setAttempt((value) => value + 1);
  }, []);

  /** A write was refused: tell the user and show what the server really has. */
  const failed = useCallback(
    (error: unknown) => {
      setNotice(getErrorMessage(error));
      getIssueDetail(workspaceId, issueKey)
        .then((fresh) => {
          if (fresh) setData(fresh);
        })
        .catch(() => undefined);
    },
    [workspaceId, issueKey],
  );

  /** Takes what only the server knows (history, files, update time) and keeps the local fields. */
  const merge = useCallback(
    (fresh: IssueDetailData) => {
      setData((current) =>
        current
          ? {
              ...current,
              issue: { ...current.issue, updatedAt: fresh.issue.updatedAt, boardPosition: fresh.issue.boardPosition, completedAt: fresh.issue.completedAt, completedBy: fresh.issue.completedBy },
              activity: fresh.activity,
              attachments: fresh.attachments,
            }
          : current,
      );
      onChanged?.(fresh);
    },
    [onChanged],
  );

  const patch = useCallback(
    (change: IssuePatch) => {
      if (!data) return;
      const { issue } = data;
      setData((current) => (current ? applyPatch(current, change) : current));
      updateIssue(workspaceId, issue.sectionId, issue.id, change).then(merge).catch(failed);
    },
    [data, workspaceId, merge, failed],
  );

  const toggleComplete = useCallback(() => {
    if (!data) return;
    const { issue } = data;
    setIssueCompleted(workspaceId, issue.sectionId, issue.id, issue.completedAt === null)
      .then((fresh) => {
        setData(fresh);
        onChanged?.(fresh);
      })
      .catch(failed);
  }, [data, workspaceId, onChanged, failed]);

  const comment = useCallback(
    async (body: string, parentCommentId: string | null): Promise<boolean> => {
      if (!data) return false;
      try {
        const created = await addComment(workspaceId, data.issue.sectionId, data.issue.id, { body, parentCommentId });
        setData((current) => (current ? { ...current, comments: [...current.comments, created] } : current));
        return true;
      } catch (error) {
        setNotice(getErrorMessage(error));
        return false;
      }
    },
    [data, workspaceId],
  );

  const upload = useCallback(
    async (file: File, inline: boolean): Promise<Attachment> => {
      if (!data) throw new Error('The issue is not loaded.');
      const created = await uploadAttachment(workspaceId, data.issue.sectionId, data.issue.id, file, inline);
      setData((current) => (current ? { ...current, attachments: [...current.attachments, created] } : current));
      return created;
    },
    [data, workspaceId],
  );

  const removeAttachment = useCallback(
    (attachmentId: string) => {
      if (!data) return;
      setData((current) =>
        current ? { ...current, attachments: current.attachments.filter((a) => a.id !== attachmentId) } : current,
      );
      deleteAttachment(workspaceId, data.issue.sectionId, data.issue.id, attachmentId).catch(failed);
    },
    [data, workspaceId, failed],
  );

  const actions: IssueActions = { patch, toggleComplete, addComment: comment, upload, removeAttachment };
  return { data, loadError, retry, notice, setNotice, actions };
}
