import React, { useEffect, useState, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, Alert, Modal } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Video, ResizeMode, AVPlaybackStatus } from 'expo-av';
import { Ionicons } from '@expo/vector-icons';
import api from '../../lib/api';

export default function EpisodePlayerScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const videoRef = useRef<Video>(null);

  const [episode, setEpisode] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [showAd, setShowAd] = useState(false);
  const [adCountdown, setAdCountdown] = useState(5);

  useEffect(() => {
    const fetchEpisode = async () => {
      try {
        const res = await api.get(`/episodes/${id}`);
        setEpisode(res.data.episode);
      } catch (err: any) {
        Alert.alert('Access Denied', err.response?.data?.error || 'Cannot play video');
        router.back();
      } finally {
        setLoading(false);
      }
    };
    fetchEpisode();
  }, [id]);

  useEffect(() => {
    let timer: any;
    if (showAd && adCountdown > 0) {
      timer = setTimeout(() => {
        setAdCountdown((prev) => prev - 1);
      }, 1000);
    }
    return () => clearTimeout(timer);
  }, [showAd, adCountdown]);

  const handlePlaybackStatusUpdate = (status: AVPlaybackStatus) => {
    if (status.isLoaded && status.didJustFinish && !showAd) {
      setShowAd(true);
      setAdCountdown(5);
    }
  };

  const handleDismissAd = async () => {
    setShowAd(false);
    if (videoRef.current) {
      await videoRef.current.replayAsync();
    }
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#EC4899" />
      </View>
    );
  }

  if (!episode) return null;

  return (
    <View style={styles.container}>
      <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
        <Ionicons name="arrow-back" size={24} color="#FFF" />
      </TouchableOpacity>

      <Video
        ref={videoRef}
        style={styles.video}
        source={{ uri: episode.video_url }}
        useNativeControls
        resizeMode={ResizeMode.CONTAIN}
        isLooping={false}
        shouldPlay
        onPlaybackStatusUpdate={handlePlaybackStatusUpdate}
      />

      <View style={styles.overlayInfo}>
        <Text style={styles.title}>{episode.title}</Text>
      </View>

      {/* Post-Episode Ad Modal */}
      <Modal visible={showAd} animationType="slide" transparent={false}>
        <View style={styles.adContainer}>
          <Text style={styles.adBadge}>SPONSORED AD</Text>
          <Ionicons name="sparkles-outline" size={64} color="#EC4899" style={styles.adIcon} />
          <Text style={styles.adTitle}>Enjoying ShowDrama?</Text>
          <Text style={styles.adSubtitle}>Short advertisement in progress...</Text>

          <View style={styles.countdownBox}>
            <Text style={styles.countdownText}>
              {adCountdown > 0 ? `Ad ends in ${adCountdown}s` : 'Ad Complete'}
            </Text>
          </View>

          <TouchableOpacity
            style={[styles.closeAdBtn, adCountdown > 0 && styles.disabledBtn]}
            disabled={adCountdown > 0}
            onPress={handleDismissAd}
          >
            <Text style={styles.closeAdText}>
              {adCountdown > 0 ? 'Watching Ad...' : 'Continue to Next / Replay'}
            </Text>
          </TouchableOpacity>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  center: { flex: 1, backgroundColor: '#000', justifyContent: 'center', alignItems: 'center' },
  backButton: { position: 'absolute', top: 48, left: 16, zIndex: 10, backgroundColor: 'rgba(0,0,0,0.5)', padding: 10, borderRadius: 20 },
  video: { width: '100%', height: '100%' },
  overlayInfo: { position: 'absolute', bottom: 32, left: 16, right: 16 },
  title: { color: '#FFF', fontSize: 18, fontWeight: 'bold' },
  adContainer: { flex: 1, backgroundColor: '#0F172A', justifyContent: 'center', alignItems: 'center', padding: 24 },
  adBadge: { color: '#F472B6', fontSize: 12, fontWeight: 'bold', letterSpacing: 2, marginBottom: 16 },
  adIcon: { marginBottom: 16 },
  adTitle: { color: '#FFF', fontSize: 26, fontWeight: 'bold', textAlign: 'center' },
  adSubtitle: { color: '#94A3B8', fontSize: 15, marginTop: 8, textAlign: 'center' },
  countdownBox: { backgroundColor: '#1E293B', paddingHorizontal: 24, paddingVertical: 12, borderRadius: 20, marginVertical: 32 },
  countdownText: { color: '#EC4899', fontSize: 16, fontWeight: 'bold' },
  closeAdBtn: { backgroundColor: '#EC4899', paddingHorizontal: 32, paddingVertical: 16, borderRadius: 12, width: '100%', alignItems: 'center' },
  disabledBtn: { backgroundColor: '#334155' },
  closeAdText: { color: '#FFF', fontWeight: 'bold', fontSize: 16 },
});