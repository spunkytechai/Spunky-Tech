import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SQLiteProvider } from 'expo-sqlite';
import { initializeDatabase } from '../src/db/database';

export default function RootLayout() {
  return (
    <SQLiteProvider databaseName="dayflow.db" onInit={initializeDatabase}>
      <StatusBar style="auto" />
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: '#F7F8F6' } }}>
        <Stack.Screen name="index" />
        <Stack.Screen name="notes" />
        <Stack.Screen name="tasks" />
        <Stack.Screen name="habits" />
        <Stack.Screen name="profile" />
        <Stack.Screen name="settings" />
      </Stack>
    </SQLiteProvider>
  );
}