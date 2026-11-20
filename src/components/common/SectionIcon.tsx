import AccountBalanceIcon from '@mui/icons-material/AccountBalance';
import ApartmentIcon from '@mui/icons-material/Apartment';
import BoltIcon from '@mui/icons-material/Bolt';
import BuildIcon from '@mui/icons-material/Build';
import ChatBubbleIcon from '@mui/icons-material/ChatBubble';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import CloudIcon from '@mui/icons-material/Cloud';
import CodeIcon from '@mui/icons-material/Code';
import DnsIcon from '@mui/icons-material/Dns';
import EventIcon from '@mui/icons-material/Event';
import FavoriteIcon from '@mui/icons-material/Favorite';
import FlagIcon from '@mui/icons-material/Flag';
import FolderIcon from '@mui/icons-material/Folder';
import GroupsIcon from '@mui/icons-material/Groups';
import HomeIcon from '@mui/icons-material/Home';
import InfoIcon from '@mui/icons-material/Info';
import LaptopIcon from '@mui/icons-material/Laptop';
import LightbulbIcon from '@mui/icons-material/Lightbulb';
import LockIcon from '@mui/icons-material/Lock';
import PersonIcon from '@mui/icons-material/Person';
import SchoolIcon from '@mui/icons-material/School';
import ShieldIcon from '@mui/icons-material/Shield';
import StarIcon from '@mui/icons-material/Star';
import WorkIcon from '@mui/icons-material/Work';
import type { SvgIconProps } from '@mui/material/SvgIcon';
import type { ComponentType } from 'react';
import type { SectionIconName } from '../../utils/sectionIcons';

// Section icons come from a fixed allowlist of Material icons (24 in the design).
// The names are listed in `utils/sectionIcons.ts`; anything else falls back to the folder.
const SECTION_ICONS: Record<SectionIconName, ComponentType<SvgIconProps>> = {
  laptop: LaptopIcon,
  apartment: ApartmentIcon,
  build: BuildIcon,
  groups: GroupsIcon,
  account_balance: AccountBalanceIcon,
  home: HomeIcon,
  shield: ShieldIcon,
  star: StarIcon,
  bolt: BoltIcon,
  flag: FlagIcon,
  folder: FolderIcon,
  cloud: CloudIcon,
  lock: LockIcon,
  favorite: FavoriteIcon,
  work: WorkIcon,
  person: PersonIcon,
  chat_bubble: ChatBubbleIcon,
  code: CodeIcon,
  dns: DnsIcon,
  check_circle: CheckCircleIcon,
  info: InfoIcon,
  event: EventIcon,
  lightbulb: LightbulbIcon,
  school: SchoolIcon,
};

interface SectionIconProps extends SvgIconProps {
  /** Material icon name stored on the section, e.g. `laptop`. */
  name: string;
}

export function SectionIcon({ name, ...rest }: SectionIconProps) {
  const Icon = (SECTION_ICONS as Record<string, ComponentType<SvgIconProps> | undefined>)[name] ?? FolderIcon;
  return <Icon {...rest} />;
}
