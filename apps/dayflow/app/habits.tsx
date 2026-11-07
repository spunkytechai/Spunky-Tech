import { useSQLiteContext } from 'expo-sqlite';
import { useCallback, useState } from 'react';
import { useFocusEffect } from 'expo-router';
import { Alert, FlatList, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors } from '../src/theme/colors';
import { BottomTabs } from '../src/components/BottomTabs';
import { localDate } from '../src/utils/date';
import { createLocalId } from '../src/db/id';
import { calculateHabitStats } from '../src/utils/habitStats';
import { HABIT_WEEKDAYS, parseHabitSchedule, serializeHabitSchedule, toggleHabitDay } from '../src/utils/habitSchedule';

type Habit = { id: string; name: string; schedule_days: string; completed_dates: string; today_done: number; completed_days: number; current_streak: number; scheduled_today: boolean };

export default function HabitsScreen() {
  const db = useSQLiteContext();
  const [habits, setHabits] = useState<Habit[]>([]);
  const [name, setName] = useState('');
  const [editingScheduleId, setEditingScheduleId] = useState<string | null>(null);
  const [scheduleDays, setScheduleDays] = useState<number[]>([]);
  const load = useCallback(async () => {
    const rows = await db.getAllAsync<Omit<Habit, 'current_streak' | 'scheduled_today'>>(
      `SELECT h.id, h.name, h.schedule_days,
        COALESCE((SELECT group_concat(e.local_date, ',') FROM habit_entries e WHERE e.habit_id = h.id), '') AS completed_dates,
        EXISTS(SELECT 1 FROM habit_entries e WHERE e.habit_id = h.id AND e.local_date = ?) AS today_done,
        (SELECT COUNT(DISTINCT e.local_date) FROM habit_entries e WHERE e.habit_id = h.id) AS completed_days
       FROM habits h WHERE h.is_archived = 0 ORDER BY h.created_at ASC`,
      localDate(),
    );
    setHabits(rows.map((habit) => {
      const stats = calculateHabitStats(
        habit.schedule_days,
        habit.completed_dates ? habit.completed_dates.split(',') : [],
      );
      return {
        ...habit,
        today_done: stats.isCompletedToday ? 1 : 0,
        completed_days: stats.completedDays,
        current_streak: stats.currentStreak,
        scheduled_today: stats.isScheduledToday,
      };
    }));
  }, [db]);
  useFocusEffect(useCallback(() => { load().catch(() => Alert.alert('Unable to load habits', 'Please try again.')); }, [load]));
  const add = async () => {
    if (!name.trim()) { Alert.alert('Name your habit', 'Use a short, clear habit name.'); return; }
    const now = new Date().toISOString();
    try { const id = await createLocalId(db, 'habit'); await db.runAsync('INSERT INTO habits(id,name,created_at,updated_at) VALUES(?,?,?,?)',id,name.trim(),now,now);setName('');await load(); }
    catch { Alert.alert('Could not add habit','Please try again.'); }
  };
  const editSchedule = (habit: Habit) => {
    setEditingScheduleId(habit.id);
    setScheduleDays(parseHabitSchedule(habit.schedule_days));
  };
  const saveSchedule = async (habit: Habit) => {
    if (scheduleDays.length === 0) {
      Alert.alert('Choose at least one day', 'A habit needs at least one scheduled day.');
      return;
    }
    try {
      await db.runAsync('UPDATE habits SET schedule_days = ?, updated_at = ? WHERE id = ?', serializeHabitSchedule(scheduleDays), new Date().toISOString(), habit.id);
      setEditingScheduleId(null);
      await load();
    } catch {
      Alert.alert('Could not save schedule', 'Your existing schedule is unchanged. Please try again.');
    }
  };
  const toggle = async (habit: Habit) => {
    const today = localDate();
    try {
      if (habit.today_done) await db.runAsync('DELETE FROM habit_entries WHERE habit_id = ? AND local_date = ?',habit.id,today);
      else { const id = await createLocalId(db, 'habit-entry'); await db.runAsync('INSERT OR IGNORE INTO habit_entries(id,habit_id,local_date,completed_at) VALUES(?,?,?,?)',id,habit.id,today,new Date().toISOString()); }
      await load();
    } catch { Alert.alert('Could not update habit','Please try again.'); }
  };
  const archive = (habit: Habit) => Alert.alert('Archive habit?', habit.name, [{text:'Cancel',style:'cancel'},{text:'Archive',onPress:async()=>{try{await db.runAsync('UPDATE habits SET is_archived = 1, updated_at = ? WHERE id = ?',new Date().toISOString(),habit.id);await load();}catch{Alert.alert('Archive failed','Please try again.');}}}]);
  return <SafeAreaView style={styles.safe}><View style={styles.content}>
    <Text style={styles.title}>Habits</Text><Text style={styles.subtitle}>Consistency over perfection.</Text>
    <View style={styles.form}><TextInput value={name} onChangeText={setName} onSubmitEditing={add} returnKeyType="done" placeholder="Build a small daily habit" placeholderTextColor={colors.muted} maxLength={100} style={styles.input} accessibilityLabel="New habit name" /><Pressable onPress={add} accessibilityRole="button" accessibilityLabel="Add habit" style={styles.add}><Text style={styles.addText}>+</Text></Pressable></View>
    <View style={styles.summary}><Text style={styles.summaryNumber}>{habits.filter(h=>h.today_done).length}/{habits.length}</Text><View style={{flex:1}}><Text style={styles.summaryTitle}>Habits completed today</Text><Text style={styles.summaryBody}>A small win is still a win.</Text></View></View>
    <FlatList data={habits} keyExtractor={item=>item.id} contentContainerStyle={{paddingBottom:28}} ListEmptyComponent={<Text style={styles.empty}>Choose one small action you would like to repeat. You can start with just one.</Text>} renderItem={({item})=><View style={styles.habitGroup}>
      <View style={styles.habit}>
        <View style={[styles.icon,item.today_done===1&&styles.iconDone]}><Text style={styles.iconText}>{item.today_done?'✓':'◎'}</Text></View>
        <View style={{flex:1}}><Text style={styles.habitName}>{item.name}</Text><Text style={styles.habitMeta}>{item.current_streak} day streak · {item.completed_days} total</Text></View>
        <Pressable onPress={()=>toggle(item)} accessibilityRole="checkbox" accessibilityState={{checked:!!item.today_done}} accessibilityLabel={'Mark '+item.name+' '+(item.today_done?'incomplete':'complete')} style={[styles.doneButton,item.today_done===1&&styles.doneButtonActive]}><Text style={[styles.doneText,item.today_done===1&&styles.doneTextActive]}>{item.today_done?'Done':item.scheduled_today?'Mark done':'Optional check-in'}</Text></Pressable>
        <Pressable onPress={()=>archive(item)} accessibilityRole="button" accessibilityLabel={'Archive '+item.name} style={styles.more}><Text style={styles.moreText}>⋯</Text></Pressable>
      </View>
      <View style={styles.scheduleBar}>
        <Text style={styles.scheduleLabel}>Schedule</Text>
        <Text style={styles.scheduleValue}>{parseHabitSchedule(item.schedule_days).length === 7 ? 'Every day' : HABIT_WEEKDAYS.filter(day => parseHabitSchedule(item.schedule_days).includes(day.value)).map(day => day.label).join(' · ')}</Text>
        <Pressable onPress={()=>editingScheduleId===item.id?setEditingScheduleId(null):editSchedule(item)} accessibilityRole="button" accessibilityLabel={'Edit schedule for '+item.name}><Text style={styles.scheduleAction}>{editingScheduleId===item.id?'Close':'Edit'}</Text></Pressable>
      </View>
      {editingScheduleId===item.id && <View style={styles.scheduleEditor}>
        <Text style={styles.scheduleHint}>Choose the days you want to repeat this habit.</Text>
        <View style={styles.dayRow}>{HABIT_WEEKDAYS.map(day=><Pressable key={day.value} onPress={()=>setScheduleDays(current=>toggleHabitDay(current,day.value))} accessibilityRole="checkbox" accessibilityState={{checked:scheduleDays.includes(day.value)}} accessibilityLabel={day.label} style={[styles.dayChip,scheduleDays.includes(day.value)&&styles.dayChipActive]}><Text style={[styles.dayText,scheduleDays.includes(day.value)&&styles.dayTextActive]}>{day.label}</Text></Pressable>)}</View>
        <View style={styles.scheduleActions}><Pressable onPress={()=>setEditingScheduleId(null)} style={styles.cancelSchedule}><Text style={styles.cancelScheduleText}>Cancel</Text></Pressable><Pressable onPress={()=>saveSchedule(item)} style={styles.saveSchedule}><Text style={styles.saveScheduleText}>Save schedule</Text></Pressable></View>
      </View>}
    </View>} />
  </View><BottomTabs /></SafeAreaView>;
}
const styles=StyleSheet.create({safe:{flex:1,backgroundColor:colors.background},content:{flex:1,padding:16},title:{fontSize:28,fontWeight:'800',color:colors.text},subtitle:{color:colors.muted,marginTop:4,marginBottom:20},form:{flexDirection:'row',gap:8},input:{flex:1,backgroundColor:'#fff',borderWidth:1,borderColor:colors.border,borderRadius:13,paddingHorizontal:14,color:colors.text},add:{width:48,borderRadius:13,backgroundColor:colors.primary,alignItems:'center',justifyContent:'center'},addText:{color:'#fff',fontSize:25,fontWeight:'600'},summary:{flexDirection:'row',alignItems:'center',gap:15,backgroundColor:colors.primarySoft,borderRadius:18,padding:18,marginVertical:20},summaryNumber:{fontSize:28,fontWeight:'800',color:colors.primary},summaryTitle:{fontSize:13,fontWeight:'800',color:colors.text},summaryBody:{fontSize:11,color:colors.muted,marginTop:4},empty:{color:colors.muted,textAlign:'center',padding:24,lineHeight:20},habitGroup:{marginBottom:9},habit:{flexDirection:'row',alignItems:'center',gap:10,backgroundColor:'#fff',borderWidth:1,borderColor:colors.border,borderRadius:15,padding:12},icon:{width:38,height:38,borderRadius:13,backgroundColor:'#F0F3F0',alignItems:'center',justifyContent:'center'},iconDone:{backgroundColor:colors.primarySoft},iconText:{fontSize:19,color:colors.primary,fontWeight:'800'},habitName:{fontSize:13,fontWeight:'700',color:colors.text},habitMeta:{fontSize:10,color:colors.muted,marginTop:4},doneButton:{borderWidth:1,borderColor:colors.border,borderRadius:10,paddingVertical:8,paddingHorizontal:10},doneButtonActive:{backgroundColor:colors.primary,borderColor:colors.primary},doneText:{fontSize:10,fontWeight:'700',color:colors.muted},doneTextActive:{color:'#fff'},more:{paddingHorizontal:3},moreText:{fontSize:20,color:colors.muted},scheduleBar:{flexDirection:'row',alignItems:'center',gap:8,paddingHorizontal:12,paddingTop:8,paddingBottom:5},scheduleLabel:{fontSize:10,fontWeight:'700',color:colors.muted},scheduleValue:{flex:1,fontSize:10,color:colors.muted},scheduleAction:{fontSize:10,fontWeight:'800',color:colors.primary,padding:4},scheduleEditor:{backgroundColor:'#fff',borderWidth:1,borderColor:colors.border,borderRadius:13,padding:12,marginTop:4},scheduleHint:{fontSize:11,color:colors.muted,marginBottom:10},dayRow:{flexDirection:'row',justifyContent:'space-between',gap:4},dayChip:{width:39,height:36,borderRadius:10,borderWidth:1,borderColor:colors.border,alignItems:'center',justifyContent:'center',backgroundColor:colors.background},dayChipActive:{backgroundColor:colors.primarySoft,borderColor:colors.primary},dayText:{fontSize:10,fontWeight:'700',color:colors.muted},dayTextActive:{color:colors.primary},scheduleActions:{flexDirection:'row',justifyContent:'flex-end',gap:8,marginTop:12},cancelSchedule:{paddingVertical:8,paddingHorizontal:12},cancelScheduleText:{fontSize:11,fontWeight:'700',color:colors.muted},saveSchedule:{paddingVertical:8,paddingHorizontal:12,backgroundColor:colors.primary,borderRadius:9},saveScheduleText:{fontSize:11,fontWeight:'700',color:'#fff'}});
