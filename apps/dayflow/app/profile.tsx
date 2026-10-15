import { Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { BottomTabs } from '../src/components/BottomTabs';
import { colors } from '../src/theme/colors';

export default function ProfileScreen() {
  return <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}><View style={{ flex: 1, padding: 20 }}><Text style={{ fontSize: 28, fontWeight: '800', color: colors.text }}>Your profile</Text><Text style={{ color: colors.muted, marginTop: 8 }}>Personalize your Dayflow workspace.</Text></View><BottomTabs /></SafeAreaView>;
}
