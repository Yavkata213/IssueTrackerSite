import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import ButtonBase from '@mui/material/ButtonBase';
import InputBase from '@mui/material/InputBase';
import Typography from '@mui/material/Typography';
import { useId, useState } from 'react';
import { UserAvatar } from '../../../components/common';
import type { IssueComment, User } from '../../../types';
import { formatTimeAgo } from '../../../utils/dates';
import { LIMITS } from '../../../utils/limits';

interface ComposerProps {
  user: User;
  placeholder: string;
  submitLabel: string;
  autoFocus?: boolean;
  /** Resolves to true when the comment was saved: the box is then emptied. */
  onSubmit: (body: string) => Promise<boolean>;
  onCancel?: () => void;
}

/** Avatar and a box to write in, with the submit button at its bottom right corner. */
function Composer({ user, placeholder, submitLabel, autoFocus = false, onSubmit, onCancel }: ComposerProps) {
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const fieldId = useId();
  const empty = text.trim() === '';

  const submit = () => {
    if (empty || busy) return;
    setBusy(true);
    onSubmit(text.trim())
      .then((saved) => {
        if (saved) setText('');
      })
      .finally(() => setBusy(false));
  };

  return (
    <Box sx={{ display: 'flex', gap: 2 }}>
      <UserAvatar user={user} size={32} sx={{ mt: '2px' }} />
      <Box sx={{ flex: 1, minWidth: 0, minHeight: 112, p: 2, display: 'flex', flexDirection: 'column', bgcolor: 'background.paper', border: 1, borderColor: 'divider', borderRadius: 1 }}>
        <InputBase
          id={fieldId}
          multiline
          fullWidth
          autoFocus={autoFocus}
          placeholder={placeholder}
          value={text}
          onChange={(event) => setText(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter' && (event.ctrlKey || event.metaKey)) submit();
          }}
          inputProps={{ 'aria-label': placeholder, maxLength: LIMITS.commentBody }}
          sx={{ flex: 1, alignItems: 'flex-start', fontSize: 14 }}
        />
        <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 1, mt: 1 }}>
          {onCancel && (
            <Button onClick={onCancel} disabled={busy} sx={{ fontWeight: 500 }}>
              Cancel
            </Button>
          )}
          <Button variant="contained" disabled={empty || busy} onClick={submit} sx={{ height: 40, px: '25px', fontWeight: 500 }}>
            {submitLabel}
          </Button>
        </Box>
      </Box>
    </Box>
  );
}

interface CommentRowProps {
  comment: IssueComment;
  canReply: boolean;
  onReply: () => void;
  textSize: number;
}

function CommentRow({ comment, canReply, onReply, textSize }: CommentRowProps) {
  const author = comment.author ?? { id: 'deleted', displayName: 'Deleted user', avatarUrl: null };
  return (
    <Box sx={{ display: 'flex', gap: 2 }}>
      <UserAvatar user={author} size={32} sx={{ mt: '2px' }} />
      <Box sx={{ flex: 1, minWidth: 0 }}>
        <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 1 }}>
          <Typography variant="body2">
            {author.displayName} · {formatTimeAgo(comment.createdAt)}
          </Typography>
          {canReply && (
            <ButtonBase onClick={onReply} sx={{ color: 'primary.main', fontSize: 12, fontWeight: 500 }}>
              Reply
            </ButtonBase>
          )}
        </Box>
        {/* Plain text only: rendered as a React child, never as markup. */}
        <Typography sx={{ mt: '2px', fontSize: textSize, lineHeight: `${textSize + 8}px`, whiteSpace: 'pre-wrap', overflowWrap: 'anywhere' }}>
          {comment.body}
        </Typography>
      </Box>
    </Box>
  );
}

interface CommentsSectionProps {
  comments: IssueComment[];
  currentUser: User;
  /** Needs `issue.comment`. */
  canComment: boolean;
  onAdd: (body: string, parentCommentId: string | null) => Promise<boolean>;
  /** Text size: 16 on the page, 14 in the panel. */
  textSize: number;
}

/** "Comments (n)": comments with their replies, and a box for a new one. */
export function CommentsSection({ comments, currentUser, canComment, onAdd, textSize }: CommentsSectionProps) {
  const [replyTo, setReplyTo] = useState<string | null>(null);
  const topLevel = comments.filter((c) => c.parentCommentId === null);

  return (
    <Box component="section" aria-label="Comments">
      <Typography variant="h2" component="h2" sx={{ fontSize: textSize === 16 ? 24 : 20, lineHeight: '32px', fontWeight: 400 }}>
        Comments ({comments.length})
      </Typography>
      <Box sx={{ mt: 3, display: 'flex', flexDirection: 'column', gap: 3 }}>
        {topLevel.map((comment) => (
          <Box key={comment.id} sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <CommentRow comment={comment} canReply={canComment} onReply={() => setReplyTo(comment.id)} textSize={textSize} />
            {comments
              .filter((reply) => reply.parentCommentId === comment.id)
              .map((reply) => (
                <Box key={reply.id} sx={{ pl: 6 }}>
                  <CommentRow comment={reply} canReply={canComment} onReply={() => setReplyTo(comment.id)} textSize={textSize} />
                </Box>
              ))}
            {replyTo === comment.id && (
              <Box sx={{ pl: 6 }}>
                <Composer
                  user={currentUser}
                  placeholder="Write a reply…"
                  submitLabel="Reply"
                  autoFocus
                  onSubmit={async (body) => {
                    const saved = await onAdd(body, comment.id);
                    if (saved) setReplyTo(null);
                    return saved;
                  }}
                  onCancel={() => setReplyTo(null)}
                />
              </Box>
            )}
          </Box>
        ))}
        {canComment && (
          <Composer user={currentUser} placeholder="Write a comment…" submitLabel="Comment" onSubmit={(body) => onAdd(body, null)} />
        )}
      </Box>
    </Box>
  );
}
