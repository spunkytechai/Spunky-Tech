import { useCallback, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { SafeAreaView } from 'react-native-safe-area-context';
import { BottomTabs } from '../src/components/BottomTabs';
import { colors } from '../src/theme/colors';

export default function SettingsScreen() {
  const db = useSQLiteContext();
  const router = useRouter();
  const [showFocus, setShowFocus] = useState(true);
  const [weekStart, setWeekStart] = useState<'monday' | 'sunday'>('monday');

  const load = useCallback(async () => {
    const rows = await db.getAllAsync<{ key: string; value: string }>(
      "SELECT key, value FROM app_settings WHERE key IN ('show_daily_focus', 'week_start')",
    );
    const values = Object.fromEntries(rows.map(row => [row.key, row.value]));
    setShowFocus(values.show_daily_focus !== '0');
    setWeekStart(values.week_start === 'sunday' ? 'sunday' : 'monday');
  }, [db]);

  useFocusEffect(useCallback(() => { load().catch(() => Alert.alert('Settings unavailable', 'Please reopen this screen.')); }, [load]));

  const save = async (key: string, value: string) => {
    try {
      await db.runAsync(
        'INSERT INTO app_settings(key, value, updated_at) VALUES(?, ?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at',
        key, value, new Date().toISOString(),
      );
    } catch {
      Alert.alert('Could not save setting', 'Please try again.');
      await load();
    }
  };

  const changeFocus = (value: boolean) => {
    setShowFocus(value);
    save('show_daily_focus', value ? '1' : '0').catch(() => undefined);
  };

  const changeWeekStart = (value: 'monday' | 'sunday') => {
    setWeekStart(value);
    save('week_start', value).catch(() => undefined);
  };

  return <SafeAreaView style={styles.safe}>
    <ScrollView contentContainerStyle={styles.content}>
      <Pressable onPress={() => router.back()} accessibilityRole="button" style={styles.back}><Text style={styles.backText}>‹  Back</Text></Pressable>
      <Text style={styles.eyebrow}>MAKE IT YOURS</Text>
      <Text style={styles.title}>Settings</Text>
      <Text style={styles.subtitle}>Shape your workspace around the way you work.</Text>

      <Text style={styles.section}>WORKSPACE</Text>
      <View style={styles.card}>
        <View style={styles.settingRow}>
          <View style={styles.settingCopy}><Text style={styles.settingTitle}>Daily focus card</Text><Text style={styles.settingDescription}>Show or hide your daily priority on the home screen.</Text></View>
          <Switch value={showFocus} onValueChange={changeFocus} trackColor={{ false: '#D8DCE4', true: colors.primarySoft }} thumbColor={showFocus ? colors.primary : '#FFFFFF'} accessibilityLabel="Show daily focus card" />
        </View>
        <View style={styles.divider} />
        <Text style={styles.settingTitle}>Week starts on</Text>
        <Text style={styles.settingDescription}>Your preference is saved locally for upcoming calendar and planning views.</Text>
        <View style={styles.options}>
          <Pressable accessibilityRole="radio" accessibilityState={{ selected: weekStart === 'monday' }} onPress={() => changeWeekStart('monday')} style={[styles.option, weekStart === 'monday' && styles.optionSelected]}><Text style={[styles.optionText, weekStart === 'monday' && styles.optionTextSelected]}>Monday</Text></Pressable>
          <Pressable accessibilityRole="radio" accessibilityState={{ selected: weekStart === 'sunday' }} onPress={() => changeWeekStart('sunday')} style={[styles.option, weekStart === 'sunday' && styles.optionSelected]}><Text style={[styles.optionText, weekStart === 'sunday' && styles.optionTextSelected]}>Sunday</Text></Pressable>
        </View>
      </View>

      <Text style={styles.section}>PRIVACY & STORAGE</Text>
      <View style={styles.card}>
        <View style={styles.privacyMark}><Text style={styles.privacyMarkText}>✓</Text></View>
        <Text style={styles.settingTitle}>Your data stays on this device</Text>
        <Text style={styles.settingDescription}>Notes, tasks, habits, profile, and preferences use local storage. Dayflow does not require an account or cloud sync.</Text>
      </View>

      <Text style={styles.section}>ABOUT DAYFLOW</Text>
      <View style={styles.card}>
        <View style={styles.aboutRow}><View style={styles.appMark}><Text style={styles.appMarkText}>d</Text></View><View style={{ flex: 1 }}><Text style={styles.settingTitle}>Dayflow</Text><Text style={styles.settingDescription}>Personal productivity workspace</Text></View><Text style={styles.version}>v1.0.0</Text></View>
        <Text style={styles.footnote}>Built for small steps and steadier days.</Text>
      </View>
    </ScrollView>
    <BottomTabs />
  </SafeAreaView>;
}

const styles = StyleSheet.create({
  safe:{flex:1,backgroundColor:colors.background},content:{padding:18,paddingBottom:28},back:{alignSelf:'flex-start',paddingVertical:8,paddingRight:16,marginBottom:14},backText:{fontSize:14,fontWeight:'700',color:colors.primary},eyebrow:{fontSize:10,fontWeight:'800',letterSpacing:1.4,color:colors.primary,marginBottom:8},title:{fontSize:30,fontWeight:'800',color:colors.text},subtitle:{fontSize:13,lineHeight:20,color:colors.muted,marginTop:7,marginBottom:28},section:{fontSize:10,fontWeight:'800',letterSpacing:1.2,color:colors.muted,marginBottom:10,marginTop:8},card:{backgroundColor:colors.surface,borderWidth:1,borderColor:colors.border,borderRadius:20,padding:17,marginBottom:22},settingRow:{flexDirection:'row',alignItems:'center',gap:14},settingCopy:{flex:1},settingTitle:{fontSize:14,fontWeight:'800',color:colors.text},settingDescription:{fontSize:11,lineHeight:17,color:colors.muted,marginTop:5},divider:{height:1,backgroundColor:colors.border,marginVertical:18},options:{flexDirection:'row',gap:9,marginTop:14},option:{flex:1,alignItems:'center',justifyContent:'center',minHeight:43,borderRadius:12,borderWidth:1,borderColor:colors.border,backgroundColor:colors.background},optionSelected:{backgroundColor:colors.primarySoft,borderColor:colors.primary},optionText:{fontSize:12,fontWeight:'700',color:colors.muted},optionTextSelected:{color:colors.primary},privacyMark:{width:34,height:34,borderRadius:12,backgroundColor:colors.primarySoft,alignItems:'center',justifyContent:'center',marginBottom:12},privacyMarkText:{fontSize:17,fontWeight:'900',color:colors.primary},aboutRow:{flexDirection:'row',alignItems:'center',gap:12},appMark:{width:44,height:44,borderRadius:15,backgroundColor:colors.primarySoft,alignItems:'center',justifyContent:'center'},appMarkText:{fontSize:25,fontWeight:'900',color:colors.primary},version:{fontSize:10,color:colors.muted,fontWeight:'700'},footnote:{fontSize:11,color:colors.muted,marginTop:14},
});
