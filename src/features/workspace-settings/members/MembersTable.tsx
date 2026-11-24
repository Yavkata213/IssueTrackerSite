import MoreVertIcon from '@mui/icons-material/MoreVert';
import Box from '@mui/material/Box';
import Chip from '@mui/material/Chip';
import IconButton from '@mui/material/IconButton';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import Menu from '@mui/material/Menu';
import MenuItem from '@mui/material/MenuItem';
import TableRow from '@mui/material/TableRow';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';
import { alpha } from '@mui/material/styles';
import { useState } from 'react';
import { UserAvatar } from '../../../components/common';
import { thinScrollbar } from '../../../theme';
import type { InvitationInfo, MemberRowStatus, WorkspaceMember } from '../../../types';
import { formatLastActive } from '../../../utils/dates';

/** Section roles shown as chips; the rest is behind "+N". */
const MAX_ROLE_CHIPS = 3;

const COLUMNS = [
  { label: 'Member', width: 560 },
  { label: 'Workspace role', width: 220 },
  { label: 'Section roles', width: 400 },
  { label: 'Status', width: 140 },
  { label: 'Last active', width: undefined },
  { label: '', width: 80 },
] as const;

const STATUS_LABEL: Record<MemberRowStatus, string> = { ACTIVE: 'Active', DEACTIVATED: 'Deactivated', INVITED: 'Invited' };

function StatusChip({ member }: { member: WorkspaceMember }) {
  const { status } = member;
  // An invitation whose link ran out is shown as "Expired" until it is sent again or withdrawn.
  const expired = status === 'INVITED' && member.invitation?.expired === true;
  const tone = status === 'ACTIVE' ? 'success' : status === 'INVITED' && !expired ? 'info' : null;
  return (
    <Chip
      size="small"
      label={expired ? 'Expired' : STATUS_LABEL[status]}
      sx={{
        height: 24,
        borderRadius: '12px',
        fontSize: 12,
        color: tone ? `${tone}.main` : 'text.secondary',
        bgcolor: tone ? (t) => alpha(t.palette[tone].main, 0.12) : 'action.selected',
      }}
    />
  );
}

// `minWidth: 0` lets a long section name shrink with an ellipsis instead of running into the next column.
const ROLE_CHIP_SX = { height: 24, minWidth: 0, borderRadius: '12px', fontSize: 12, bgcolor: 'action.selected' } as const;

function SectionRoleChips({ member }: { member: WorkspaceMember }) {
  const { sectionRoles } = member;
  if (sectionRoles.length === 0) {
    return (
      <Typography variant="body2" color="text.disabled">
        No section roles
      </Typography>
    );
  }
  const shown = sectionRoles.slice(0, MAX_ROLE_CHIPS);
  const rest = sectionRoles.slice(MAX_ROLE_CHIPS);
  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, minWidth: 0 }}>
      {shown.map((role) => (
        <Chip key={role.sectionId} size="small" label={`${role.sectionName} ${role.roleName}`} title={`${role.sectionName} ${role.roleName}`} sx={ROLE_CHIP_SX} />
      ))}
      {rest.length > 0 && (
        <Tooltip title={rest.map((role) => `${role.sectionName} ${role.roleName}`).join(', ')}>
          <Chip size="small" label={`+${rest.length}`} sx={{ ...ROLE_CHIP_SX, flexShrink: 0 }} />
        </Tooltip>
      )}
    </Box>
  );
}

interface InvitationActions {
  onResend: (invitation: InvitationInfo) => void;
  onRevoke: (invitation: InvitationInfo) => void;
}

/** Menu of an invitation row: send the link again, or withdraw the invitation. */
function InvitationMenu({ invitation, actions }: { invitation: InvitationInfo; actions: InvitationActions }) {
  const [anchor, setAnchor] = useState<HTMLElement | null>(null);
  return (
    <>
      <IconButton aria-label={`Actions for ${invitation.email}`} aria-haspopup="menu" onClick={(event) => setAnchor(event.currentTarget)}>
        <MoreVertIcon />
      </IconButton>
      <Menu anchorEl={anchor} open={anchor !== null} onClose={() => setAnchor(null)}>
        <MenuItem
          onClick={() => {
            setAnchor(null);
            actions.onResend(invitation);
          }}
        >
          Send invitation again
        </MenuItem>
        <MenuItem
          onClick={() => {
            setAnchor(null);
            actions.onRevoke(invitation);
          }}
          sx={{ color: 'error.main' }}
        >
          Withdraw invitation
        </MenuItem>
      </Menu>
    </>
  );
}

function MemberRow({ member, invitationActions }: { member: WorkspaceMember; invitationActions: InvitationActions | null }) {
  const deactivated = member.status === 'DEACTIVATED';
  const invitation = member.invitation;
  const textColor = deactivated ? 'text.disabled' : 'text.primary';
  return (
    <TableRow hover>
      <TableCell sx={{ pl: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, minWidth: 0 }}>
          <UserAvatar user={member.user} size={36} sx={deactivated ? { bgcolor: 'grey.500' } : undefined} />
          <Box sx={{ minWidth: 0 }}>
            <Typography variant="body2" noWrap sx={{ color: textColor }}>
              {member.user.displayName}
            </Typography>
            <Typography variant="caption" noWrap component="div" sx={{ color: deactivated ? 'text.disabled' : 'text.secondary' }}>
              {invitation ? (invitation.expired ? 'Invitation expired' : `Invited${invitation.invitedByName ? ` by ${invitation.invitedByName}` : ''}`) : member.user.email}
            </Typography>
          </Box>
        </Box>
      </TableCell>
      <TableCell>
        <Typography variant="body2" noWrap sx={{ color: textColor }}>
          {member.roleName}
        </Typography>
      </TableCell>
      <TableCell>
        <SectionRoleChips member={member} />
      </TableCell>
      <TableCell>
        <StatusChip member={member} />
      </TableCell>
      <TableCell>
        <Typography variant="body2" noWrap sx={{ color: textColor }}>
          {formatLastActive(member.lastActiveAt)}
        </Typography>
      </TableCell>
      <TableCell align="center">
        {invitation && invitationActions ? (
          <InvitationMenu invitation={invitation} actions={invitationActions} />
        ) : (
          // Actions for members are specified later, so the button has no menu yet.
          <IconButton aria-label={`Actions for ${member.user.displayName}`}>
            <MoreVertIcon />
          </IconButton>
        )}
      </TableCell>
    </TableRow>
  );
}

interface MembersTableProps {
  members: WorkspaceMember[];
  /** A new page is loading: the rows of the previous one stay, dimmed. */
  loading: boolean;
  /** False until the first page has arrived. */
  ready: boolean;
  /** Resend and withdraw for invitation rows; `null` when the user may not invite. */
  invitationActions: InvitationActions | null;
}

/**
 * The table fills the card and scrolls inside it; the column header stays at the top.
 * The page itself does not grow with the number of rows.
 */
export function MembersTable({ members, loading, ready, invitationActions }: MembersTableProps) {
  return (
    <TableContainer
      sx={{ flex: 1, minHeight: 0, opacity: loading ? 0.6 : 1, transition: 'opacity 120ms', ...thinScrollbar }}
      aria-busy={loading}
    >
      <Table stickyHeader aria-label="Workspace members" sx={{ tableLayout: 'fixed', width: '100%' }}>
        <TableHead>
          <TableRow>
            {COLUMNS.map((column, index) => (
              <TableCell
                key={column.label || 'actions'}
                sx={{
                  width: column.width,
                  height: 44,
                  py: 0,
                  pl: index === 0 ? 3 : 0,
                  pr: 2,
                  bgcolor: 'surface.groupHeader',
                  color: 'text.secondary',
                  fontSize: 12,
                  fontWeight: 400,
                  textTransform: 'uppercase',
                  lineHeight: '16px',
                }}
              >
                {column.label}
              </TableCell>
            ))}
          </TableRow>
        </TableHead>
        <TableBody
          sx={{
            '& .MuiTableCell-root': { height: 64, py: 0, pl: 0, pr: 2, borderColor: 'divider', overflow: 'hidden' },
            '& .MuiTableCell-root:first-of-type': { pl: 3 },
          }}
        >
          {members.map((member) => (
            <MemberRow key={member.user.id} member={member} invitationActions={invitationActions} />
          ))}
          {ready && members.length === 0 && (
            <TableRow>
              <TableCell colSpan={COLUMNS.length} sx={{ textAlign: 'center' }}>
                <Typography color="text.secondary">No members match your filters.</Typography>
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </TableContainer>
  );
}
