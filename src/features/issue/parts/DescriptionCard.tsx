import Box from '@mui/material/Box';
import type { ReactNode } from 'react';
import { useMemo, useRef } from 'react';
import { RichTextEditor } from '../../../components/editor';
import type { UploadedImage } from '../../../components/editor';
import type { Attachment, IssueDetailData, RichTextDoc } from '../../../types';
import { ALLOWED_ATTACHMENT_TYPES, checkAttachmentFile } from '../../../utils/attachments';
import { hasPermission, PERMISSION } from '../../../utils/permissions';
import { isEmptyDoc } from '../../../utils/richText';
import { safeImageUrl } from '../../../utils/urls';
import { useAutosave } from '../useAutosave';
import { AttachmentCard } from './AttachmentCard';

interface DescriptionCardProps {
  detail: IssueDetailData;
  /** Row at the top of the card (the page puts the title and "Mark as complete" there). */
  header?: ReactNode;
  size: 'page' | 'panel';
  onSaveDescription: (doc: RichTextDoc | null) => void;
  onUpload: (file: File, inline: boolean) => Promise<Attachment>;
  onRemoveAttachment: (attachmentId: string) => void;
  onNotice: (message: string) => void;
}

/** The framed description: file cards and the text editor with its toolbar. */
export function DescriptionCard({ detail, header, size, onSaveDescription, onUpload, onRemoveAttachment, onNotice }: DescriptionCardProps) {
  const canEdit = hasPermission(detail.permissions, PERMISSION.issueEdit);
  const fileInput = useRef<HTMLInputElement>(null);
  const { schedule } = useAutosave<RichTextDoc>((doc) => onSaveDescription(isEmptyDoc(doc) ? null : doc));

  // Pictures of the text, by attachment id. Only URLs that are safe to load are used.
  const imageUrls = useMemo(() => {
    const urls = new Map<string, string>();
    for (const attachment of detail.attachments) {
      const url = safeImageUrl(attachment.downloadUrl);
      if (attachment.isInline && url) urls.set(attachment.id, url);
    }
    return urls;
    // The editor reads the pictures once, when the issue is loaded.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const cards = detail.attachments.filter((a) => !a.isInline);
  const padding = size === 'page' ? 4 : '15px';

  const attachFiles = (files: File[]) => {
    for (const file of files) {
      const problem = checkAttachmentFile(file);
      if (problem) {
        onNotice(problem);
        continue;
      }
      onUpload(file, false).catch((error: unknown) => onNotice(error instanceof Error ? error.message : 'The file could not be uploaded.'));
    }
  };

  const uploadImage = async (file: File): Promise<UploadedImage> => {
    const problem = checkAttachmentFile(file, true);
    if (problem) throw new Error(problem);
    const attachment = await onUpload(file, true);
    const url = safeImageUrl(attachment.downloadUrl);
    if (!url) throw new Error('The picture could not be shown.');
    return { attachmentId: attachment.id, url };
  };

  return (
    <Box sx={{ bgcolor: 'background.paper', border: 1, borderColor: 'divider', borderRadius: 2, overflow: 'hidden' }}>
      {header}
      <RichTextEditor
        initialDoc={detail.issue.description}
        imageUrls={imageUrls}
        editable={canEdit}
        placeholder="Write a description…"
        size={size}
        onChange={schedule}
        onUploadImage={uploadImage}
        onAttachFiles={() => fileInput.current?.click()}
        onError={onNotice}
        aboveText={
          cards.length > 0 ? (
            <Box sx={{ px: padding, pt: '10px', display: 'flex', flexWrap: 'wrap', gap: 1.5 }}>
              {cards.map((attachment) => (
                <AttachmentCard
                  key={attachment.id}
                  attachment={attachment}
                  canRemove={canEdit}
                  onRemove={() => onRemoveAttachment(attachment.id)}
                />
              ))}
            </Box>
          ) : undefined
        }
      />
      <input
        ref={fileInput}
        type="file"
        multiple
        hidden
        accept={ALLOWED_ATTACHMENT_TYPES.join(',')}
        aria-label="Files to attach"
        onChange={(event) => {
          attachFiles([...(event.target.files ?? [])]);
          event.target.value = '';
        }}
      />
    </Box>
  );
}
