import CloseIcon from '@mui/icons-material/Close';
import DownloadIcon from '@mui/icons-material/Download';
import Box from '@mui/material/Box';
import IconButton from '@mui/material/IconButton';
import Typography from '@mui/material/Typography';
import type { Attachment } from '../../../types';
import { describeFile, formatFileSize } from '../../../utils/attachments';
import { safeImageUrl } from '../../../utils/urls';

const TONE_COLORS = {
  error: 'error.main',
  info: 'info.main',
  primary: 'primary.main',
  success: 'success.main',
  neutral: 'grey.600',
} as const;

interface AttachmentCardProps {
  attachment: Attachment;
  /** Shows the remove button (needs `issue.edit`). */
  canRemove: boolean;
  onRemove: () => void;
}

/** A file of the issue: type badge, name, "1.2 MB · PDF document" and a download button. */
export function AttachmentCard({ attachment, canRemove, onRemove }: AttachmentCardProps) {
  const kind = describeFile(attachment.contentType);
  // The URL comes from the backend: only web or local object URLs are used as a link.
  const href = safeImageUrl(attachment.downloadUrl);
  return (
    <Box
      sx={{
        width: 380,
        maxWidth: '100%',
        height: 56,
        px: '14px',
        display: 'flex',
        alignItems: 'center',
        gap: '14px',
        bgcolor: 'surface.field',
        border: 1,
        borderColor: 'divider',
        borderRadius: 1,
      }}
    >
      <Box
        aria-hidden
        sx={{
          width: 32,
          height: 32,
          flexShrink: 0,
          borderRadius: '4px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          bgcolor: TONE_COLORS[kind.tone],
          color: 'common.white',
          fontSize: 10,
          fontWeight: 500,
        }}
      >
        {kind.badge}
      </Box>
      <Box sx={{ flex: 1, minWidth: 0 }}>
        <Typography variant="body2" noWrap title={attachment.fileName}>
          {attachment.fileName}
        </Typography>
        <Typography variant="caption" color="text.secondary" noWrap component="div">
          {formatFileSize(attachment.sizeBytes)} · {kind.label}
        </Typography>
      </Box>
      {canRemove && (
        <IconButton size="small" aria-label={`Remove ${attachment.fileName}`} onClick={onRemove}>
          <CloseIcon fontSize="small" />
        </IconButton>
      )}
      <IconButton
        size="small"
        aria-label={`Download ${attachment.fileName}`}
        component="a"
        href={href}
        download={attachment.fileName}
        rel="noopener noreferrer"
        disabled={href === undefined}
      >
        <DownloadIcon fontSize="small" />
      </IconButton>
    </Box>
  );
}
