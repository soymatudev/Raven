import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  ScrollView, 
  Modal, 
  TextInput, 
  KeyboardAvoidingView, 
  Platform,
  Pressable,
  Alert
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { THEME } from '../theme/theme';
import { TimelineItem } from '../components/TimelineItem';
import { loadTrips, saveTrips } from '../utils/storage';
import { ArrowLeft, Calendar, Plus, Save, X, Clock, Trash2 } from 'lucide-react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import * as Haptics from 'expo-haptics';

export const TripDetailScreen = ({ route, navigation }) => {
  const sortPointsByTime = (points) => {
    return [...points].sort((a, b) => a.hora.localeCompare(b.hora));
  };
  // Forzamos que el ID sea String desde el inicio
  const tripId = String(route.params?.tripId || '');
  const [trip, setTrip] = useState(null);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [selectedDay, setSelectedDay] = useState(null);
  
  // Form state
  const [place, setPlace] = useState('');
  const [time, setTime] = useState('10:00');
  const [description, setDescription] = useState('');
  const [editingPointId, setEditingPointId] = useState(null);
  
  // Picker state
  const [showPicker, setShowPicker] = useState(false);
  const [pickerDate, setPickerDate] = useState(new Date());

  useEffect(() => {
    const fetchTrip = async () => {
      const trips = await loadTrips();
      // Comparación segura de strings
      const foundTrip = trips.find(t => String(t.id) === tripId);
      setTrip(foundTrip);
    };
    fetchTrip();
  }, [tripId]);

  // En lugar de return null, devolvemos un View vacío para evitar errores de casteo nativo
  if (!trip) return <View style={{ flex: 1, backgroundColor: THEME.background }} />;

  const togglePoint = async (pointId) => {
    const trips = await loadTrips();
    const newTrips = trips.map(t => {
      if (t.id === tripId) {
        return {
          ...t,
          itinerario: t.itinerario.map(day => ({
            ...day,
            puntos: day.puntos.map(p => 
              p.id === pointId ? { ...p, completado: p.completado === true || p.completado === 'true' ? false : true } : p
            )
          }))
        };
      }
      return t;
    });
    
    await saveTrips(newTrips);
    setTrip(newTrips.find(t => String(t.id) === tripId));
  };

  const handleSavePoint = async () => {
    if (!place.trim()) return;

    const trips = await loadTrips();
    const newTrips = trips.map(t => {
      if (String(t.id) === tripId) {
        return {
          ...t,
          itinerario: t.itinerario.map(day => {
            // Si estamos editando, buscamos el punto en cualquier día
            // Si estamos añadiendo, buscamos el selectedDay
            if (editingPointId) {
              const pointExists = day.puntos.some(p => String(p.id) === editingPointId);
              if (pointExists) {
                const updatedPoints = day.puntos.map(p => 
                  String(p.id) === editingPointId 
                    ? { ...p, lugar: place.trim(), hora: time, descripcion: description.trim() }
                    : p
                );
                return {
                  ...day,
                  puntos: sortPointsByTime(updatedPoints)
                };
              }
            } else if (day.dia === selectedDay) {
              const newPoints = [
                ...day.puntos,
                {
                  id: String(Date.now()),
                  lugar: place.trim(),
                  hora: time || '10:00',
                  descripcion: description.trim(),
                  completado: false
                }
              ];
              return {
                ...day,
                puntos: sortPointsByTime(newPoints)
              };
            }
            return day;
          })
        };
      }
      return t;
    });

    await saveTrips(newTrips);
    setTrip(newTrips.find(t => String(t.id) === tripId));
    closeModal();
  };

  const handleDeletePoint = async () => {
    if (!editingPointId) return;

    Alert.alert(
      '¿Eliminar parada?',
      'Esta acción no se puede deshacer permanentemente.',
      [
        { text: 'Cancelar', style: 'cancel' },
        { 
          text: 'Eliminar', 
          style: 'destructive',
          onPress: async () => {
            // Feedback táctil para confirmar la acción peligrosa
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
            
            const trips = await loadTrips();
            const newTrips = trips.map(t => {
              if (String(t.id) === tripId) {
                return {
                  ...t,
                  itinerario: t.itinerario.map(day => ({
                    ...day,
                    puntos: day.puntos.filter(p => String(p.id) !== editingPointId)
                  }))
                };
              }
              return t;
            });

            await saveTrips(newTrips);
            setTrip(newTrips.find(t => String(t.id) === tripId));
            closeModal();
          }
        }
      ]
    );
  };

  const handleLongPressPoint = (point) => {
    setEditingPointId(String(point.id));
    setPlace(point.lugar);
    setTime(point.hora);
    setDescription(point.descripcion || '');
    
    // Set picker date for the modal
    const [hours, minutes] = point.hora.split(':');
    const d = new Date();
    d.setHours(parseInt(hours) || 10);
    d.setMinutes(parseInt(minutes) || 0);
    setPickerDate(d);
    
    setIsModalVisible(true);
  };

  const openModal = (dayId) => {
    setSelectedDay(dayId);
    setEditingPointId(null);
    setIsModalVisible(true);
  };

  const closeModal = () => {
    setIsModalVisible(false);
    setPlace('');
    setTime('10:00');
    setDescription('');
    setSelectedDay(null);
    setEditingPointId(null);
    setShowPicker(false);
  };

  const onTimeChange = (event, selectedDate) => {
    // En Android el picker se cierra solo tras seleccionar la hora
    if (Platform.OS === 'android') {
      setShowPicker(false);
    }
    
    if (selectedDate) {
      setPickerDate(selectedDate);
      const hours = selectedDate.getHours().toString().padStart(2, '0');
      const minutes = selectedDate.getMinutes().toString().padStart(2, '0');
      setTime(`${hours}:${minutes}`);
    }
  };

  if (!trip) return null;

  const renderDay = (day) => (
    <View key={String(day.dia)} style={styles.daySection}>
      <View style={styles.dayHeader}>
        <Calendar size={18} color={trip.color_acento || '#00FF41'} />
        <Text style={[styles.dayTitle, { color: trip.color_acento || '#00FF41' }]}>
          Día {day.dia} • {day.fecha}
        </Text>
        <TouchableOpacity 
          style={[styles.addButton, { borderColor: (trip.color_acento || '#00FF41') + '44' }]} 
          onPress={() => openModal(day.dia)}
        >
          <Plus size={16} color={trip.color_acento || '#00FF41'} />
          <Text style={[styles.addButtonText, { color: trip.color_acento || '#00FF41' }]}>Añadir parada</Text>
        </TouchableOpacity>
      </View>
      {day.puntos.map((point, index) => (
        <TimelineItem 
          key={String(point.id)}
          point={point}
          isLast={index === day.puntos.length - 1}
          // Usamos un color sólido de respaldo
          accentColor={trip.color_acento || '#00FF41'}
          onToggle={togglePoint}
          onLongPress={handleLongPressPoint}
        />
      ))}
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.navBar}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <ArrowLeft color={THEME.text} size={24} />
        </TouchableOpacity>
        <Text style={styles.navTitle} numberOfLines={1}>{trip.titulo_viaje}</Text>
      </View>
      
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {trip.itinerario.map(renderDay)}
      </ScrollView>

      <Modal
        visible={isModalVisible}
        transparent={true}
        animationType="slide"
        onRequestClose={closeModal}
      >
        <Pressable style={styles.modalOverlay} onPress={closeModal}>
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={styles.modalContainer}
          >
            <Pressable style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>
                  {editingPointId ? 'Editar Parada' : `Nueva Parada (Día ${selectedDay})`}
                </Text>
                <View style={styles.modalHeaderActions}>
                  {editingPointId && (
                    <TouchableOpacity onPress={handleDeletePoint} style={styles.deleteCircle}>
                      <Trash2 color="#FF4757" size={20} />
                    </TouchableOpacity>
                  )}
                  <TouchableOpacity onPress={closeModal}>
                    <X color={THEME.textMuted} size={24} />
                  </TouchableOpacity>
                </View>
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>Lugar</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Ej. Torre Eiffel"
                  placeholderTextColor={THEME.textMuted}
                  value={place}
                  onChangeText={setPlace}
                />
              </View>

              <View style={styles.row}>
                <View style={[styles.inputGroup, { flex: 1 }]}>
                  <Text style={styles.label}>Hora</Text>
                  <TouchableOpacity 
                    style={styles.pickerButton} 
                    onPress={() => setShowPicker(true)}
                    activeOpacity={0.7}
                  >
                    <Clock size={16} color={THEME.textSecondary} />
                    <Text style={styles.pickerButtonText}>{time}</Text>
                  </TouchableOpacity>
                  
                  {showPicker && (
                    <DateTimePicker
                      value={pickerDate}
                      mode="time"
                      is24Hour={true}
                      display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                      onChange={onTimeChange}
                    />
                  )}
                </View>
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>Descripción</Text>
                <TextInput
                  style={[styles.input, styles.textArea]}
                  placeholder="Pequeño detalle de la visita..."
                  placeholderTextColor={THEME.textMuted}
                  value={description}
                  onChangeText={setDescription}
                  multiline={true}
                  numberOfLines={3}
                />
              </View>

              <TouchableOpacity 
                style={[
                  styles.saveButton, 
                  editingPointId && { backgroundColor: THEME.secondary, shadowColor: THEME.secondary }
                ]} 
                onPress={handleSavePoint}
              >
                <Save color={THEME.background} size={20} />
                <Text style={styles.saveButtonText}>
                  {editingPointId ? 'Guardar Cambios' : 'Guardar Parada'}
                </Text>
              </TouchableOpacity>
            </Pressable>
          </KeyboardAvoidingView>
        </Pressable>
      </Modal>
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
    flex: 1,
  },
  scrollContent: {
    padding: 24,
  },
  daySection: {
    marginBottom: 30,
  },
  dayHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  dayTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginLeft: 10,
    textTransform: 'uppercase',
    letterSpacing: 1,
    flex: 1,
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    backgroundColor: 'transparent',
  },
  addButtonText: {
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 4,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.8)',
    justifyContent: 'flex-end',
  },
  modalContainer: {
    width: '100%',
  },
  modalContent: {
    backgroundColor: THEME.surface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    paddingBottom: 40,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  modalHeaderActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  deleteCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 71, 87, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: THEME.text,
  },
  inputGroup: {
    marginBottom: 20,
  },
  row: {
    flexDirection: 'row',
    gap: 12,
  },
  label: {
    fontSize: 12,
    color: THEME.textMuted,
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  input: {
    backgroundColor: THEME.background,
    color: THEME.text,
    padding: 16,
    borderRadius: 12,
    fontSize: 16,
    borderWidth: 1,
    borderColor: THEME.divider,
  },
  pickerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: THEME.background,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: THEME.divider,
  },
  pickerButtonText: {
    color: THEME.text,
    fontSize: 16,
    marginLeft: 10,
  },
  textArea: {
    height: 100,
    textAlignVertical: 'top',
  },
  saveButton: {
    backgroundColor: THEME.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 18,
    borderRadius: 12,
    marginTop: 10,
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
  },
});
