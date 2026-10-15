import { usePathname, useRouter, type Href } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors } from '../theme/colors';

const tabs = [
  { label: 'Home', icon: '⌂', path: '/' as Href },
  { label: 'Tasks', icon: '☷', path: '/tasks' as Href },
  { label: 'Habits', icon: '♡', path: '/habits' as Href },
  { label: 'Notes', icon: '▤', path: '/notes' as Href },
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
            style={({ pressed }) => [styles.tab, pressed && styles.pressed]}
          >
            <View style={[styles.iconWrap, active && styles.iconWrapActive]}>
              <Text style={[styles.icon, active && styles.active]}>{tab.icon}</Text>
            </View>
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
    paddingTop: 8,
    paddingBottom: 7,
    paddingHorizontal: 8,
  },
  tab: { flex: 1, alignItems: 'center', gap: 3, paddingVertical: 2, minHeight: 48, justifyContent: 'center' },
  pressed: { opacity: 0.72 },
  iconWrap: { minWidth: 38, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  iconWrapActive: { backgroundColor: colors.primarySoft },
  icon: { fontSize: 19, color: colors.muted },
  label: { fontSize: 10, color: colors.muted, fontWeight: '600' },
  active: { color: colors.primary, fontWeight: '800' },
});
