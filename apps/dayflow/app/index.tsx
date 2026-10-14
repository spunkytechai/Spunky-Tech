import { useSQLiteContext } from 'expo-sqlite';
import { useCallback, useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, type Href } from 'expo-router';
import { colors, spacing } from '../src/theme/colors';
import { BottomTabs } from '../src/components/BottomTabs';

type Task = { id: string; title: string; is_completed: number; priority: string };
type Note = { id: string; title: string; updated_at: string };

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

  const load = useCallback(async () => {
    const taskRows = await db.getAllAsync<Task>('SELECT id, title, is_completed, priority FROM tasks ORDER BY is_completed ASC, due_at IS NULL, due_at ASC LIMIT 5');
    const noteRows = await db.getAllAsync<Note>('SELECT id, title, updated_at FROM notes ORDER BY is_pinned DESC, updated_at DESC LIMIT 3');
    setTasks(taskRows); setNotes(noteRows);
  }, [db]);

  useEffect(() => { load().catch(() => undefined); }, [load]);

  const go = (path: Href) => router.push(path);
  const openTask = async (task: Task) => {
    await db.runAsync('UPDATE tasks SET is_completed = ?, updated_at = ? WHERE id = ?', task.is_completed ? 0 : 1, new Date().toISOString(), task.id);
    await load();
  };

  return <SafeAreaView style={styles.safe}>
    <ScrollView contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <View><Text style={styles.eyebrow}>YOUR PERSONAL WORKSPACE</Text><Text style={styles.title}>Good day.</Text><Text style={styles.subtitle}>Make space for what matters.</Text></View>
        <View style={styles.logo}><Text style={styles.logoText}>d</Text></View>
      </View>
      <View style={styles.hero}><Text style={styles.heroEyebrow}>A LITTLE PROGRESS, EVERY DAY</Text><Text style={styles.heroTitle}>Your day, in balance.</Text><Text style={styles.heroBody}>Capture a thought, finish a task, or keep a promise to yourself.</Text></View>
      <Text style={styles.sectionTitle}>Quick capture</Text>
      <View style={styles.actions}>
        <Action label="New note" icon="▤" onPress={() => go('/notes')} />
        <Action label="Add task" icon="✓" onPress={() => go('/tasks')} />
        <Action label="Track habit" icon="◎" onPress={() => go('/habits')} />
      </View>
      <View style={styles.sectionHeader}><Text style={styles.sectionTitle}>Today's focus</Text><Pressable onPress={() => go('/tasks')}><Text style={styles.link}>See all</Text></Pressable></View>
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