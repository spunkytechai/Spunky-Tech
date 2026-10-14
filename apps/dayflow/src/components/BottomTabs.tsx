import { usePathname, useRouter, type Href } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors } from '../theme/colors';

const tabs = [
  { label: 'Home', icon: '⌂', path: '/' as Href },
  { label: 'Notes', icon: '▤', path: '/notes' as Href },
  { label: 'Tasks', icon: '✓', path: '/tasks' as Href },
  { label: 'Habits', icon: '◎', path: '/habits' as Href },
];

export function BottomTabs() {
  const pathname = usePathname();
  const router = useRouter();

  return (
    <View style={styles.bar}>
      {tabs.map((tab) => {
        const active = pathname === tab.path || (tab.path === '/' && pathname === '/index');
        return (
          <Pressable
            key={tab.label}
            accessibilityRole="button"
            accessibilityState={{ selected: active }}
            accessibilityLabel={tab.label}
            onPress={() => router.replace(tab.path)}
            style={styles.tab}
          >
            <Text style={[styles.icon, active && styles.active]}>{tab.icon}</Text>
            <Text style={[styles.label, active && styles.active]}>{tab.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.surface,
    paddingTop: 10,
    paddingBottom: 8,
  },
  tab: { flex: 1, alignItems: 'center', gap: 4, paddingVertical: 2 },
  icon: { fontSize: 19, color: colors.muted },
  label: { fontSize: 10, color: colors.muted, fontWeight: '600' },
  active: { color: colors.primary, fontWeight: '800' },
});
