// The fixed set of section icons (24 in the design), in the order of the icon picker.
// Names are Material icon names stored on the section; `SectionIcon` maps them to components.
export const SECTION_ICON_NAMES = [
  'laptop',
  'apartment',
  'build',
  'groups',
  'account_balance',
  'home',
  'shield',
  'star',
  'bolt',
  'flag',
  'folder',
  'cloud',
  'lock',
  'favorite',
  'work',
  'person',
  'chat_bubble',
  'code',
  'dns',
  'check_circle',
  'info',
  'event',
  'lightbulb',
  'school',
] as const;

export type SectionIconName = (typeof SECTION_ICON_NAMES)[number];

export function isSectionIconName(value: string): value is SectionIconName {
  return (SECTION_ICON_NAMES as readonly string[]).includes(value);
}
