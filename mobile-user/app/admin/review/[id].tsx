import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TextInput, ScrollView, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import api from '../../../lib/api';

export default function DramaReviewScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();

  const [drama, setDrama] = useState<any>(null);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [genre, setGenre] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const fetchDrama = async () => {
      try {
        const res = await api.get(`/dramas/${id}`);
        const d = res.data.drama;
        setDrama(d);
        setTitle(d.title || '');
        setDescription(d.description || '');
        setGenre(d.genre || 'romance');
      } catch (e: any) {
        Alert.alert('Error', e.message);
      } finally {
        setLoading(false);
      }
    };
    fetchDrama();
  }, [id]);

  const handleUpdateStatus = async (status: 'published' | 'rejected') => {
    setSaving(true);
    try {
      await api.patch(`/admin/dramas/${id}`, {
        status,
        title,
        description,
        genre,
      });
      Alert.alert('Updated', `Drama has been set to ${status}.`);
      router.back();
    } catch (err: any) {
      Alert.alert('Update Error', err.message);
    } finally {
      setSaving(false);
    }
  };

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
      <Text style={styles.sectionHeader}>Review Drama Content</Text>

      <Text style={styles.label}>Title</Text>
      <TextInput style={styles.input} value={title} onChangeText={setTitle} />

      <Text style={styles.label}>Genre</Text>
      <TextInput style={styles.input} value={genre} onChangeText={setGenre} />

      <Text style={styles.label}>Description</Text>
      <TextInput
        style={[styles.input, { height: 90 }]}
        value={description}
        onChangeText={setDescription}
        multiline
      />

      <Text style={styles.statusCurrent}>Current Status: {drama.status?.toUpperCase()}</Text>

      {saving ? (
        <ActivityIndicator size="large" color="#EC4899" style={{ marginTop: 24 }} />
      ) : (
        <View style={styles.buttonRow}>
          <TouchableOpacity style={styles.approveBtn} onPress={() => handleUpdateStatus('published')}>
            <Text style={styles.btnText}>Approve & Publish</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.rejectBtn} onPress={() => handleUpdateStatus('rejected')}>
            <Text style={styles.btnText}>Reject</Text>
          </TouchableOpacity>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0F172A', padding: 16 },
  center: { flex: 1, backgroundColor: '#0F172A', justifyContent: 'center', alignItems: 'center' },
  sectionHeader: { color: '#FFF', fontSize: 20, fontWeight: 'bold', marginBottom: 20 },
  label: { color: '#CBD5E1', fontSize: 14, fontWeight: '600', marginBottom: 6 },
  input: { backgroundColor: '#1E293B', color: '#FFF', borderRadius: 8, padding: 12, fontSize: 15, marginBottom: 16 },
  statusCurrent: { color: '#94A3B8', fontWeight: 'bold', marginVertical: 12 },
  buttonRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 16 },
  approveBtn: { backgroundColor: '#10B981', flex: 0.48, padding: 16, borderRadius: 10, alignItems: 'center' },
  rejectBtn: { backgroundColor: '#EF4444', flex: 0.48, padding: 16, borderRadius: 10, alignItems: 'center' },
  btnText: { color: '#FFF', fontWeight: 'bold', fontSize: 15 },
});