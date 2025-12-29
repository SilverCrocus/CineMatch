import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ScrollView,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useState } from 'react';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { api, SessionSource } from '../../lib/api';
import { GENRES } from '../../lib/genres';

type Tab = 'filters' | 'url' | 'text';

export default function CreateSessionScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [activeTab, setActiveTab] = useState<Tab>('filters');
  const [loading, setLoading] = useState(false);

  // Filters state
  const [selectedGenres, setSelectedGenres] = useState<number[]>([]);
  const [yearFrom, setYearFrom] = useState('');
  const [yearTo, setYearTo] = useState('');

  // URL state
  const [url, setUrl] = useState('');

  // Text state
  const [textList, setTextList] = useState('');

  const toggleGenre = (id: number) => {
    setSelectedGenres((prev) =>
      prev.includes(id) ? prev.filter((g) => g !== id) : [...prev, id]
    );
  };

  const handleCreate = async () => {
    setLoading(true);

    try {
      let source: SessionSource = { type: activeTab };

      if (activeTab === 'filters') {
        source.filters = {
          genres: selectedGenres.length > 0 ? selectedGenres : undefined,
          yearFrom: yearFrom ? parseInt(yearFrom) : undefined,
          yearTo: yearTo ? parseInt(yearTo) : undefined,
        };
      } else if (activeTab === 'url') {
        if (!url.trim()) {
          Alert.alert('Error', 'Please enter a URL');
          setLoading(false);
          return;
        }
        source.url = url.trim();
      } else if (activeTab === 'text') {
        if (!textList.trim()) {
          Alert.alert('Error', 'Please enter movie titles');
          setLoading(false);
          return;
        }
        source.textList = textList.trim();
      }

      const data = await api.createSession(source);
      router.replace(`/session/${data.id}`);
    } catch (error) {
      Alert.alert('Error', 'Failed to create session');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Create Session</Text>
        <View style={{ width: 40 }} />
      </View>

      {/* Tab Selector */}
      <View style={styles.tabs}>
        {[
          { id: 'filters' as Tab, icon: 'options', label: 'Filters' },
          { id: 'url' as Tab, icon: 'link', label: 'URL' },
          { id: 'text' as Tab, icon: 'document-text', label: 'List' },
        ].map((tab) => (
          <TouchableOpacity
            key={tab.id}
            style={[styles.tab, activeTab === tab.id && styles.tabActive]}
            onPress={() => setActiveTab(tab.id)}
          >
            <Ionicons
              name={tab.icon as any}
              size={18}
              color={activeTab === tab.id ? '#fff' : '#888'}
            />
            <Text
              style={[styles.tabText, activeTab === tab.id && styles.tabTextActive]}
            >
              {tab.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Filters Tab */}
        {activeTab === 'filters' && (
          <View style={styles.tabContent}>
            <Text style={styles.sectionTitle}>Genres</Text>
            <View style={styles.genreGrid}>
              {GENRES.map((genre) => (
                <TouchableOpacity
                  key={genre.id}
                  style={[
                    styles.genreChip,
                    selectedGenres.includes(genre.id) && styles.genreChipSelected,
                  ]}
                  onPress={() => toggleGenre(genre.id)}
                >
                  <Text
                    style={[
                      styles.genreChipText,
                      selectedGenres.includes(genre.id) && styles.genreChipTextSelected,
                    ]}
                  >
                    {genre.name}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.sectionTitle}>Year Range</Text>
            <View style={styles.yearRow}>
              <TextInput
                style={styles.yearInput}
                placeholder="From"
                placeholderTextColor="#666"
                keyboardType="number-pad"
                value={yearFrom}
                onChangeText={setYearFrom}
                maxLength={4}
              />
              <Text style={styles.yearDash}>—</Text>
              <TextInput
                style={styles.yearInput}
                placeholder="To"
                placeholderTextColor="#666"
                keyboardType="number-pad"
                value={yearTo}
                onChangeText={setYearTo}
                maxLength={4}
              />
            </View>
          </View>
        )}

        {/* URL Tab */}
        {activeTab === 'url' && (
          <View style={styles.tabContent}>
            <Text style={styles.helpText}>
              Paste any URL with a movie list — our AI will extract the titles
            </Text>
            <TextInput
              style={styles.urlInput}
              placeholder="https://example.com/movie-list"
              placeholderTextColor="#666"
              value={url}
              onChangeText={setUrl}
              autoCapitalize="none"
              keyboardType="url"
            />
          </View>
        )}

        {/* Text Tab */}
        {activeTab === 'text' && (
          <View style={styles.tabContent}>
            <Text style={styles.helpText}>
              Enter movie titles, one per line or comma-separated
            </Text>
            <TextInput
              style={styles.textInput}
              placeholder={"The Shawshank Redemption\nPulp Fiction\nThe Dark Knight"}
              placeholderTextColor="#666"
              value={textList}
              onChangeText={setTextList}
              multiline
              textAlignVertical="top"
            />
          </View>
        )}
      </ScrollView>

      {/* Create Button */}
      <View style={[styles.footer, { paddingBottom: insets.bottom + 16 }]}>
        <TouchableOpacity
          style={[styles.createButton, loading && styles.createButtonDisabled]}
          onPress={handleCreate}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.createButtonText}>Create Session</Text>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0a0a0a',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
  tabs: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    gap: 8,
    marginBottom: 16,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
    backgroundColor: '#141414',
    borderRadius: 12,
  },
  tabActive: {
    backgroundColor: '#00b894',
  },
  tabText: {
    color: '#888',
    fontSize: 14,
    fontWeight: '500',
  },
  tabTextActive: {
    color: '#fff',
  },
  content: {
    flex: 1,
    paddingHorizontal: 16,
  },
  tabContent: {
    paddingBottom: 24,
  },
  sectionTitle: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
    marginTop: 8,
  },
  genreGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 24,
  },
  genreChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    backgroundColor: '#141414',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#222',
  },
  genreChipSelected: {
    backgroundColor: '#00b894',
    borderColor: '#00b894',
  },
  genreChipText: {
    color: '#888',
    fontSize: 14,
  },
  genreChipTextSelected: {
    color: '#fff',
  },
  yearRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  yearInput: {
    flex: 1,
    backgroundColor: '#141414',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    color: '#fff',
    fontSize: 16,
    textAlign: 'center',
    borderWidth: 1,
    borderColor: '#222',
  },
  yearDash: {
    color: '#666',
    fontSize: 18,
  },
  helpText: {
    color: '#888',
    fontSize: 14,
    marginBottom: 16,
    lineHeight: 20,
  },
  urlInput: {
    backgroundColor: '#141414',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    color: '#fff',
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#222',
  },
  textInput: {
    backgroundColor: '#141414',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    color: '#fff',
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#222',
    height: 200,
  },
  footer: {
    paddingHorizontal: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#222',
  },
  createButton: {
    backgroundColor: '#00b894',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  createButtonDisabled: {
    opacity: 0.6,
  },
  createButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
});
