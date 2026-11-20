import Avatar from '@mui/material/Avatar';
import type { Workspace } from '../../types';
import { safeImageUrl } from '../../utils/urls';

interface WorkspaceLogoProps {
  workspace: Pick<Workspace, 'name' | 'logoUrl'>;
  size?: number;
}

/** Rounded square logo of a workspace: the uploaded image, or the first letter of the name. */
export function WorkspaceLogo({ workspace, size = 40 }: WorkspaceLogoProps) {
  return (
    <Avatar
      variant="rounded"
      src={safeImageUrl(workspace.logoUrl)}
      alt=""
      sx={{
        width: size,
        height: size,
        flexShrink: 0,
        borderRadius: 1,
        bgcolor: 'primary.main',
        color: 'common.white',
        fontSize: Math.round(size / 2),
        fontWeight: 500,
      }}
    >
      {workspace.name.charAt(0).toUpperCase()}
    </Avatar>
  );
}
