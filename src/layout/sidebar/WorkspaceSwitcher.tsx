import UnfoldMoreIcon from '@mui/icons-material/UnfoldMore';
import Box from '@mui/material/Box';
import ButtonBase from '@mui/material/ButtonBase';
import Menu from '@mui/material/Menu';
import MenuItem from '@mui/material/MenuItem';
import Typography from '@mui/material/Typography';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { paths } from '../../app/paths';
import { useWorkspace } from '../../app/workspaceContext';
import { WorkspaceLogo } from '../../components/common';

/** Current workspace card at the top of the sidebar. Opens a menu to switch workspace. */
export function WorkspaceSwitcher() {
  const { workspace, workspaces, selectWorkspace } = useWorkspace();
  const navigate = useNavigate();
  const [anchor, setAnchor] = useState<HTMLElement | null>(null);

  return (
    <>
      <ButtonBase
        onClick={(event) => setAnchor(event.currentTarget)}
        aria-haspopup="menu"
        aria-expanded={anchor ? 'true' : undefined}
        sx={{
          width: '100%',
          height: 58,
          p: 1,
          gap: 1.5,
          justifyContent: 'flex-start',
          textAlign: 'left',
          border: 1,
          borderColor: 'divider',
          borderRadius: 2,
        }}
      >
        <WorkspaceLogo workspace={workspace} />
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Typography variant="h2" noWrap sx={{ lineHeight: '20px' }}>
            {workspace.name}
          </Typography>
          <Typography variant="caption" color="text.secondary" noWrap component="div">
            {workspace.roleName} · {workspace.memberCount} members
          </Typography>
        </Box>
        <UnfoldMoreIcon sx={{ color: 'action.active' }} />
      </ButtonBase>
      <Menu
        anchorEl={anchor}
        open={Boolean(anchor)}
        onClose={() => setAnchor(null)}
        slotProps={{ paper: { sx: { width: 248, mt: 0.5 } } }}
      >
        {workspaces.map((item) => (
          <MenuItem
            key={item.id}
            selected={item.id === workspace.id}
            onClick={() => {
              setAnchor(null);
              if (item.id !== workspace.id) {
                selectWorkspace(item.id);
                navigate(paths.home);
              }
            }}
            sx={{ gap: 1.5 }}
          >
            <WorkspaceLogo workspace={item} />
            <Box sx={{ minWidth: 0 }}>
              <Typography variant="body2" noWrap sx={{ fontWeight: 500 }}>
                {item.name}
              </Typography>
              <Typography variant="caption" color="text.secondary" noWrap component="div">
                {item.roleName} · {item.memberCount} members
              </Typography>
            </Box>
          </MenuItem>
        ))}
      </Menu>
    </>
  );
}
