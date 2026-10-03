import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, RefreshControl, ActivityIndicator, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import api from '../../lib/api';

export default function DashboardScreen() {
  const router = useRouter();
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchStats = async () => {
    try {
      const res = await api.get('/admin/stats');
      setStats(res.data.stats);
    } catch (e) {
      console.error('Failed to fetch admin stats:', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    fetchStats();
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#EC4899" />
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#EC4899" />}
    >
      <Text style={styles.header}>System Analytics</Text>

      <View style={styles.grid}>
        <View style={styles.card}>
          <Ionicons name="people" size={28} color="#3B82F6" />
          <Text style={styles.cardValue}>{stats?.total_users || 0}</Text>
          <Text style={styles.cardLabel}>Total Users</Text>
        </View>

        <View style={styles.card}>
          <Ionicons name="film" size={28} color="#10B981" />
          <Text style={styles.cardValue}>{stats?.dramas_published || 0}</Text>
          <Text style={styles.cardLabel}>Published Dramas</Text>
        </View>

        <View style={styles.card}>
          <Ionicons name="sync" size={28} color="#F59E0B" />
          <Text style={styles.cardValue}>{stats?.running_jobs || 0}</Text>
          <Text style={styles.cardLabel}>Active Pipeline Jobs</Text>
        </View>

        <View style={styles.card}>
          <Ionicons name="cash" size={28} color="#EC4899" />
          <Text style={styles.cardValue}>{stats?.estimated_revenue || '$0'}</Text>
          <Text style={styles.cardLabel}>Est. Monthly Revenue</Text>
        </View>
      </View>

      <Text style={styles.sectionHeader}>Admin Controls</Text>
      <View style={styles.adminNavList}>
        <TouchableOpacity style={styles.adminNavItem} onPress={() => router.push('/admin/generate')}>
          <Ionicons name="sparkles" size={20} color="#EC4899" />
          <Text style={styles.adminNavText}>AI Drama Generator</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.adminNavItem} onPress={() => router.push('/admin/queue')}>
          <Ionicons name="list" size={20} color="#3B82F6" />
          <Text style={styles.adminNavText}>Pipeline Queue</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.adminNavItem} onPress={() => router.push('/admin/dramas')}>
          <Ionicons name="folder-open" size={20} color="#10B981" />
          <Text style={styles.adminNavText}>Manage Dramas</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.adminNavItem} onPress={() => router.push('/admin/users')}>
          <Ionicons name="people-circle" size={20} color="#F59E0B" />
          <Text style={styles.adminNavText}>Manage Users</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0F172A', padding: 16 },
  center: { flex: 1, backgroundColor: '#0F172A', justifyContent: 'center', alignItems: 'center' },
  header: { color: '#FFF', fontSize: 22, fontWeight: 'bold', marginBottom: 20 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
  card: { backgroundColor: '#1E293B', width: '48%', borderRadius: 16, padding: 20, marginBottom: 16, alignItems: 'center' },
  cardValue: { color: '#FFF', fontSize: 28, fontWeight: 'bold', marginVertical: 8 },
  cardLabel: { color: '#94A3B8', fontSize: 12, textTransform: 'uppercase', textAlign: 'center' },
  sectionHeader: { color: '#FFF', fontSize: 18, fontWeight: 'bold', marginTop: 16, marginBottom: 12 },
  adminNavList: { gap: 10, marginBottom: 30 },
  adminNavItem: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#1E293B', padding: 16, borderRadius: 12, gap: 12 },
  adminNavText: { color: '#FFF', fontSize: 16, fontWeight: '600' },
});