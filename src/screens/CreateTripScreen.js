import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  TextInput, 
  StyleSheet, 
  TouchableOpacity, 
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Alert
} from 'react-native';
import { CommonActions } from '@react-navigation/native';
import { triggerHaptic } from '../utils/haptics';
import { SafeAreaView } from 'react-native-safe-area-context';
import { THEME } from '../theme/theme';
import { loadTrips, saveTrips, loadEmployeeData, removeTripById } from '../utils/storage';
import { ArrowLeft, Save, Calendar as CalendarIcon, DollarSign, Trash2 } from 'lucide-react-native';
import DateTimePicker from '@react-native-community/datetimepicker';

const COLOR_OPTIONS = [
  '#1A4D4C', // Esmeralda
  '#52B69A', // Turquesa
  '#1E6091', // Azul Profundo
  '#34A0A4', // Petrol
  '#168AAD'  // Oceano
];

export const CreateTripScreen = ({ route, navigation }) => {
  const tripId = route.params?.tripId;
  const isEditing = !!tripId;
  
  const [title, setTitle] = useState('');
  const [selectedColor, setSelectedColor] = useState(COLOR_OPTIONS[0]);
  const [duration, setDuration] = useState('1');
  const [budget, setBudget] = useState('0');
  const [startDate, setStartDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [existingItinerary, setExistingItinerary] = useState([]);

  useEffect(() => {
    if (isEditing) {
      loadTripData();
    }
  }, [tripId]);

  const loadTripData = async () => {
    const trips = await loadTrips();
    const trip = trips.find(t => String(t.id) === String(tripId));
    if (trip) {
      setTitle(trip.titulo_viaje);
      setSelectedColor(trip.color_acento);
      setDuration(String(trip.itinerario.length));
      setBudget(String(trip.presupuesto_total || 0));
      setStartDate(new Date(trip.fecha_inicio + 'T00:00:00'));
      setExistingItinerary(trip.itinerario);
    }
  };

  const onDateChange = (event, selectedDate) => {
    setShowDatePicker(false);
    if (selectedDate) {
      setStartDate(selectedDate);
    }
  };

  const handleSave = async () => {
    if (!title.trim()) return;

    const newDuration = parseInt(duration) || 1;
    let finalItinerary = [];

    if (isEditing) {
      if (newDuration < existingItinerary.length) {
        Alert.alert(
          'Reducir duración',
          'Si reduces los días se perderán permanentemente las paradas de los días eliminados. ¿Continuar?',
          [
            { text: 'Cancelar', style: 'cancel' },
            { text: 'Confirmar', style: 'destructive', onPress: executeSave }
          ]
        );
        return;
      }
    }
    
    executeSave();
  };

  const executeSave = async () => {
    const trips = await loadTrips();
    const newDuration = parseInt(duration) || 1;
    
    // Crear o actualizar itinerario
    let updatedItinerary = [];
    for (let i = 0; i < newDuration; i++) {
        const dayDate = new Date(startDate);
        dayDate.setDate(startDate.getDate() + i);
        const dateStr = dayDate.toISOString().split('T')[0];
        
        // Conservar puntos si ya existen para ese índice de día
        const existingDay = isEditing ? existingItinerary[i] : null;
        updatedItinerary.push({
            dia: i + 1,
            fecha: dateStr,
            puntos: existingDay ? existingDay.puntos : []
        });
    }

    let updatedTrips;
    if (isEditing) {
        updatedTrips = trips.map(t => 
            String(t.id) === String(tripId) 
            ? {
                ...t,
                titulo_viaje: title.trim(),
                color_acento: selectedColor,
                presupuesto_total: parseFloat(budget) || 0,
                fecha_inicio: startDate.toISOString().split('T')[0],
                itinerario: updatedItinerary
              }
            : t
        );
    } else {
        const empData = await loadEmployeeData();
        const newTrip = {
            id: String(Date.now()),
            titulo_viaje: title.trim(),
            color_acento: selectedColor,
            presupuesto_total: parseFloat(budget) || 0,
            fecha_inicio: startDate.toISOString().split('T')[0],
            itinerario: updatedItinerary,
            cve_emple: empData ? empData.cve_emple : null
        };
        updatedTrips = [...trips, newTrip];
    }

    await saveTrips(updatedTrips);
    triggerHaptic('notificationSuccess');
    navigation.goBack();
  };

  const handleDeleteTrip = () => {
    Alert.alert(
      '¿Borrar viaje?',
      'Se perderán todos los datos y paradas de este viaje permanentemente.',
      [
        { text: 'Cancelar', style: 'cancel' },
        { 
          text: 'Borrar', 
          style: 'destructive',
          onPress: async () => {
            triggerHaptic('notificationWarning');
            await removeTripById(tripId);
            
            navigation.dispatch(
              CommonActions.reset({
                index: 0,
                routes: [{ name: 'MainTabs' }],
              })
            );
          }
        }
      ]
    );
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
        <Text style={styles.navTitle}>{isEditing ? 'Editar Viaje' : 'Nuevo Viaje'}</Text>
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
            <Text style={styles.label}>Fecha de Inicio</Text>
            <TouchableOpacity 
              style={styles.dateSelector} 
              onPress={() => setShowDatePicker(true)}
              activeOpacity={0.7}
            >
              <CalendarIcon color={selectedColor} size={20} />
              <Text style={styles.dateText}>
                {startDate.toLocaleDateString('es-ES', { 
                  day: 'numeric', 
                  month: 'long', 
                  year: 'numeric' 
                })}
              </Text>
            </TouchableOpacity>
            {showDatePicker && (
              <DateTimePicker
                value={startDate}
                mode="date"
                display="default"
                onChange={onDateChange}
              />
            )}
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

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Presupuesto Total</Text>
            <View style={styles.budgetInputWrapper}>
              <DollarSign size={20} color={selectedColor} />
              <TextInput
                style={styles.budgetInput}
                placeholder="0"
                placeholderTextColor={THEME.textMuted}
                keyboardType="numeric"
                value={budget}
                onChangeText={(val) => setBudget(val.replace(/[^0-9.]/g, ''))}
              />
            </View>
          </View>

          <TouchableOpacity 
            style={styles.saveButton} 
            onPress={handleSave}
            activeOpacity={0.7}
          >
            <Save color="#FFFFFF" size={20} />
            <Text style={styles.saveButtonText}>Guardar Viaje</Text>
          </TouchableOpacity>

          {isEditing && (
            <TouchableOpacity 
              style={styles.deleteButton} 
              onPress={handleDeleteTrip}
              activeOpacity={0.7}
            >
              <Trash2 color="#E63946" size={20} />
              <Text style={styles.deleteButtonText}>Eliminar Viaje</Text>
            </TouchableOpacity>
          )}
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
    fontSize: 22,
    fontWeight: 'bold',
    color: THEME.primary,
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
    borderRadius: 16,
    fontSize: 16,
    borderWidth: 1.5,
    borderColor: THEME.divider,
  },
  dateSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: THEME.surface,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: THEME.divider,
  },
  dateText: {
    color: THEME.text,
    fontSize: 16,
    marginLeft: 12,
    fontWeight: '500',
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
    borderRadius: 30, // Pill style
    marginTop: 20,
    shadowColor: THEME.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 10,
    elevation: 4,
  },
  saveButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: 'bold',
    marginLeft: 10,
  },
  budgetInputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: THEME.surface,
    paddingHorizontal: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: THEME.divider,
    height: 56,
  },
  budgetInput: {
    flex: 1,
    color: THEME.text,
    fontSize: 16,
    marginLeft: 12,
  },
  deleteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 30,
    borderWidth: 1.5,
    borderColor: '#E6394622',
    marginTop: 16,
    marginBottom: 40,
  },
  deleteButtonText: {
    color: '#E63946',
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 10,
  }
});
