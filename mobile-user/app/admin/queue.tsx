import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, StyleSheet, TouchableOpacity, ActivityIndicator, Alert, RefreshControl } from 'react-native';
import { useRouter } from 'expo-router';
import api from '../../lib/api';

export default function QueueScreen() {
  const router = useRouter();
  const [jobs, setJobs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchJobs = async () => {
    try {
      const res = await api.get('/admin/pipeline');
      setJobs(res.data.jobs || []);
    } catch (e) {
      console.error('Failed to fetch pipeline jobs:', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchJobs();
    const interval = setInterval(fetchJobs, 5000); // 5s auto-polling
    return () => clearInterval(interval);
  }, []);

  const handleRetry = async (jobId: string) => {
    try {
      await api.post(`/admin/pipeline/${jobId}/retry`);
      Alert.alert('Re-queued', 'Job has been reset to queue.');
      fetchJobs();
    } catch (err: any) {
      Alert.alert('Retry Failed', err.message);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'done': return '#10B981';
      case 'failed': return '#EF4444';
      case 'queued': return '#F59E0B';
      default: return '#EC4899';
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.header}>Pipeline Job Queue</Text>

      {loading ? (
        <ActivityIndicator size="large" color="#EC4899" style={{ marginTop: 40 }} />
      ) : (
        <FlatList
          data={jobs}
          keyExtractor={(item) => item.id}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchJobs(); }} tintColor="#EC4899" />}
          renderItem={({ item }) => (
            <View style={styles.jobCard}>
              <View style={styles.jobHeader}>
                <Text style={styles.jobId} numberOfLines={1}>ID: {item.id.substring(0, 8)}...</Text>
                <View style={[styles.badge, { backgroundColor: getStatusColor(item.status) }]}>
                  <Text style={styles.badgeText}>{item.status.toUpperCase()}</Text>
                </View>
              </View>

              <Text style={styles.sourceText} numberOfLines={1}>Source: {item.source_url || 'File Upload'}</Text>

              {item.error_message ? (
                <Text style={styles.errorText}>Error: {item.error_message}</Text>
              ) : (
                <Text style={styles.stepText}>Step: {item.progress_step || item.status}</Text>
              )}

              <View style={styles.actions}>
                {item.status === 'failed' && (
                  <TouchableOpacity style={styles.retryBtn} onPress={() => handleRetry(item.id)}>
                    <Text style={styles.retryText}>Retry Job</Text>
                  </TouchableOpacity>
                )}

                {item.status === 'done' && item.drama_id && (
                  <TouchableOpacity style={styles.reviewBtn} onPress={() => router.push(`/admin/review/${item.drama_id}`)}>
                    <Text style={styles.reviewText}>Review & Approve</Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>
          )}
          ListEmptyComponent={<Text style={styles.empty}>No pipeline jobs found.</Text>}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0F172A', padding: 16 },
  header: { color: '#FFF', fontSize: 22, fontWeight: 'bold', marginBottom: 16 },
  jobCard: { backgroundColor: '#1E293B', borderRadius: 12, padding: 16, marginBottom: 12 },
  jobHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  jobId: { color: '#94A3B8', fontSize: 13, fontWeight: '600' },
  badge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  badgeText: { color: '#FFF', fontSize: 11, fontWeight: 'bold' },
  sourceText: { color: '#FFF', fontSize: 14, marginBottom: 4 },
  stepText: { color: '#64748B', fontSize: 12 },
  errorText: { color: '#F87171', fontSize: 12, marginTop: 4 },
  actions: { flexDirection: 'row', marginTop: 12, justifyContent: 'flex-end' },
  retryBtn: { backgroundColor: '#EF4444', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 6 },
  retryText: { color: '#FFF', fontWeight: 'bold', fontSize: 12 },
  reviewBtn: { backgroundColor: '#10B981', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 6 },
  reviewText: { color: '#FFF', fontWeight: 'bold', fontSize: 12 },
  empty: { color: '#64748B', textAlign: 'center', marginTop: 40, fontSize: 15 },
});