import { getActiveTab, getTabPath, tabs } from '../src/components/bottomTabsModel';

describe('bottom navigation flow', () => {
  it('offers the five primary destinations, including You', () => {
    expect(tabs.map(tab => tab.label)).toEqual(['Home', 'Tasks', 'Habits', 'Notes', 'You']);
  });

  it('opens the profile screen from You', () => {
    expect(getTabPath('You')).toBe('/profile');
  });

  it('keeps You selected on both Profile and Settings', () => {
    expect(getActiveTab('/profile')).toBe('You');
    expect(getActiveTab('/settings')).toBe('You');
  });

  it('keeps Home selected for both root route spellings', () => {
    expect(getActiveTab('/')).toBe('Home');
    expect(getActiveTab('/index')).toBe('Home');
  });
});
