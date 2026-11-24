import AssignmentIndIcon from '@mui/icons-material/AssignmentInd';
import BookmarkBorderIcon from '@mui/icons-material/BookmarkBorder';
import FirstPageIcon from '@mui/icons-material/FirstPage';
import HistoryIcon from '@mui/icons-material/History';
import AddIcon from '@mui/icons-material/Add';
import LogoutIcon from '@mui/icons-material/Logout';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import NotificationsIcon from '@mui/icons-material/Notifications';
import PushPinIcon from '@mui/icons-material/PushPin';
import PushPinOutlinedIcon from '@mui/icons-material/PushPinOutlined';
import SearchIcon from '@mui/icons-material/Search';
import SettingsIcon from '@mui/icons-material/Settings';
import Box from '@mui/material/Box';
import Divider from '@mui/material/Divider';
import IconButton from '@mui/material/IconButton';
import InputAdornment from '@mui/material/InputAdornment';
import Menu from '@mui/material/Menu';
import MenuItem from '@mui/material/MenuItem';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import { useState } from 'react';
import type { ReactNode } from 'react';
import { useMatch } from 'react-router-dom';
import { paths, routePatterns } from '../app/paths';
import { useAuth } from '../app/authContext';
import { useWorkspace } from '../app/workspaceContext';
import { CountBadge, SectionIcon, UserAvatar, useThemeModeItems } from '../components/common';
import type { SidebarSection } from '../types';
import { hasPermission, PERMISSION } from '../utils/permissions';
import { JumpTo } from './sidebar/JumpTo';
import { NavItem } from './sidebar/NavItem';
import { WorkspaceSwitcher } from './sidebar/WorkspaceSwitcher';
import { useShell } from './shellContext';

function GroupLabel({ children, action }: { children: ReactNode; action?: ReactNode }) {
  return (
    <Box sx={{ height: 24, px: 1, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
      <Typography
        variant="overline"
        color="text.secondary"
        sx={{ display: 'flex', alignItems: 'center', gap: 1 }}
      >
        {children}
      </Typography>
      {action}
    </Box>
  );
}

function SectionNavItem({ section }: { section: SidebarSection }) {
  const { setSectionPinned } = useWorkspace();
  const PinIcon = section.pinned ? PushPinIcon : PushPinOutlinedIcon;
  const issueMatch = useMatch({ path: routePatterns.issue });
  const onIssuePage = issueMatch?.params.issueKey?.split('-')[0]?.toUpperCase() === section.key;

  return (
    <NavItem
      to={paths.section(section.key)}
      forceSelected={onIssuePage}
      label={section.name}
      icon={<SectionIcon name={section.icon} />}
      trailing={
        <IconButton
          className="pin-action"
          size="small"
          aria-label={section.pinned ? `Unpin ${section.name}` : `Pin ${section.name}`}
          onClick={(event) => {
            event.preventDefault();
            event.stopPropagation();
            setSectionPinned(section.id, !section.pinned);
          }}
          sx={{ visibility: 'hidden', p: 0.5, mr: -0.5 }}
        >
          <PinIcon sx={{ fontSize: 16 }} />
        </IconButton>
      }
    />
  );
}

export function Sidebar() {
  const { currentUser, workspace, sections, unreadCount } = useWorkspace();
  const { toggleSidebar } = useShell();
  const [filter, setFilter] = useState('');
  const [userMenu, setUserMenu] = useState<HTMLElement | null>(null);
  const { signOut } = useAuth();
  const themeItems = useThemeModeItems(() => setUserMenu(null));
  // `end: false` keeps the section active on its sub-pages (settings) too.
  const sectionMatch = useMatch({ path: routePatterns.section, end: false });
  // The full page of an issue (IT-142) keeps its section selected in the sidebar.
  const issueMatch = useMatch({ path: routePatterns.issue });
  // Hidden without the permission; the backend refuses the requests anyway.
  const canOpenWorkspaceSettings = hasPermission(workspace.permissions, PERMISSION.workspaceSettingsEdit);

  const query = filter.trim().toLowerCase();
  const visible = sections.filter((s) => s.name.toLowerCase().includes(query));
  const pinned = visible.filter((s) => s.pinned);
  const others = visible.filter((s) => !s.pinned);

  const activeSectionKey = (sectionMatch?.params.key ?? issueMatch?.params.issueKey?.split('-')[0])?.toUpperCase();
  const activeSection = sections.find((s) => s.key === activeSectionKey);
  const userSubtitle = activeSection ? `${activeSection.name} · ${activeSection.roleName}` : workspace.roleName;

  return (
    <Box
      component="nav"
      aria-label="Sidebar"
      sx={{
        width: 280,
        flexShrink: 0,
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        bgcolor: 'background.paper',
        borderRight: 1,
        borderColor: 'divider',
      }}
    >
      <Box sx={{ p: 2, pb: 0, flexShrink: 0 }}>
        <WorkspaceSwitcher />
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: '20px' }}>
          <JumpTo />
          <IconButton aria-label="Collapse sidebar" onClick={toggleSidebar} sx={{ width: 32, height: 32 }}>
            <FirstPageIcon />
          </IconButton>
        </Box>
      </Box>

      <Box sx={{ flex: 1, minHeight: 0, overflowY: 'auto', px: 1, pt: '15px', pb: 1 }}>
        <GroupLabel>For you</GroupLabel>
        <Box sx={{ mt: '4px' }}>
          <NavItem
            to={paths.inbox}
            label="Inbox"
            icon={<NotificationsIcon />}
            trailing={unreadCount > 0 ? <CountBadge count={unreadCount} /> : undefined}
          />
          <NavItem to={paths.assigned} label="Assigned to me" icon={<AssignmentIndIcon />} />
          <NavItem to={paths.presets} label="Presets" icon={<BookmarkBorderIcon />} />
        </Box>

        {pinned.length > 0 && (
          <Box sx={{ mt: 1.5 }}>
            <GroupLabel>
              Pinned
              <PushPinIcon sx={{ fontSize: 12, color: 'text.secondary' }} />
            </GroupLabel>
            <Box sx={{ mt: '4px' }}>
              {pinned.map((section) => (
                <SectionNavItem key={section.id} section={section} />
              ))}
            </Box>
          </Box>
        )}

        <Box sx={{ mt: 1.5 }}>
          <GroupLabel
            action={
              <IconButton size="small" aria-label="Add section" sx={{ mr: 0.5 }}>
                <AddIcon />
              </IconButton>
            }
          >
            Sections
          </GroupLabel>
          <TextField
            fullWidth
            size="small"
            placeholder="Filter sections"
            value={filter}
            onChange={(event) => setFilter(event.target.value)}
            slotProps={{
              htmlInput: { 'aria-label': 'Filter sections' },
              input: {
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon sx={{ fontSize: 20, color: 'action.active' }} />
                  </InputAdornment>
                ),
              },
            }}
            sx={{
              mx: 1,
              mt: '4px',
              width: 'calc(100% - 16px)',
              '& .MuiOutlinedInput-root': { height: 32, fontSize: 13 },
              '& input': { py: 0 },
            }}
          />
          <Box sx={{ mt: 1 }}>
            {others.map((section) => (
              <SectionNavItem key={section.id} section={section} />
            ))}
          </Box>
        </Box>
      </Box>

      <Box sx={{ flexShrink: 0, px: 1, pt: '10px', pb: '10px', borderTop: 1, borderColor: 'divider' }}>
        <GroupLabel>Admin</GroupLabel>
        <Box sx={{ mt: '4px' }}>
          <NavItem to={paths.auditLog} label="Audit log" icon={<HistoryIcon />} />
          {canOpenWorkspaceSettings && (
            <NavItem to={paths.workspaceSettings} label="Workspace settings" icon={<SettingsIcon />} />
          )}
        </Box>
      </Box>

      <Box
        sx={{
          flexShrink: 0,
          height: 65,
          px: 2,
          display: 'flex',
          alignItems: 'center',
          gap: 1.5,
          borderTop: 1,
          borderColor: 'divider',
        }}
      >
        <UserAvatar user={currentUser} size={40} sx={{ fontSize: 16 }} />
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Typography variant="body2" noWrap sx={{ fontWeight: 500 }}>
            {currentUser.displayName}
          </Typography>
          <Typography variant="caption" color="text.secondary" noWrap component="div">
            {userSubtitle}
          </Typography>
        </Box>
        <IconButton aria-label="User menu" aria-haspopup="menu" size="small" onClick={(event) => setUserMenu(event.currentTarget)}>
          <MoreVertIcon />
        </IconButton>
        <Menu anchorEl={userMenu} open={userMenu !== null} onClose={() => setUserMenu(null)} anchorOrigin={{ vertical: 'top', horizontal: 'right' }} transformOrigin={{ vertical: 'bottom', horizontal: 'right' }}>
          <MenuItem disabled sx={{ opacity: '1 !important' }}>
            <Typography variant="caption" color="text.secondary">
              {currentUser.email}
            </Typography>
          </MenuItem>
          <Divider />
          {themeItems}
          <Divider />
          <MenuItem
            onClick={() => {
              setUserMenu(null);
              void signOut();
            }}
          >
            <LogoutIcon fontSize="small" sx={{ mr: 1.5 }} />
            Sign out
          </MenuItem>
        </Menu>
      </Box>
    </Box>
  );
}
