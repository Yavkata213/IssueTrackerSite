import type { SettingsTab } from '../../app/paths';

export const SETTINGS_TABS: { value: SettingsTab; label: string; description: string }[] = [
  { value: 'general', label: 'General', description: 'Manage how this section is named and shown across the workspace.' },
  {
    value: 'members',
    label: 'Members and roles',
    description: 'Manage who can access this section, what they can do and how its board is set up.',
  },
  {
    value: 'category',
    label: 'Category',
    description: 'Create and configure the categories used to classify issues in this section.',
  },
];
