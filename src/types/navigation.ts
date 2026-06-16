/**
 * Navigation types for the admin portal grouped sidebar.
 */

import type { LucideIcon } from 'lucide-react';

export interface NavItem {
  id: string;
  label: string;
  path: string;
  // All sidebar icons are lucide icons; `LucideIcon` matches their actual type (and the
  // GroupedSidebar renders them with size/className), unlike the narrower ComponentType
  // that previously rejected every assignment.
  icon: LucideIcon;
  adminOnly?: boolean;
}

export interface NavGroup {
  id: string;
  label: string;
  items: NavItem[];
  adminOnly?: boolean;
}
