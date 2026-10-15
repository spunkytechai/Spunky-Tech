import { useSQLiteContext } from 'expo-sqlite';
import { useCallback, useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, type Href } from 'expo-router';
import { colors, spacing } from '../src/theme/colors';
import { BottomTabs } from '../src/components/BottomTabs';
import { localDate } from '../src/utils/date';

type Task = { id: string; title: string; is_completed: number; priority: string };
type Note = { id: string; title: string; updated_at: string };
type DailyStats = { openTasks: number; noteCount: number; habitsDone: number; habitsTotal: number };

function Action({ label, icon, onPress }: { label: string; icon: string; onPress: () => void }) {
  return <Pressable accessibilityRole="button" onPress={onPress} style={({ pressed }) => [styles.action, pressed && styles.pressed]}>
    <Text style={styles.actionIcon}>{icon}</Text><Text style={styles.actionText}>{label}</Text>
  </Pressable>;
}

export default function HomeScreen() {
  const db = useSQLiteContext();
  const router = useRouter();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [notes, setNotes] = useState<Note[]>([]);
  const [stats, setStats] = useState<DailyStats>({ openTasks: 0, noteCount: 0, habitsDone: 0, habitsTotal: 0 });

  const load = useCallback(async () => {
    const taskRows = await db.getAllAsync<Task>('SELECT id, title, is_completed, priority FROM tasks ORDER BY is_completed ASC, due_at IS NULL, due_at ASC LIMIT 5');
    const noteRows = await db.getAllAsync<Note>('SELECT id, title, updated_at FROM notes ORDER BY is_pinned DESC, updated_at DESC LIMIT 3');
    const taskCount = await db.getFirstAsync<{ count: number }>('SELECT COUNT(*) AS count FROM tasks WHERE is_completed = 0');
    const noteCount = await db.getFirstAsync<{ count: number }>('SELECT COUNT(*) AS count FROM notes');
    const habitStats = await db.getFirstAsync<{ total: number; done: number }>(`SELECT COUNT(*) AS total, COALESCE(SUM(CASE WHEN EXISTS (SELECT 1 FROM habit_entries e WHERE e.habit_id = h.id AND e.local_date = ?) THEN 1 ELSE 0 END), 0) AS done FROM habits h WHERE h.is_archived = 0`, localDate());
    setTasks(taskRows); setNotes(noteRows);
    setStats({ openTasks: taskCount?.count ?? 0, noteCount: noteCount?.count ?? 0, habitsDone: habitStats?.done ?? 0, habitsTotal: habitStats?.total ?? 0 });
  }, [db]);

  useEffect(() => { load().catch(() => undefined); }, [load]);

  const go = (path: Href) => router.push(path);
  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
  const openTask = async (task: Task) => {
    await db.runAsync('UPDATE tasks SET is_completed = ?, updated_at = ? WHERE id = ?', task.is_completed ? 0 : 1, new Date().toISOString(), task.id);
    await load();
  };

  return <SafeAreaView style={styles.safe}>
    <ScrollView contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <View><Text style={styles.eyebrow}>YOUR PERSONAL WORKSPACE</Text><Text style={styles.title}>{greeting}.</Text><Text style={styles.subtitle}>Make space for what matters.</Text></View>
        <View style={styles.logo}><Text style={styles.logoText}>d</Text></View>
      </View>
      <View style={styles.hero}><Text style={styles.heroEyebrow}>A LITTLE PROGRESS, EVERY DAY</Text><Text style={styles.heroTitle}>Your day, in balance.</Text><Text style={styles.heroBody}>Capture a thought, finish a task, or keep a promise to yourself.</Text></View>
      <View style={styles.statsRow}>
        <Pressable onPress={() => go('/tasks')} style={[styles.statCard, styles.statBlue]}><Text style={styles.statIcon}>☷</Text><Text style={styles.statValue}>{stats.openTasks}</Text><Text style={styles.statLabel}>Tasks to do</Text></Pressable>
        <Pressable onPress={() => go('/habits')} style={[styles.statCard, styles.statGreen]}><Text style={styles.statIcon}>♡</Text><Text style={styles.statValue}>{stats.habitsDone}/{stats.habitsTotal}</Text><Text style={styles.statLabel}>Habits today</Text></Pressable>
        <Pressable onPress={() => go('/notes')} style={[styles.statCard, styles.statAmber]}><Text style={styles.statIcon}>▤</Text><Text style={styles.statValue}>{stats.noteCount}</Text><Text style={styles.statLabel}>Notes saved</Text></Pressable>
      </View>
      <Text style={styles.sectionTitle}>Quick capture</Text>
      <View style={styles.actions}>
        <Action label="New note" icon="▤" onPress={() => go('/notes')} />
        <Action label="Add task" icon="✓" onPress={() => go('/tasks')} />
        <Action label="Track habit" icon="◎" onPress={() => go('/habits')} />
      </View>
      <View style={styles.sectionHeader}><Text style={styles.sectionTitle}>Your tasks</Text><Pressable onPress={() => go('/tasks')}><Text style={styles.link}>See all</Text></Pressable></View>
      <View style={styles.card}>
        {tasks.length === 0 ? <Text style={styles.empty}>Your task list is clear. Add a task when something needs your attention.</Text> : tasks.map((task, i) => <Pressable accessibilityRole="button" accessibilityLabel={task.is_completed ? 'Reopen task ' + task.title : 'Complete task ' + task.title} onPress={() => openTask(task)} key={task.id} style={[styles.taskRow, i > 0 && styles.rowBorder]}><Text style={[styles.check, task.is_completed === 1 && styles.checked]}>{task.is_completed ? '✓' : ''}</Text><Text style={[styles.taskText, task.is_completed === 1 && styles.completed]}>{task.title}</Text><View style={[styles.priority, task.priority === 'high' && styles.highPriority]} /></Pressable>)}
      </View>
      <View style={styles.sectionHeader}><Text style={styles.sectionTitle}>Recent notes</Text><Pressable onPress={() => go('/notes')}><Text style={styles.link}>Open notes</Text></Pressable></View>
      <View style={styles.card}>
        {notes.length === 0 ? <Text style={styles.empty}>Keep useful ideas close. Your notes stay on this device.</Text> : notes.map((note, i) => <View key={note.id} style={[styles.noteRow, i > 0 && styles.rowBorder]}><View style={styles.noteMark} /><View style={{ flex: 1 }}><Text style={styles.noteTitle}>{note.title || 'Untitled note'}</Text><Text style={styles.noteDate}>{new Date(note.updated_at).toLocaleDateString()}</Text></View></View>)}
      </View>
      <Text style={styles.footer}>PRIVATE BY DESIGN · WORKS OFFLINE</Text>
    </ScrollView>
    <BottomTabs />
  </SafeAreaView>;
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background }, content: { padding: spacing.lg, paddingBottom: 28 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 22 },
  eyebrow: { fontSize: 10, fontWeight: '700', letterSpacing: 1.4, color: colors.primary, marginBottom: 7 },
  title: { fontSize: 30, fontWeight: '800', color: colors.text, letterSpacing: -0.8 }, subtitle: { color: colors.muted, marginTop: 3, fontSize: 14 },
  logo: { width: 48, height: 48, borderRadius: 17, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' }, logoText: { color: '#FFFFFF', fontSize: 30, fontWeight: '800' },
  hero: { padding: 20, backgroundColor: '#E4F2E9', borderRadius: 24, marginBottom: 24 }, heroEyebrow: { fontSize: 9, fontWeight: '800', letterSpacing: 1.2, color: colors.primary, marginBottom: 10 },
  heroTitle: { fontSize: 23, fontWeight: '800', color: colors.text }, heroBody: { color: '#425D50', fontSize: 13, lineHeight: 19, marginTop: 8, maxWidth: 290 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 24, marginBottom: 12 }, sectionTitle: { color: colors.text, fontSize: 17, fontWeight: '700', marginBottom: 12 }, link: { color: colors.primary, fontWeight: '700', fontSize: 12 },
  statsRow: { flexDirection: 'row', gap: 9, marginBottom: 24 }, statCard: { flex: 1, minHeight: 104, borderRadius: 18, padding: 12, justifyContent: 'center' }, statBlue: { backgroundColor: '#EEF2FF' }, statGreen: { backgroundColor: '#EAF8F0' }, statAmber: { backgroundColor: '#FFF5E5' }, statIcon: { fontSize: 16, color: colors.primary, marginBottom: 5 }, statValue: { color: colors.text, fontSize: 22, fontWeight: '800', letterSpacing: -0.5 }, statLabel: { color: colors.muted, fontSize: 10, marginTop: 3, fontWeight: '600' },
  actions: { flexDirection: 'row', gap: 10 }, action: { flex: 1, backgroundColor: colors.surface, borderRadius: 16, paddingVertical: 14, alignItems: 'center', borderWidth: 1, borderColor: colors.border }, pressed: { opacity: 0.7 },
  actionIcon: { fontSize: 23, color: colors.primary, marginBottom: 8 }, actionText: { fontSize: 11, fontWeight: '700', color: colors.text },
  card: { backgroundColor: colors.surface, borderRadius: 18, borderWidth: 1, borderColor: colors.border, paddingHorizontal: 14, paddingVertical: 3 },
  empty: { color: colors.muted, fontSize: 13, lineHeight: 19, paddingVertical: 16 },
  taskRow: { minHeight: 52, flexDirection: 'row', alignItems: 'center', gap: 12 }, rowBorder: { borderTopWidth: 1, borderTopColor: colors.border },
  check: { width: 22, height: 22, borderWidth: 1.5, borderColor: '#AEBAB2', borderRadius: 7, textAlign: 'center', textAlignVertical: 'center', color: '#FFFFFF', fontSize: 13 }, checked: { backgroundColor: colors.primary, borderColor: colors.primary },
  taskText: { flex: 1, color: colors.text, fontSize: 13, fontWeight: '600' }, completed: { textDecorationLine: 'line-through', color: colors.muted }, priority: { width: 7, height: 7, borderRadius: 4, backgroundColor: '#9EB9A8' }, highPriority: { backgroundColor: colors.orange },
  noteRow: { minHeight: 58, flexDirection: 'row', alignItems: 'center', gap: 12 }, noteMark: { width: 4, height: 30, borderRadius: 4, backgroundColor: colors.primary }, noteTitle: { color: colors.text, fontSize: 13, fontWeight: '700' }, noteDate: { color: colors.muted, fontSize: 11, marginTop: 4 },
  footer: { textAlign: 'center', color: colors.muted, fontSize: 9, letterSpacing: 1.3, marginTop: 30, marginBottom: 8 },

});