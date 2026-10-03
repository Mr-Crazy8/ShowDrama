import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, StyleSheet, TextInput, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import api from '../../lib/api';

export default function UsersScreen() {
  const [users, setUsers] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  const fetchUsers = async () => {
    try {
      const res = await api.get(`/admin/users?email=${encodeURIComponent(search)}`);
      setUsers(res.data.users || []);
    } catch (e) {
      console.error('Failed to fetch users:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, [search]);

  const handleToggleBan = async (userId: string, currentBanStatus: boolean) => {
    try {
      await api.patch(`/admin/users/${userId}`, { is_banned: !currentBanStatus });
      fetchUsers();
    } catch (err: any) {
      Alert.alert('Error', err.message);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.header}>User Management</Text>
      <TextInput
        style={styles.searchInput}
        placeholder="Search user by email..."
        placeholderTextColor="#64748B"
        value={search}
        onChangeText={setSearch}
      />

      {loading ? (
        <ActivityIndicator size="large" color="#EC4899" style={{ marginTop: 40 }} />
      ) : (
        <FlatList
          data={users}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <View style={styles.userCard}>
              <View style={styles.userInfo}>
                <Text style={styles.userEmail}>{item.email}</Text>
                <Text style={styles.userMeta}>Username: {item.username || 'N/A'}</Text>
              </View>

              <View style={styles.userActions}>
                <TouchableOpacity
                  style={[styles.banBtn, { backgroundColor: item.is_banned ? '#10B981' : '#EF4444' }]}
                  onPress={() => handleToggleBan(item.id, item.is_banned)}
                >
                  <Text style={styles.actionText}>{item.is_banned ? 'Unban' : 'Ban'}</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
          ListEmptyComponent={<Text style={styles.empty}>No users found.</Text>}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0F172A', padding: 16 },
  header: { color: '#FFF', fontSize: 22, fontWeight: 'bold', marginBottom: 16 },
  searchInput: { backgroundColor: '#1E293B', color: '#FFF', borderRadius: 10, padding: 12, fontSize: 15, marginBottom: 16 },
  userCard: { backgroundColor: '#1E293B', borderRadius: 12, padding: 14, marginBottom: 12, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  userInfo: { flex: 1 },
  userEmail: { color: '#FFF', fontSize: 15, fontWeight: 'bold' },
  userMeta: { color: '#94A3B8', fontSize: 12, marginTop: 4 },
  userActions: { flexDirection: 'row', gap: 8 },
  banBtn: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 6 },
  actionText: { color: '#FFF', fontSize: 12, fontWeight: 'bold' },
  empty: { color: '#64748B', textAlign: 'center', marginTop: 40, fontSize: 15 },
});