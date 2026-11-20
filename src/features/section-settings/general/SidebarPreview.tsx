import Box from '@mui/material/Box';
import { SectionIcon } from '../../../components/common';
import { NavRow } from '../../../layout/sidebar/NavRow';

interface SidebarPreviewProps {
  name: string;
  icon: string;
  /** Another section of the workspace, shown unselected below for comparison. */
  other?: { name: string; icon: string };
}

/** How the section will look in the sidebar: selected row, plus one unselected neighbour. */
export function SidebarPreview({ name, icon, other }: SidebarPreviewProps) {
  return (
    <Box aria-hidden sx={{ width: 264, display: 'flex', flexDirection: 'column', gap: '12px' }}>
      <NavRow selected icon={<SectionIcon name={icon} />} label={name} />
      {other && <NavRow selected={false} icon={<SectionIcon name={other.icon} />} label={other.name} />}
    </Box>
  );
}
