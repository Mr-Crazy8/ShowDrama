import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, StyleSheet, Image, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import api from '../../lib/api';

export default function AdminDramasScreen() {
  const router = useRouter();
  const [dramas, setDramas] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchDramas = async () => {
    try {
      const res = await api.get('/admin/dramas');
      setDramas(res.data.dramas || []);
    } catch (e) {
      console.error('Failed to fetch admin dramas:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDramas();
  }, []);

  return (
    <View style={styles.container}>
      <Text style={styles.header}>All Dramas Catalog</Text>

      {loading ? (
        <ActivityIndicator size="large" color="#EC4899" style={{ marginTop: 40 }} />
      ) : (
        <FlatList
          data={dramas}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <TouchableOpacity style={styles.card} onPress={() => router.push(`/admin/review/${item.id}`)}>
              <Image source={{ uri: item.thumbnail_url || 'https://via.placeholder.com/100' }} style={styles.thumb} />
              <View style={styles.info}>
                <Text style={styles.title}>{item.title}</Text>
                <Text style={styles.genre}>{item.genre}</Text>
                <View style={[styles.statusBadge, { backgroundColor: item.status === 'published' ? '#10B981' : '#F59E0B' }]}>
                  <Text style={styles.statusText}>{item.status.toUpperCase()}</Text>
                </View>
              </View>
            </TouchableOpacity>
          )}
          ListEmptyComponent={<Text style={styles.empty}>No dramas in system yet.</Text>}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0F172A', padding: 16 },
  header: { color: '#FFF', fontSize: 22, fontWeight: 'bold', marginBottom: 16 },
  card: { flexDirection: 'row', backgroundColor: '#1E293B', borderRadius: 12, padding: 12, marginBottom: 12 },
  thumb: { width: 70, height: 90, borderRadius: 8 },
  info: { flex: 1, marginLeft: 12, justifyContent: 'center' },
  title: { color: '#FFF', fontSize: 16, fontWeight: 'bold' },
  genre: { color: '#94A3B8', fontSize: 13, marginVertical: 4, textTransform: 'capitalize' },
  statusBadge: { alignSelf: 'flex-start', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 4, marginTop: 4 },
  statusText: { color: '#FFF', fontSize: 10, fontWeight: 'bold' },
  empty: { color: '#64748B', textAlign: 'center', marginTop: 40, fontSize: 15 },
});