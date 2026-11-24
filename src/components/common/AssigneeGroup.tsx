import PersonOutlinedIcon from '@mui/icons-material/PersonOutlined';
import Avatar from '@mui/material/Avatar';
import AvatarGroup from '@mui/material/AvatarGroup';
import type { User } from '../../types';
import { UserAvatar } from './UserAvatar';

const SIZE = 24;
const MAX_SLOTS = 4; // with more than 4 users: 3 avatars and a "+N" avatar

interface AssigneeGroupProps {
  assignees: User[];
  /** Which side the avatars sit on in their container. Cards use `end`, table rows `start`. */
  align?: 'start' | 'end';
}

/** Overlapping avatars of the assignees, or a dashed placeholder when nobody is assigned. */
export function AssigneeGroup({ assignees, align = 'end' }: AssigneeGroupProps) {
  if (assignees.length === 0) {
    return (
      <Avatar
        title="Unassigned"
        sx={{
          width: SIZE,
          height: SIZE,
          bgcolor: 'transparent',
          color: 'text.disabled',
          border: '1px dashed',
          borderColor: 'text.disabled',
        }}
      >
        <PersonOutlinedIcon sx={{ fontSize: 16 }} />
      </Avatar>
    );
  }

  return (
    <AvatarGroup
      max={MAX_SLOTS}
      spacing={8}
      sx={{
        // AvatarGroup lays its avatars out in a reversed row, so the sides are swapped
        justifyContent: align === 'end' ? 'flex-start' : 'flex-end',
        '& .MuiAvatar-root': {
          width: SIZE,
          height: SIZE,
          fontSize: 10,
          fontWeight: 500,
          border: 2,
          borderStyle: 'solid',
          borderColor: 'background.paper',
          boxSizing: 'content-box',
        },
        '& .MuiAvatarGroup-avatar:last-of-type': { bgcolor: 'grey.600' },
      }}
    >
      {assignees.map((user) => (
        <UserAvatar key={user.id} user={user} size={SIZE} />
      ))}
    </AvatarGroup>
  );
}
