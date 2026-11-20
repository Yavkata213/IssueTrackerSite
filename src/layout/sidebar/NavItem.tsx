import type { ReactNode } from 'react';
import { useMatch } from 'react-router-dom';
import { NavRow } from './NavRow';

interface NavItemProps {
  to: string;
  label: string;
  icon: ReactNode;
  /** Shown at the right edge, e.g. the unread count. */
  trailing?: ReactNode;
  /** Selected even when the URL is not inside `to` (an issue page keeps its section selected). */
  forceSelected?: boolean;
}

/** Sidebar link. It is selected while the current URL is inside `to`. */
export function NavItem({ to, label, icon, trailing, forceSelected = false }: NavItemProps) {
  const matches = Boolean(useMatch({ path: to, end: false }));
  const selected = forceSelected || matches;
  return <NavRow to={to} selected={selected} icon={icon} label={label} trailing={trailing} />;
}
