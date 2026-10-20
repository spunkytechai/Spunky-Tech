import { useEffect, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSQLiteContext } from 'expo-sqlite';
import { SafeAreaView } from 'react-native-safe-area-context';
import { BottomTabs } from '../src/components/BottomTabs';
import { colors } from '../src/theme/colors';

export default function ProfileScreen() {
  const db = useSQLiteContext();
  const [nickname, setNickname] = useState('');
  const [draft, setDraft] = useState('');
  useEffect(() => {
    db.getFirstAsync<{ nickname: string }>('SELECT nickname FROM user_profile WHERE id = 1')
      .then(profile => { const value = profile?.nickname ?? ''; setNickname(value); setDraft(value); })
      .catch(() => Alert.alert('Profile unavailable', 'Please reopen this screen.'));
  }, [db]);
  const save = async () => {
    const value = draft.trim().slice(0, 24);
    if (!value) { Alert.alert('Choose a nickname', 'Enter a name first.'); return; }
    try {
      await db.runAsync('INSERT INTO user_profile(id, nickname, updated_at) VALUES(1, ?, ?) ON CONFLICT(id) DO UPDATE SET nickname = excluded.nickname, updated_at = excluded.updated_at', value, new Date().toISOString());
      setNickname(value);
      Alert.alert('Profile updated', 'Your nickname is saved on this device.');
    } catch { Alert.alert('Could not save profile', 'Please try again.'); }
  };
  return <SafeAreaView style={styles.safe}>
    <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      <Text style={styles.title}>Your profile</Text>
      <View style={styles.card}>
        <View style={styles.avatar}><Text style={styles.avatarText}>{(draft.trim()[0] || 'D').toUpperCase()}</Text></View>
        <Text style={styles.greeting}>{nickname ? 'Hey, ' + nickname : 'Make Dayflow yours'}</Text>
        <Text style={styles.subtitle}>Your own little space for everyday progress.</Text>
        <Text style={styles.badge}>PRIVATE · STORED ON THIS DEVICE</Text>
      </View>
      <Text style={styles.label}>YOUR NICKNAME</Text>
      <TextInput value={draft} onChangeText={setDraft} placeholder="What should Dayflow call you?" placeholderTextColor={colors.muted} maxLength={24} autoCapitalize="words" returnKeyType="done" onSubmitEditing={save} style={styles.input} accessibilityLabel="Your nickname" />
      <Text style={styles.helper}>{draft.trim().length}/24 characters. You can change it any time.</Text>
      <Text style={styles.label}>QUICK PICKS</Text>
      <View style={styles.chips}>{['Creator', 'Dreamer', 'Focus mode'].map(name => <Pressable key={name} onPress={() => setDraft(name)} style={styles.chip}><Text style={styles.chipText}>{name}</Text></Pressable>)}</View>
      <Pressable onPress={save} accessibilityRole="button" style={styles.save}><Text style={styles.saveText}>Save profile</Text></Pressable>
      <View style={styles.tip}><Text style={styles.tipTitle}>Your space, your rules</Text><Text style={styles.tipText}>Your nickname is stored locally. No account or cloud profile is needed.</Text></View>
    </ScrollView>
    <BottomTabs />
  </SafeAreaView>;
}
const styles = StyleSheet.create({
 safe:{flex:1,backgroundColor:colors.background},content:{padding:18,paddingBottom:26},title:{fontSize:28,fontWeight:'800',color:colors.text,marginBottom:20},card:{alignItems:'center',backgroundColor:colors.surface,borderRadius:24,borderWidth:1,borderColor:colors.border,padding:24,marginBottom:26},avatar:{width:76,height:76,borderRadius:26,backgroundColor:colors.primarySoft,alignItems:'center',justifyContent:'center',marginBottom:14},avatarText:{fontSize:34,fontWeight:'800',color:colors.primary},greeting:{fontSize:21,fontWeight:'800',color:colors.text},subtitle:{fontSize:12,color:colors.muted,marginTop:8,textAlign:'center'},badge:{fontSize:9,fontWeight:'800',letterSpacing:1,color:colors.primary,marginTop:16},label:{fontSize:10,fontWeight:'800',letterSpacing:1.1,color:colors.muted,marginBottom:9},input:{backgroundColor:colors.surface,borderWidth:1,borderColor:colors.border,borderRadius:14,paddingHorizontal:14,minHeight:52,color:colors.text,fontSize:15},helper:{fontSize:11,color:colors.muted,marginTop:8,marginBottom:24},chips:{flexDirection:'row',flexWrap:'wrap',gap:8,marginBottom:24},chip:{backgroundColor:colors.surface,borderWidth:1,borderColor:colors.border,borderRadius:20,paddingVertical:10,paddingHorizontal:14},chipText:{fontSize:12,color:colors.text,fontWeight:'600'},save:{minHeight:52,backgroundColor:colors.primary,borderRadius:15,alignItems:'center',justifyContent:'center'},saveText:{fontSize:14,fontWeight:'800',color:'#fff'},tip:{marginTop:20,padding:16,borderRadius:17,backgroundColor:colors.primarySoft},tipTitle:{fontSize:13,fontWeight:'800',color:colors.text},tipText:{fontSize:11,lineHeight:17,color:colors.muted,marginTop:6}
});
