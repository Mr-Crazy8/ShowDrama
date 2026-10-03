import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, StyleSheet, Image, TouchableOpacity, ActivityIndicator, RefreshControl } from 'react-native';
import { useRouter } from 'expo-router';
import api from '../../lib/api';

export default function HomeScreen() {
  const router = useRouter();
  const [dramas, setDramas] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchDramas = async () => {
    try {
      const res = await api.get('/dramas');
      setDramas(res.data.dramas || []);
    } catch (e) {
      console.error('Failed to fetch dramas:', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchDramas();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    fetchDramas();
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#EC4899" />
      </View>
    );
  }

  const featured = dramas[0];
  const romanceDramas = dramas.filter((d) => d.genre === 'romance');

  return (
    <ScrollView
      style={styles.container}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#EC4899" />}
    >
      {/* Featured Banner */}
      {featured ? (
        <TouchableOpacity style={styles.featuredContainer} onPress={() => router.push(`/drama/${featured.id}`)}>
          <Image source={{ uri: featured.thumbnail_url || 'https://via.placeholder.com/600x400' }} style={styles.featuredImage} />
          <View style={styles.featuredOverlay}>
            <Text style={styles.featuredBadge}>{featured.genre?.toUpperCase() || 'DRAMA'}</Text>
            <Text style={styles.featuredTitle}>{featured.title}</Text>
            <Text style={styles.featuredDesc} numberOfLines={2}>{featured.description}</Text>
          </View>
        </TouchableOpacity>
      ) : null}

      {/* New Releases Section */}
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>🔥 New Releases</Text>
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.horizontalScroll}>
        {dramas.map((drama) => (
          <TouchableOpacity key={drama.id} style={styles.card} onPress={() => router.push(`/drama/${drama.id}`)}>
            <Image source={{ uri: drama.thumbnail_url || 'https://via.placeholder.com/300x400' }} style={styles.cardImage} />
            <Text style={styles.cardTitle} numberOfLines={1}>{drama.title}</Text>
            <Text style={styles.cardGenre}>{drama.genre}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Romance Section */}
      {romanceDramas.length > 0 && (
        <>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>💕 Romantic Dramas</Text>
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.horizontalScroll}>
            {romanceDramas.map((drama) => (
              <TouchableOpacity key={drama.id} style={styles.card} onPress={() => router.push(`/drama/${drama.id}`)}>
                <Image source={{ uri: drama.thumbnail_url || 'https://via.placeholder.com/300x400' }} style={styles.cardImage} />
                <Text style={styles.cardTitle} numberOfLines={1}>{drama.title}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0F172A' },
  center: { flex: 1, backgroundColor: '#0F172A', justifyContent: 'center', alignItems: 'center' },
  featuredContainer: { height: 260, margin: 16, borderRadius: 16, overflow: 'hidden', backgroundColor: '#1E293B' },
  featuredImage: { width: '100%', height: '100%' },
  featuredOverlay: { position: 'absolute', bottom: 0, left: 0, right: 0, padding: 16, backgroundColor: 'rgba(15, 23, 42, 0.85)' },
  featuredBadge: { color: '#EC4899', fontWeight: 'bold', fontSize: 12, marginBottom: 4 },
  featuredTitle: { color: '#FFF', fontSize: 22, fontWeight: 'bold' },
  featuredDesc: { color: '#CBD5E1', fontSize: 13, marginTop: 4 },
  sectionHeader: { paddingHorizontal: 16, marginTop: 16, marginBottom: 8 },
  sectionTitle: { color: '#FFF', fontSize: 18, fontWeight: 'bold' },
  horizontalScroll: { paddingLeft: 16, marginBottom: 16 },
  card: { width: 140, marginRight: 12 },
  cardImage: { width: 140, height: 200, borderRadius: 12, backgroundColor: '#1E293B' },
  cardTitle: { color: '#FFF', fontSize: 14, fontWeight: '600', marginTop: 6 },
  cardGenre: { color: '#94A3B8', fontSize: 12, textTransform: 'capitalize' },
});
