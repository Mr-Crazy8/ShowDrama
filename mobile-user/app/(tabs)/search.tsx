import React, { useState } from 'react';
import { View, Text, TextInput, FlatList, Image, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import api from '../../lib/api';

export default function SearchScreen() {
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const handleSearch = async (text: string) => {
    setQuery(text);
    if (!text.trim()) {
      setResults([]);
      return;
    }
    setLoading(true);
    try {
      const res = await api.get(`/dramas/search?q=${encodeURIComponent(text)}`);
      setResults(res.data.dramas || []);
    } catch (e) {
      console.error('Search error:', e);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <TextInput
        style={styles.searchInput}
        placeholder="Search dramas by title..."
        placeholderTextColor="#64748B"
        value={query}
        onChangeText={handleSearch}
      />

      {loading ? (
        <ActivityIndicator size="large" color="#EC4899" style={{ marginTop: 24 }} />
      ) : (
        <FlatList
          data={results}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <TouchableOpacity style={styles.resultCard} onPress={() => router.push(`/drama/${item.id}`)}>
              <Image source={{ uri: item.thumbnail_url || 'https://via.placeholder.com/100' }} style={styles.thumbnail} />
              <View style={styles.info}>
                <Text style={styles.title}>{item.title}</Text>
                <Text style={styles.genre}>{item.genre}</Text>
                <Text style={styles.desc} numberOfLines={2}>{item.description}</Text>
              </View>
            </TouchableOpacity>
          )}
          ListEmptyComponent={
            query.trim() ? (
              <Text style={styles.emptyText}>No dramas found for "{query}"</Text>
            ) : (
              <Text style={styles.emptyText}>Type a title to start searching</Text>
            )
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0F172A', padding: 16 },
  searchInput: { backgroundColor: '#1E293B', color: '#FFF', borderRadius: 12, padding: 14, fontSize: 16, marginBottom: 16 },
  resultCard: { flexDirection: 'row', backgroundColor: '#1E293B', borderRadius: 12, padding: 12, marginBottom: 12 },
  thumbnail: { width: 70, height: 100, borderRadius: 8 },
  info: { flex: 1, marginLeft: 12, justifyContent: 'center' },
  title: { color: '#FFF', fontSize: 16, fontWeight: 'bold' },
  genre: { color: '#EC4899', fontSize: 12, marginVertical: 4, textTransform: 'capitalize' },
  desc: { color: '#94A3B8', fontSize: 13 },
  emptyText: { color: '#64748B', textAlign: 'center', marginTop: 40, fontSize: 15 },
});
