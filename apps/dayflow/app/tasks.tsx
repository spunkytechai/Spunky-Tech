import { useSQLiteContext } from 'expo-sqlite';
import { useCallback, useEffect, useState } from 'react';
import { Alert, FlatList, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors } from '../src/theme/colors';
import { BottomTabs } from '../src/components/BottomTabs';
import { dueDateForChoice, taskDueLabel } from '../src/utils/taskDueDate';

type Task = { id: string; title: string; due_at: string | null; priority: 'low'|'normal'|'high'; is_completed: number };
const makeId = () => `task-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;

export default function TasksScreen() {
  const db = useSQLiteContext();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [title, setTitle] = useState('');
  const [priority, setPriority] = useState<'low'|'normal'|'high'>('normal');
  const [dueChoice, setDueChoice] = useState<'none'|'today'|'tomorrow'>('none');
  const [filter, setFilter] = useState<'open'|'done'|'all'>('open');
  const load = useCallback(async () => {
    const rows = await db.getAllAsync<Task>(`SELECT id, title, due_at, priority, is_completed FROM tasks ${filter === 'all' ? '' : 'WHERE is_completed = ?'} ORDER BY is_completed ASC, CASE priority WHEN 'high' THEN 0 WHEN 'normal' THEN 1 ELSE 2 END, due_at ASC`, ...(filter === 'all' ? [] : [filter === 'done' ? 1 : 0]));
    setTasks(rows);
  }, [db, filter]);
  useEffect(() => { load().catch(() => Alert.alert('Unable to load tasks', 'Please try again.')); }, [load]);
  const add = async () => {
    if (!title.trim()) { Alert.alert('Add a task name', 'A task needs a short title.'); return; }
    const now = new Date().toISOString();
    const dueAt = dueDateForChoice(dueChoice);
    try { await db.runAsync('INSERT INTO tasks(id, title, due_at, priority, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)', makeId(), title.trim(), dueAt, priority, now, now); setTitle(''); setDueChoice('none'); await load(); }
    catch { Alert.alert('Could not add task', 'Please try again.'); }
  };
  const toggle = async (task: Task) => {
    try { await db.runAsync('UPDATE tasks SET is_completed = ?, updated_at = ? WHERE id = ?', task.is_completed ? 0 : 1, new Date().toISOString(), task.id); await load(); }
    catch { Alert.alert('Update failed', 'Please try again.'); }
  };
  const remove = (task: Task) => Alert.alert('Delete task?', task.title, [{text:'Cancel',style:'cancel'},{text:'Delete',style:'destructive',onPress:async()=>{try{await db.runAsync('DELETE FROM tasks WHERE id = ?',task.id);await load();}catch{Alert.alert('Delete failed','Please try again.');}}}]);
  return <SafeAreaView style={styles.safe}><View style={styles.content}>
    <Text style={styles.title}>Tasks</Text><Text style={styles.subtitle}>Turn intentions into small steps.</Text>
    <View style={styles.form}><TextInput value={title} onChangeText={setTitle} onSubmitEditing={add} returnKeyType="done" placeholder="What needs doing?" placeholderTextColor={colors.muted} maxLength={200} style={styles.input} accessibilityLabel="New task title" /><Pressable onPress={add} accessibilityRole="button" style={styles.add}><Text style={styles.addText}>+</Text></Pressable></View>
    <View style={styles.priorityRow}><Text style={styles.label}>Priority</Text>{(['low','normal','high'] as const).map(p=><Pressable key={p} onPress={()=>setPriority(p)} style={[styles.pill,priority===p&&styles.pillActive]}><Text style={[styles.pillText,priority===p&&styles.pillTextActive]}>{p[0].toUpperCase()+p.slice(1)}</Text></Pressable>)}</View>
    <View style={styles.priorityRow}><Text style={styles.label}>Due</Text>{(['none','today','tomorrow'] as const).map(d=><Pressable key={d} onPress={()=>setDueChoice(d)} style={[styles.pill,dueChoice===d&&styles.pillActive]}><Text style={[styles.pillText,dueChoice===d&&styles.pillTextActive]}>{d==='none'?'No date':d==='today'?'Today':'Tomorrow'}</Text></Pressable>)}</View>
    <View style={styles.filters}>{(['open','done','all'] as const).map(f=><Pressable key={f} onPress={()=>setFilter(f)} style={[styles.filter,filter===f&&styles.filterActive]}><Text style={[styles.filterText,filter===f&&styles.filterTextActive]}>{f==='open'?'Open':f==='done'?'Completed':'All tasks'}</Text></Pressable>)}</View>
    <FlatList data={tasks} keyExtractor={item=>item.id} contentContainerStyle={{paddingBottom:30}} ListEmptyComponent={<Text style={styles.empty}>Nothing here yet. Add a task to get started.</Text>} renderItem={({item})=><View style={styles.task}><Pressable onPress={()=>toggle(item)} accessibilityRole="checkbox" accessibilityState={{checked:!!item.is_completed}} accessibilityLabel={item.title} style={[styles.check,item.is_completed===1&&styles.checked]}><Text style={styles.checkText}>{item.is_completed?'✓':''}</Text></Pressable><Pressable onPress={()=>toggle(item)} style={{flex:1}}><Text style={[styles.taskTitle,item.is_completed===1&&styles.done]}>{item.title}</Text><Text style={styles.taskMeta}>{item.priority.toUpperCase()} PRIORITY{item.due_at ? ` · DUE ${taskDueLabel(item.due_at)}` : ''}</Text></Pressable><Pressable onPress={()=>remove(item)} accessibilityRole="button" accessibilityLabel={'Delete '+item.title} style={styles.remove}><Text style={styles.removeText}>×</Text></Pressable></View>} />
  </View><BottomTabs /></SafeAreaView>;
}
const styles=StyleSheet.create({safe:{flex:1,backgroundColor:colors.background},content:{flex:1,padding:16},title:{fontSize:28,fontWeight:'800',color:colors.text},subtitle:{color:colors.muted,marginTop:4,marginBottom:20},form:{flexDirection:'row',gap:8},input:{flex:1,backgroundColor:'#fff',borderWidth:1,borderColor:colors.border,borderRadius:13,paddingHorizontal:14,color:colors.text},add:{width:48,borderRadius:13,backgroundColor:colors.primary,alignItems:'center',justifyContent:'center'},addText:{color:'#fff',fontSize:25,fontWeight:'600'},priorityRow:{flexDirection:'row',alignItems:'center',gap:8,marginTop:12,flexWrap:'wrap'},label:{color:colors.muted,fontSize:12,marginRight:4},pill:{borderWidth:1,borderColor:colors.border,borderRadius:18,paddingVertical:6,paddingHorizontal:11},pillActive:{backgroundColor:colors.primarySoft,borderColor:colors.primary},pillText:{fontSize:11,color:colors.muted},pillTextActive:{color:colors.primary,fontWeight:'700'},filters:{flexDirection:'row',backgroundColor:'#E9EDE9',padding:4,borderRadius:12,marginTop:22,marginBottom:12},filter:{flex:1,padding:10,alignItems:'center',borderRadius:9},filterActive:{backgroundColor:'#fff'},filterText:{fontSize:11,color:colors.muted,fontWeight:'600'},filterTextActive:{color:colors.primary},empty:{color:colors.muted,textAlign:'center',padding:24,lineHeight:20},task:{flexDirection:'row',alignItems:'center',gap:12,backgroundColor:'#fff',borderWidth:1,borderColor:colors.border,borderRadius:14,padding:13,marginBottom:8},check:{width:23,height:23,borderRadius:7,borderWidth:1.5,borderColor:'#AAB7AF',alignItems:'center',justifyContent:'center'},checked:{backgroundColor:colors.primary,borderColor:colors.primary},checkText:{color:'#fff',fontWeight:'800'},taskTitle:{color:colors.text,fontSize:14,fontWeight:'700'},done:{textDecorationLine:'line-through',color:colors.muted},taskMeta:{fontSize:9,letterSpacing:0.8,color:colors.muted,marginTop:5},remove:{paddingHorizontal:8,paddingVertical:3},removeText:{fontSize:24,color:colors.muted}});
