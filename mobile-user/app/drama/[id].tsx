import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Image, ScrollView, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import api from '../../lib/api';

export default function DramaDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();

  const [drama, setDrama] = useState<any>(null);
  const [episodes, setEpisodes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchDetails = async () => {
    try {
      const res = await api.get(`/dramas/${id}`);
      setDrama(res.data.drama);
      setEpisodes(res.data.episodes || []);
    } catch (e: any) {
      Alert.alert('Error', e.response?.data?.error || 'Failed to load drama details');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDetails();
  }, [id]);

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#EC4899" />
      </View>
    );
  }

  if (!drama) return null;

  return (
    <ScrollView style={styles.container}>
      <Image source={{ uri: drama.thumbnail_url || 'https://via.placeholder.com/600x400' }} style={styles.banner} />
      <View style={styles.infoSection}>
        <Text style={styles.genreBadge}>{drama.genre?.toUpperCase()}</Text>
        <Text style={styles.title}>{drama.title}</Text>
        <Text style={styles.description}>{drama.description}</Text>
      </View>

      <Text style={styles.sectionTitle}>Episodes ({episodes.length})</Text>

      {episodes.map((ep) => (
        <View key={ep.id} style={styles.episodeRow}>
          <View style={styles.epInfo}>
            <Text style={styles.epTitle}>Ep {ep.episode_number}: {ep.title || `Episode ${ep.episode_number}`}</Text>
            <Text style={styles.epDuration}>{ep.duration_seconds || 30}s</Text>
          </View>

          <TouchableOpacity style={styles.watchBtn} onPress={() => router.push(`/episode/${ep.id}`)}>
            <Ionicons name="play" size={16} color="#FFF" />
            <Text style={styles.watchText}>Watch</Text>
          </TouchableOpacity>
        </View>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0F172A' },
  center: { flex: 1, backgroundColor: '#0F172A', justifyContent: 'center', alignItems: 'center' },
  banner: { width: '100%', height: 240, backgroundColor: '#1E293B' },
  infoSection: { padding: 16 },
  genreBadge: { color: '#EC4899', fontWeight: 'bold', fontSize: 12, marginBottom: 4 },
  title: { color: '#FFF', fontSize: 24, fontWeight: 'bold' },
  description: { color: '#94A3B8', fontSize: 14, marginTop: 8, lineHeight: 20 },
  sectionTitle: { color: '#FFF', fontSize: 18, fontWeight: 'bold', paddingHorizontal: 16, marginTop: 16, marginBottom: 12 },
  episodeRow: { flexDirection: 'row', backgroundColor: '#1E293B', marginHorizontal: 16, marginBottom: 12, borderRadius: 12, padding: 16, alignItems: 'center', justifyContent: 'space-between' },
  epInfo: { flex: 1 },
  epTitle: { color: '#FFF', fontSize: 15, fontWeight: '600' },
  epDuration: { color: '#64748B', fontSize: 12, marginTop: 4 },
  watchBtn: { flexDirection: 'row', backgroundColor: '#EC4899', paddingHorizontal: 16, paddingVertical: 10, borderRadius: 8, alignItems: 'center' },
  watchText: { color: '#FFF', fontWeight: 'bold', marginLeft: 6 },
});