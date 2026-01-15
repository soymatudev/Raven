import React, { useState } from 'react';
import { 
  View, 
  Text, 
  TextInput, 
  StyleSheet, 
  TouchableOpacity, 
  ScrollView,
  KeyboardAvoidingView,
  Platform
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { SafeAreaView } from 'react-native-safe-area-context';
import { THEME } from '../theme/theme';
import { loadTrips, saveTrips } from '../utils/storage';
import { ArrowLeft, Save } from 'lucide-react-native';

const COLOR_OPTIONS = [
  THEME.primary,
  THEME.success,
  THEME.accent,
  '#00F3FF', // Cyan
  '#B026FF'  // Purple
];

export const CreateTripScreen = ({ navigation }) => {
  const [title, setTitle] = useState('');
  const [selectedColor, setSelectedColor] = useState(COLOR_OPTIONS[0]);
  const [duration, setDuration] = useState('1');

  const handleSave = async () => {
    if (!title.trim()) return;

    const trips = await loadTrips();
    
    const newTrip = {
      id: String(Date.now()),
      titulo_viaje: title.trim(),
      color_acento: selectedColor,
      itinerario: Array.from({ length: parseInt(duration) || 1 }, (_, i) => ({
        dia: i + 1,
        fecha: new Date(Date.now() + i * 86400000).toISOString().split('T')[0],
        puntos: []
      }))
    };

    const updatedTrips = [...trips, newTrip];
    await saveTrips(updatedTrips);

    // Notificación de éxito al crear el viaje
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

    navigation.goBack();
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.navBar}>
        <TouchableOpacity 
          onPress={() => navigation.goBack()} 
          style={styles.backButton}
          activeOpacity={0.7}
        >
          <ArrowLeft color={THEME.text} size={24} />
        </TouchableOpacity>
        <Text style={styles.navTitle}>Nuevo Viaje</Text>
      </View>

      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        <ScrollView contentContainerStyle={styles.content}>
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Título del Viaje</Text>
            <TextInput
              style={styles.input}
              placeholder="Ej. Mi Aventura en Japón"
              placeholderTextColor={THEME.textMuted}
              value={title}
              onChangeText={setTitle}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Color de Acento</Text>
            <View style={styles.colorPicker}>
              {COLOR_OPTIONS.map((color) => (
                <TouchableOpacity
                  key={color}
                  style={[
                    styles.colorCircle,
                    { backgroundColor: color },
                    selectedColor === color && styles.selectedColorCircle
                  ]}
                  onPress={() => setSelectedColor(color)}
                  activeOpacity={0.7}
                />
              ))}
            </View>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Duración (Días)</Text>
            <TextInput
              style={styles.input}
              keyboardType="numeric"
              value={duration}
              onChangeText={(val) => setDuration(val.replace(/[^0-9]/g, ''))}
            />
          </View>

          <TouchableOpacity 
            style={styles.saveButton} 
            onPress={handleSave}
            activeOpacity={0.7}
          >
            <Save color={THEME.background} size={20} />
            <Text style={styles.saveButtonText}>Guardar Viaje</Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: THEME.background,
  },
  navBar: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: THEME.divider,
  },
  backButton: {
    padding: 8,
    marginRight: 8,
  },
  navTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: THEME.text,
  },
  content: {
    padding: 24,
  },
  inputGroup: {
    marginBottom: 24,
  },
  label: {
    fontSize: 14,
    color: THEME.textMuted,
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  input: {
    backgroundColor: THEME.surface,
    color: THEME.text,
    padding: 16,
    borderRadius: 12,
    fontSize: 16,
    borderWidth: 1,
    borderColor: THEME.divider,
  },
  colorPicker: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  colorCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 3,
    borderColor: 'transparent',
  },
  selectedColorCircle: {
    borderColor: THEME.text,
  },
  saveButton: {
    backgroundColor: THEME.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 18,
    borderRadius: 12,
    marginTop: 20,
    shadowColor: THEME.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  saveButtonText: {
    color: THEME.background,
    fontSize: 18,
    fontWeight: 'bold',
    marginLeft: 10,
  }
});
