import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import api from '../../lib/api';

export default function GenerateScreen() {
  const router = useRouter();
  const [sourceUrl, setSourceUrl] = useState('');
  const [selectedVideo, setSelectedVideo] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const handlePickVideo = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Videos,
      allowsEditing: false,
      quality: 1,
    });

    if (!result.canceled && result.assets && result.assets.length > 0) {
      setSelectedVideo(result.assets[0]);
    }
  };

  const handleStartPipeline = async () => {
    if (!sourceUrl && !selectedVideo) {
      Alert.alert('Missing Input', 'Please paste a source video URL or upload a video file');
      return;
    }

    setLoading(true);
    try {
      if (selectedVideo) {
        const formData = new FormData();
        formData.append('video', {
          uri: selectedVideo.uri,
          type: 'video/mp4',
          name: 'source.mp4',
        } as any);

        const res = await api.post('/admin/pipeline/start', formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
        Alert.alert('Pipeline Started!', `Job ID: ${res.data.job_id}`);
      } else {
        const res = await api.post('/admin/pipeline/start', { source_url: sourceUrl });
        Alert.alert('Pipeline Started!', `Job ID: ${res.data.job_id}`);
      }

      setSourceUrl('');
      setSelectedVideo(null);
      router.push('/admin/queue');
    } catch (err: any) {
      Alert.alert('Failed to Start', err.response?.data?.error || err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>AI Drama Generator</Text>
      <Text style={styles.subtitle}>Paste a YouTube / TikTok / Reel URL or upload a video file</Text>

      <Text style={styles.label}>Option 1: Video URL</Text>
      <TextInput
        style={styles.input}
        placeholder="https://www.youtube.com/watch?v=..."
        placeholderTextColor="#64748B"
        value={sourceUrl}
        onChangeText={(text) => {
          setSourceUrl(text);
          if (text) setSelectedVideo(null);
        }}
        autoCapitalize="none"
      />

      <Text style={styles.orText}>— OR —</Text>

      <Text style={styles.label}>Option 2: Upload Video</Text>
      <TouchableOpacity style={styles.uploadBox} onPress={handlePickVideo}>
        <Text style={styles.uploadText}>
          {selectedVideo ? `Selected: ${selectedVideo.fileName || 'source.mp4'}` : 'Tap to Pick Video File'}
        </Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.submitBtn} onPress={handleStartPipeline} disabled={loading}>
        {loading ? <ActivityIndicator color="#FFF" /> : <Text style={styles.submitText}>Trigger AI Pipeline</Text>}
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0F172A', padding: 20 },
  title: { color: '#FFF', fontSize: 24, fontWeight: 'bold' },
  subtitle: { color: '#94A3B8', fontSize: 14, marginTop: 4, marginBottom: 24 },
  label: { color: '#CBD5E1', fontSize: 14, fontWeight: '600', marginBottom: 8 },
  input: { backgroundColor: '#1E293B', color: '#FFF', borderRadius: 10, padding: 14, fontSize: 15, marginBottom: 16 },
  orText: { color: '#64748B', textAlign: 'center', marginVertical: 12, fontWeight: 'bold' },
  uploadBox: { backgroundColor: '#1E293B', borderWidth: 2, borderColor: '#334155', borderStyle: 'dashed', borderRadius: 12, padding: 24, alignItems: 'center', marginBottom: 24 },
  uploadText: { color: '#EC4899', fontWeight: '600' },
  submitBtn: { backgroundColor: '#EC4899', padding: 16, borderRadius: 12, alignItems: 'center', marginTop: 12 },
  submitText: { color: '#FFF', fontWeight: 'bold', fontSize: 16 },
});