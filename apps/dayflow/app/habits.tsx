import { useSQLiteContext } from 'expo-sqlite';
import { useCallback, useEffect, useState } from 'react';
import { Alert, FlatList, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors } from '../src/theme/colors';
import { BottomTabs } from '../src/components/BottomTabs';

type Habit = { id: string; name: string; today_done: number; streak: number };
const makeId = () => `habit-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
const localDate = (date = new Date()) => `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`;

export default function HabitsScreen() {
  const db = useSQLiteContext();
  const [habits, setHabits] = useState<Habit[]>([]);
  const [name, setName] = useState('');
  const load = useCallback(async () => {
    const today = localDate();
    const rows = await db.getAllAsync<Habit>(`SELECT h.id, h.name,
      EXISTS(SELECT 1 FROM habit_entries e WHERE e.habit_id = h.id AND e.local_date = ?) AS today_done,
      (SELECT COUNT(DISTINCT e.local_date) FROM habit_entries e WHERE e.habit_id = h.id) AS streak
      FROM habits h WHERE h.is_archived = 0 ORDER BY h.created_at ASC`, today);
    setHabits(rows);
  }, [db]);
  useEffect(() => { load().catch(() => Alert.alert('Unable to load habits', 'Please try again.')); }, [load]);
  const add = async () => {
    if (!name.trim()) { Alert.alert('Name your habit', 'Use a short, clear habit name.'); return; }
    const now = new Date().toISOString();
    try { await db.runAsync('INSERT INTO habits(id,name,created_at,updated_at) VALUES(?,?,?,?)',makeId(),name.trim(),now,now);setName('');await load(); }
    catch { Alert.alert('Could not add habit','Please try again.'); }
  };
  const toggle = async (habit: Habit) => {
    const today = localDate();
    try {
      if (habit.today_done) await db.runAsync('DELETE FROM habit_entries WHERE habit_id = ? AND local_date = ?',habit.id,today);
      else await db.runAsync('INSERT OR IGNORE INTO habit_entries(id,habit_id,local_date,completed_at) VALUES(?,?,?,?)',makeId(),habit.id,today,new Date().toISOString());
      await load();
    } catch { Alert.alert('Could not update habit','Please try again.'); }
  };
  const archive = (habit: Habit) => Alert.alert('Archive habit?', habit.name, [{text:'Cancel',style:'cancel'},{text:'Archive',onPress:async()=>{try{await db.runAsync('UPDATE habits SET is_archived = 1, updated_at = ? WHERE id = ?',new Date().toISOString(),habit.id);await load();}catch{Alert.alert('Archive failed','Please try again.');}}}]);
  return <SafeAreaView style={styles.safe}><View style={styles.content}>
    <Text style={styles.title}>Habits</Text><Text style={styles.subtitle}>Consistency over perfection.</Text>
    <View style={styles.form}><TextInput value={name} onChangeText={setName} onSubmitEditing={add} returnKeyType="done" placeholder="Build a small daily habit" placeholderTextColor={colors.muted} maxLength={100} style={styles.input} accessibilityLabel="New habit name" /><Pressable onPress={add} accessibilityRole="button" style={styles.add}><Text style={styles.addText}>+</Text></Pressable></View>
    <View style={styles.summary}><Text style={styles.summaryNumber}>{habits.filter(h=>h.today_done).length}/{habits.length}</Text><View style={{flex:1}}><Text style={styles.summaryTitle}>Habits completed today</Text><Text style={styles.summaryBody}>A small win is still a win.</Text></View></View>
    <FlatList data={habits} keyExtractor={item=>item.id} contentContainerStyle={{paddingBottom:28}} ListEmptyComponent={<Text style={styles.empty}>Choose one small action you'd like to repeat. You can start with just one.</Text>} renderItem={({item})=><View style={styles.habit}><View style={[styles.icon,item.today_done===1&&styles.iconDone]}><Text style={styles.iconText}>{item.today_done?'✓':'◎'}</Text></View><View style={{flex:1}}><Text style={styles.habitName}>{item.name}</Text><Text style={styles.habitMeta}>{item.streak} days completed in total</Text></View><Pressable onPress={()=>toggle(item)} accessibilityRole="checkbox" accessibilityState={{checked:!!item.today_done}} accessibilityLabel={'Mark '+item.name+' '+(item.today_done?'incomplete':'complete')} style={[styles.doneButton,item.today_done===1&&styles.doneButtonActive]}><Text style={[styles.doneText,item.today_done===1&&styles.doneTextActive]}>{item.today_done?'Done':'Mark done'}</Text></Pressable><Pressable onPress={()=>archive(item)} accessibilityLabel={'Archive '+item.name} style={styles.more}><Text style={styles.moreText}>⋯</Text></Pressable></View>} />
  </View><BottomTabs /></SafeAreaView>;
}
const styles=StyleSheet.create({safe:{flex:1,backgroundColor:colors.background},content:{flex:1,padding:16},title:{fontSize:28,fontWeight:'800',color:colors.text},subtitle:{color:colors.muted,marginTop:4,marginBottom:20},form:{flexDirection:'row',gap:8},input:{flex:1,backgroundColor:'#fff',borderWidth:1,borderColor:colors.border,borderRadius:13,paddingHorizontal:14,color:colors.text},add:{width:48,borderRadius:13,backgroundColor:colors.primary,alignItems:'center',justifyContent:'center'},addText:{color:'#fff',fontSize:25,fontWeight:'600'},summary:{flexDirection:'row',alignItems:'center',gap:15,backgroundColor:colors.primarySoft,borderRadius:18,padding:18,marginVertical:20},summaryNumber:{fontSize:28,fontWeight:'800',color:colors.primary},summaryTitle:{fontSize:13,fontWeight:'800',color:colors.text},summaryBody:{fontSize:11,color:colors.muted,marginTop:4},empty:{color:colors.muted,textAlign:'center',padding:24,lineHeight:20},habit:{flexDirection:'row',alignItems:'center',gap:10,backgroundColor:'#fff',borderWidth:1,borderColor:colors.border,borderRadius:15,padding:12,marginBottom:9},icon:{width:38,height:38,borderRadius:13,backgroundColor:'#F0F3F0',alignItems:'center',justifyContent:'center'},iconDone:{backgroundColor:colors.primarySoft},iconText:{fontSize:19,color:colors.primary,fontWeight:'800'},habitName:{fontSize:13,fontWeight:'700',color:colors.text},habitMeta:{fontSize:10,color:colors.muted,marginTop:4},doneButton:{borderWidth:1,borderColor:colors.border,borderRadius:10,paddingVertical:8,paddingHorizontal:10},doneButtonActive:{backgroundColor:colors.primary,borderColor:colors.primary},doneText:{fontSize:10,fontWeight:'700',color:colors.muted},doneTextActive:{color:'#fff'},more:{paddingHorizontal:3},moreText:{fontSize:20,color:colors.muted}});
