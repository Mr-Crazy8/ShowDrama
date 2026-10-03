import React from 'react';
import { Stack, Redirect } from 'expo-router';
import { useAuthStore } from '../../store/authStore';
import { View, ActivityIndicator } from 'react-native';

export default function AdminLayout() {
  const { user, isLoading } = useAuthStore();

  if (isLoading) {
    return (
      <View style={{ flex: 1, backgroundColor: '#0F172A', justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#EC4899" />
      </View>
    );
  }

  if (!user || !user.is_admin) {
    return <Redirect href="/(tabs)" />;
  }

  return (
    <Stack screenOptions={{
      headerStyle: { backgroundColor: '#1E293B' },
      headerTintColor: '#FFF',
    }}>
      <Stack.Screen name="dashboard" options={{ title: 'Admin Dashboard' }} />
      <Stack.Screen name="generate" options={{ title: 'Generate Drama' }} />
      <Stack.Screen name="queue" options={{ title: 'Pipeline Queue' }} />
      <Stack.Screen name="dramas" options={{ title: 'Drama Management' }} />
      <Stack.Screen name="users" options={{ title: 'User Management' }} />
      <Stack.Screen name="review/[id]" options={{ title: 'Review Drama' }} />
    </Stack>
  );
}