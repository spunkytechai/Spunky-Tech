export const tabs = [
  { label: 'Home', icon: '⌂', path: '/' },
  { label: 'Tasks', icon: '☷', path: '/tasks' },
  { label: 'Habits', icon: '♡', path: '/habits' },
  { label: 'Notes', icon: '▤', path: '/notes' },
  { label: 'You', icon: '◉', path: '/profile' },
] as const;

export type TabLabel = (typeof tabs)[number]['label'];

export function getTabPath(label: TabLabel): (typeof tabs)[number]['path'] {
  return tabs.find(tab => tab.label === label)!.path;
}

export function getActiveTab(pathname: string): TabLabel | undefined {
  if (pathname === '/settings') return 'You';
  if (pathname === '/index') return 'Home';
  return tabs.find(tab => pathname === tab.path)?.label;
}
