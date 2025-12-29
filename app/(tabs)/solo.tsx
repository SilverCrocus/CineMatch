import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Modal,
} from 'react-native';
import { useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { GENRES, YEAR_PRESETS } from '../../lib/genres';

type Mode = 'menu' | 'similar-search' | 'genre-select';

export default function SoloModeScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [mode, setMode] = useState<Mode>('menu');
  const [searchQuery, setSearchQuery] = useState('');

  // Genre filter state
  const [selectedGenres, setSelectedGenres] = useState<number[]>([]);
  const [matchMode, setMatchMode] = useState<'any' | 'all'>('any');
  const [yearPreset, setYearPreset] = useState<string>('any');

  const handleSimilarSearch = () => {
    if (!searchQuery.trim()) return;
    router.push({
      pathname: '/solo/swipe',
      params: { source: 'similar', movie: searchQuery.trim() },
    });
  };

  const handleSurpriseMe = () => {
    router.push({
      pathname: '/solo/swipe',
      params: { source: 'random' },
    });
  };

  const toggleGenre = (genreId: number) => {
    setSelectedGenres((prev) =>
      prev.includes(genreId)
        ? prev.filter((id) => id !== genreId)
        : [...prev, genreId]
    );
  };

  const handleStartBrowse = () => {
    if (selectedGenres.length === 0) return;

    const params: Record<string, string> = {
      source: 'browse',
      genres: selectedGenres.join(','),
      match: matchMode,
    };

    // Add year params based on preset
    if (yearPreset !== 'any') {
      const preset = YEAR_PRESETS.find((p) => p.value === yearPreset);
      if (preset?.from) params.yearFrom = String(preset.from);
      if (preset?.to) params.yearTo = String(preset.to);
    }

    router.push({
      pathname: '/solo/swipe',
      params,
    });
  };

  const handleBackToMenu = () => {
    setMode('menu');
    setSelectedGenres([]);
    setYearPreset('any');
    setMatchMode('any');
    setSearchQuery('');
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        {mode !== 'menu' && (
          <TouchableOpacity onPress={handleBackToMenu} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color="#fff" />
          </TouchableOpacity>
        )}
        <Text style={styles.headerTitle}>
          {mode === 'menu' && 'Discover'}
          {mode === 'similar-search' && 'Find Similar'}
          {mode === 'genre-select' && 'Browse Movies'}
        </Text>
      </View>

      {mode === 'menu' && (
        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {/* Similar to... */}
          <TouchableOpacity
            style={styles.menuCard}
            onPress={() => setMode('similar-search')}
          >
            <View style={styles.menuIcon}>
              <Ionicons name="search" size={24} color="#e50914" />
            </View>
            <View style={styles.menuText}>
              <Text style={styles.menuTitle}>Similar to...</Text>
              <Text style={styles.menuSubtitle}>Find movies like one you love</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#666" />
          </TouchableOpacity>

          {/* By Genre */}
          <TouchableOpacity
            style={styles.menuCard}
            onPress={() => setMode('genre-select')}
          >
            <View style={styles.menuIcon}>
              <Ionicons name="film" size={24} color="#e50914" />
            </View>
            <View style={styles.menuText}>
              <Text style={styles.menuTitle}>By Genre</Text>
              <Text style={styles.menuSubtitle}>Browse movies by category</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#666" />
          </TouchableOpacity>

          {/* Surprise Me */}
          <TouchableOpacity style={styles.menuCard} onPress={handleSurpriseMe}>
            <View style={styles.menuIcon}>
              <Ionicons name="shuffle" size={24} color="#e50914" />
            </View>
            <View style={styles.menuText}>
              <Text style={styles.menuTitle}>Surprise Me</Text>
              <Text style={styles.menuSubtitle}>Random popular movies</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#666" />
          </TouchableOpacity>
        </ScrollView>
      )}

      {mode === 'similar-search' && (
        <View style={styles.content}>
          <Text style={styles.instruction}>
            Enter a movie you like and we'll find similar ones
          </Text>
          <View style={styles.searchRow}>
            <TextInput
              style={styles.searchInput}
              placeholder="e.g. Inception"
              placeholderTextColor="#666"
              value={searchQuery}
              onChangeText={setSearchQuery}
              onSubmitEditing={handleSimilarSearch}
              returnKeyType="search"
              autoFocus
            />
            <TouchableOpacity
              style={[
                styles.goButton,
                !searchQuery.trim() && styles.goButtonDisabled,
              ]}
              onPress={handleSimilarSearch}
              disabled={!searchQuery.trim()}
            >
              <Text style={styles.goButtonText}>Go</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {mode === 'genre-select' && (
        <View style={styles.flex}>
          <ScrollView
            style={styles.content}
            contentContainerStyle={styles.genreContent}
            showsVerticalScrollIndicator={false}
          >
            {/* Genre Selection */}
            <Text style={styles.sectionLabel}>Select genres</Text>
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

            {/* Match Mode Toggle */}
            {selectedGenres.length > 1 && (
              <>
                <Text style={styles.sectionLabel}>Match mode</Text>
                <View style={styles.toggleContainer}>
                  <TouchableOpacity
                    style={[
                      styles.toggleButton,
                      matchMode === 'any' && styles.toggleButtonActive,
                    ]}
                    onPress={() => setMatchMode('any')}
                  >
                    <Text
                      style={[
                        styles.toggleButtonText,
                        matchMode === 'any' && styles.toggleButtonTextActive,
                      ]}
                    >
                      Any genre
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[
                      styles.toggleButton,
                      matchMode === 'all' && styles.toggleButtonActive,
                    ]}
                    onPress={() => setMatchMode('all')}
                  >
                    <Text
                      style={[
                        styles.toggleButtonText,
                        matchMode === 'all' && styles.toggleButtonTextActive,
                      ]}
                    >
                      All genres
                    </Text>
                  </TouchableOpacity>
                </View>
              </>
            )}

            {/* Year Presets */}
            <Text style={styles.sectionLabel}>Era</Text>
            <View style={styles.yearGrid}>
              {YEAR_PRESETS.map((preset) => (
                <TouchableOpacity
                  key={preset.value}
                  style={[
                    styles.yearChip,
                    yearPreset === preset.value && styles.yearChipSelected,
                  ]}
                  onPress={() => setYearPreset(preset.value)}
                >
                  <Text
                    style={[
                      styles.yearChipText,
                      yearPreset === preset.value && styles.yearChipTextSelected,
                    ]}
                  >
                    {preset.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </ScrollView>

          {/* Fixed Start Button */}
          <View style={[styles.startButtonContainer, { paddingBottom: insets.bottom + 80 }]}>
            <TouchableOpacity
              style={[
                styles.startButton,
                selectedGenres.length === 0 && styles.startButtonDisabled,
              ]}
              onPress={handleStartBrowse}
              disabled={selectedGenres.length === 0}
            >
              <Text style={styles.startButtonText}>
                {selectedGenres.length === 0
                  ? 'Select at least one genre'
                  : `Start Swiping (${selectedGenres.length} genre${selectedGenres.length > 1 ? 's' : ''})`}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f0f0f',
  },
  flex: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#222',
  },
  backButton: {
    marginRight: 12,
  },
  headerTitle: {
    flex: 1,
    color: '#fff',
    fontSize: 24,
    fontWeight: 'bold',
  },
  content: {
    flex: 1,
    padding: 16,
  },
  genreContent: {
    paddingBottom: 100,
  },
  menuCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  menuIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: 'rgba(229, 9, 20, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  menuText: {
    flex: 1,
  },
  menuTitle: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 2,
  },
  menuSubtitle: {
    color: '#888',
    fontSize: 14,
  },
  instruction: {
    color: '#888',
    fontSize: 14,
    marginBottom: 16,
  },
  searchRow: {
    flexDirection: 'row',
    gap: 12,
  },
  searchInput: {
    flex: 1,
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    color: '#fff',
    fontSize: 16,
  },
  goButton: {
    backgroundColor: '#e50914',
    borderRadius: 12,
    paddingHorizontal: 24,
    justifyContent: 'center',
  },
  goButtonDisabled: {
    backgroundColor: '#333',
  },
  goButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  sectionLabel: {
    color: '#888',
    fontSize: 14,
    marginBottom: 12,
    marginTop: 8,
  },
  genreGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 16,
  },
  genreChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#1a1a1a',
    borderWidth: 1,
    borderColor: '#333',
  },
  genreChipSelected: {
    backgroundColor: '#e50914',
    borderColor: '#e50914',
  },
  genreChipText: {
    color: '#888',
    fontSize: 14,
  },
  genreChipTextSelected: {
    color: '#fff',
    fontWeight: '500',
  },
  toggleContainer: {
    flexDirection: 'row',
    backgroundColor: '#1a1a1a',
    borderRadius: 8,
    padding: 4,
    marginBottom: 16,
  },
  toggleButton: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 6,
    alignItems: 'center',
  },
  toggleButtonActive: {
    backgroundColor: '#0f0f0f',
  },
  toggleButtonText: {
    color: '#666',
    fontSize: 14,
  },
  toggleButtonTextActive: {
    color: '#fff',
    fontWeight: '500',
  },
  yearGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 16,
  },
  yearChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#333',
  },
  yearChipSelected: {
    backgroundColor: '#e50914',
    borderColor: '#e50914',
  },
  yearChipText: {
    color: '#888',
    fontSize: 14,
  },
  yearChipTextSelected: {
    color: '#fff',
    fontWeight: '500',
  },
  startButtonContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 16,
    backgroundColor: '#0f0f0f',
    borderTopWidth: 1,
    borderTopColor: '#222',
  },
  startButton: {
    backgroundColor: '#e50914',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
  },
  startButtonDisabled: {
    backgroundColor: '#333',
  },
  startButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
