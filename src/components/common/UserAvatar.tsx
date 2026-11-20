import Avatar from '@mui/material/Avatar';
import type { AvatarProps } from '@mui/material/Avatar';
import { useTheme } from '@mui/material/styles';
import type { User } from '../../types';
import { getAvatarColorIndex, getInitials } from '../../utils/avatar';

interface UserAvatarProps extends Omit<AvatarProps, 'children'> {
  user: Pick<User, 'id' | 'displayName' | 'avatarUrl'>;
  size?: number;
}

/** Round avatar: the user's image, or initials on a colour picked from the user id. */
export function UserAvatar({ user, size = 24, sx, ...rest }: UserAvatarProps) {
  const { palette } = useTheme();
  const color = palette.avatars[getAvatarColorIndex(user.id, palette.avatars.length)];
  return (
    <Avatar
      alt={user.displayName}
      src={user.avatarUrl ?? undefined}
      title={user.displayName}
      sx={[
        {
          width: size,
          height: size,
          bgcolor: color,
          color: 'common.white',
          fontSize: Math.round(size * 0.42),
          fontWeight: 500,
        },
        ...(Array.isArray(sx) ? sx : [sx]),
      ]}
      {...rest}
    >
      {getInitials(user.displayName)}
    </Avatar>
  );
}
