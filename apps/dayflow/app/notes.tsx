import { useSQLiteContext } from 'expo-sqlite';
import { useCallback, useEffect, useState } from 'react';
import { Alert, FlatList, KeyboardAvoidingView, Platform, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors } from '../src/theme/colors';
import { BottomTabs } from '../src/components/BottomTabs';

type Note = { id: string; title: string; body: string; updated_at: string };
const makeId = () => `note-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;

export default function NotesScreen() {
  const db = useSQLiteContext();
  const [notes, setNotes] = useState<Note[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [query, setQuery] = useState('');
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    const rows = await db.getAllAsync<Note>('SELECT id, title, body, updated_at FROM notes WHERE title LIKE ? OR body LIKE ? ORDER BY is_pinned DESC, updated_at DESC', `%${query}%`, `%${query}%`);
    setNotes(rows);
  }, [db, query]);
  useEffect(() => { load().catch(() => Alert.alert('Unable to load notes', 'Please try again.')); }, [load]);

  const open = (note: Note) => { setSelected(note.id); setTitle(note.title); setBody(note.body); };
  const fresh = () => { setSelected(null); setTitle(''); setBody(''); };
  const save = async () => {
    if (!title.trim() && !body.trim()) { Alert.alert('Nothing to save', 'Add a title or some text first.'); return; }
    setSaving(true);
    try {
      const now = new Date().toISOString();
      if (selected) await db.runAsync('UPDATE notes SET title = ?, body = ?, updated_at = ? WHERE id = ?', title.trim(), body, now, selected);
      else { const id = makeId(); await db.runAsync('INSERT INTO notes(id, title, body, created_at, updated_at) VALUES (?, ?, ?, ?, ?)', id, title.trim(), body, now, now); setSelected(id); }
      await load();
      Alert.alert('Saved on this device', 'Your note is stored locally.');
    } catch { Alert.alert('Save failed', 'Your changes were not confirmed. Please try again.'); }
    finally { setSaving(false); }
  };
  const remove = () => {
    if (!selected) return;
    Alert.alert('Delete note?', 'This cannot be undone.', [{ text: 'Cancel', style: 'cancel' }, { text: 'Delete', style: 'destructive', onPress: async () => { try { await db.runAsync('DELETE FROM notes WHERE id = ?', selected); fresh(); await load(); } catch { Alert.alert('Delete failed', 'Please try again.'); } } }]);
  };

  return <SafeAreaView style={styles.safe}>
    <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={styles.header}><Text style={styles.title}>Notes</Text><Pressable accessibilityRole="button" onPress={fresh} style={styles.new}><Text style={styles.newText}>+ New</Text></Pressable></View>
      <TextInput value={query} onChangeText={setQuery} placeholder="Search your notes" placeholderTextColor={colors.muted} style={styles.search} accessibilityLabel="Search notes" />
      <View style={styles.editor}>
        <TextInput value={title} onChangeText={setTitle} placeholder="Note title" placeholderTextColor={colors.muted} style={styles.titleInput} maxLength={160} accessibilityLabel="Note title" />
        <TextInput value={body} onChangeText={setBody} placeholder="Start writing..." placeholderTextColor={colors.muted} multiline textAlignVertical="top" style={styles.bodyInput} accessibilityLabel="Note content" />
        <View style={styles.actions}><Pressable accessibilityRole="button" onPress={save} disabled={saving} style={[styles.save, saving && { opacity: 0.6 }]}><Text style={styles.saveText}>{saving ? 'Saving…' : 'Save note'}</Text></Pressable>{selected && <Pressable accessibilityRole="button" onPress={remove} style={styles.delete}><Text style={styles.deleteText}>Delete</Text></Pressable>}</View>
      </View>
      <Text style={styles.section}>Your notes · {notes.length}</Text>
      <FlatList data={notes} keyExtractor={item => item.id} keyboardShouldPersistTaps="handled" contentContainerStyle={{ paddingBottom: 24 }} ListEmptyComponent={<Text style={styles.empty}>No notes yet. Create one above to capture an idea.</Text>} renderItem={({ item }) => <Pressable onPress={() => open(item)} accessibilityRole="button" style={[styles.row, selected === item.id && styles.selected]}><Text numberOfLines={1} style={styles.rowTitle}>{item.title || 'Untitled note'}</Text><Text numberOfLines={2} style={styles.rowBody}>{item.body || 'No additional text'}</Text><Text style={styles.date}>{new Date(item.updated_at).toLocaleString()}</Text></Pressable>} />
    </KeyboardAvoidingView>
  </SafeAreaView>;
}

const styles = StyleSheet.create({
  safe:{flex:1,backgroundColor:colors.background},flex:{flex:1,padding:16},header:{flexDirection:'row',alignItems:'center',justifyContent:'space-between',marginBottom:14},title:{fontSize:28,fontWeight:'800',color:colors.text},new:{backgroundColor:colors.primary,borderRadius:12,paddingHorizontal:16,paddingVertical:10},newText:{color:'#fff',fontWeight:'700'},search:{backgroundColor:'#fff',borderWidth:1,borderColor:colors.border,borderRadius:13,padding:13,color:colors.text,marginBottom:12},editor:{backgroundColor:'#fff',borderRadius:18,borderWidth:1,borderColor:colors.border,padding:14},titleInput:{fontSize:18,fontWeight:'700',color:colors.text,paddingVertical:8},bodyInput:{minHeight:100,color:colors.text,fontSize:14,lineHeight:21,paddingVertical:8},actions:{flexDirection:'row',gap:10,marginTop:8},save:{backgroundColor:colors.primary,borderRadius:11,padding:12,alignItems:'center',flex:1},saveText:{color:'#fff',fontWeight:'700'},delete:{borderRadius:11,borderWidth:1,borderColor:colors.danger,padding:12},deleteText:{color:colors.danger,fontWeight:'700'},section:{fontSize:15,fontWeight:'800',color:colors.text,marginTop:22,marginBottom:10},empty:{color:colors.muted,padding:18,textAlign:'center',lineHeight:20},row:{backgroundColor:'#fff',padding:14,borderRadius:14,borderWidth:1,borderColor:colors.border,marginBottom:8},selected:{borderColor:colors.primary},rowTitle:{fontSize:14,fontWeight:'700',color:colors.text},rowBody:{fontSize:12,color:colors.muted,marginTop:4},date:{fontSize:10,color:colors.muted,marginTop:8}
});