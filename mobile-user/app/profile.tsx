import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '../store/authStore';

export default function ProfileScreen() {
  const router = useRouter();
  const { user, logout } = useAuthStore();

  const handleLogout = async () => {
    await logout();
    router.replace('/auth/login');
  };

  return (
    <View style={styles.container}>
      <View style={styles.profileHeader}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{user?.email?.[0]?.toUpperCase() || 'U'}</Text>
        </View>
        <Text style={styles.username}>{user?.username || user?.email}</Text>
        <Text style={styles.email}>{user?.email}</Text>
      </View>

      <View style={styles.actionSection}>
        {user?.is_admin && (
          <TouchableOpacity style={styles.adminBtn} onPress={() => router.push('/admin')}>
            <Ionicons name="shield-checkmark" size={20} color="#FFF" />
            <Text style={styles.adminBtnText}>Admin Panel</Text>
          </TouchableOpacity>
        )}

        <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
          <Text style={styles.logoutText}>Log Out</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0F172A', padding: 24, justifyContent: 'space-between' },
  profileHeader: { alignItems: 'center', marginTop: 40 },
  avatar: { width: 80, height: 80, borderRadius: 40, backgroundColor: '#EC4899', justifyContent: 'center', alignItems: 'center', marginBottom: 16 },
  avatarText: { color: '#FFF', fontSize: 32, fontWeight: 'bold' },
  username: { color: '#FFF', fontSize: 22, fontWeight: 'bold' },
  email: { color: '#94A3B8', fontSize: 14, marginTop: 4 },
  actionSection: { width: '100%', marginBottom: 32, gap: 12 },
  adminBtn: { backgroundColor: '#3B82F6', flexDirection: 'row', padding: 16, borderRadius: 12, alignItems: 'center', justifyContent: 'center', gap: 8 },
  adminBtnText: { color: '#FFF', fontWeight: 'bold', fontSize: 16 },
  logoutBtn: { backgroundColor: '#EF4444', padding: 16, borderRadius: 12, alignItems: 'center' },
  logoutText: { color: '#FFF', fontWeight: 'bold', fontSize: 16 },
});