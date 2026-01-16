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
  Alert,
  ActivityIndicator
} from 'react-native';
import * as Animatable from 'react-native-animatable';
import { SafeAreaView } from 'react-native-safe-area-context';
import { THEME } from '../theme/theme';
import { TimelineItem } from '../components/TimelineItem';
import { loadTrips, saveTrips } from '../utils/storage';
import DateTimePicker from '@react-native-community/datetimepicker';
import * as Haptics from 'expo-haptics';
import * as Location from 'expo-location';
import { 
  ArrowLeft, 
  Calendar, 
  Plus, 
  Save, 
  X, 
  Clock, 
  Trash2, 
  Search, 
  Navigation,
  Map as MapIcon,
  DollarSign
} from 'lucide-react-native';
import MapView, { Marker } from 'react-native-maps';
import { DARK_MAP_STYLE } from '../theme/mapStyle';

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
  const [cost, setCost] = useState('0');
  const [description, setDescription] = useState('');
  const [editingPointId, setEditingPointId] = useState(null);
  const [tempCoords, setTempCoords] = useState(null);
  const [focusedDay, setFocusedDay] = useState(1);
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const mapRef = React.useRef(null);
  
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

  useEffect(() => {
    if (trip && mapRef.current) {
      const day = trip.itinerario.find(d => d.dia === focusedDay);
      if (day && day.puntos.length) {
        const coords = day.puntos
          .filter(p => p.coords)
          .map(p => ({
            latitude: p.coords.latitude,
            longitude: p.coords.longitude
          }));

        if (coords.length > 0) {
          // Pequeño timeout para asegurar que el mapa está listo
          setTimeout(() => {
            mapRef.current.fitToCoordinates(coords, {
              edgePadding: { top: 100, right: 100, bottom: 100, left: 100 },
              animated: true
            });
          }, 500);
        }
      }
    }
  }, [focusedDay, trip]);

  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      // Solo buscamos si el texto ha cambiado y no acabamos de seleccionar un resultado
      if (place.trim().length >= 3 && !isSelectingResult) {
        searchPlaces(place);
      } else if (place.trim().length < 3) {
        setSearchResults([]);
      }
    }, 500);

    return () => clearTimeout(delayDebounceFn);
  }, [place]);

  const [isSelectingResult, setIsSelectingResult] = useState(false);

  const searchPlaces = async (query) => {
    setIsSearching(true);
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=5`,
        {
          headers: {
            'User-Agent': 'RavenTravelApp/1.0',
            'Accept-Language': 'es'
          }
        }
      );
      
      if (!response.ok) throw new Error('Network response was not ok');
      
      const data = await response.json();
      setSearchResults(data);
    } catch (error) {
      console.error('Search error:', error);
      // Opcionalmente mostrar un mensaje de error discreto
    } finally {
      setIsSearching(false);
    }
  };

  const centerOnUserLocation = async () => {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permiso denegado', 'Se necesita permiso de ubicación para esta función.');
      return;
    }

    try {
      const location = await Location.getCurrentPositionAsync({});
      const coords = {
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
      };

      mapRef.current?.animateToRegion({
        ...coords,
        latitudeDelta: 0.01,
        longitudeDelta: 0.01,
      }, 1000);

      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch (error) {
      Alert.alert('Error', 'No se pudo obtener la ubicación actual.');
    }
  };

  const handleMapLongPress = (e) => {
    const coords = e.nativeEvent.coordinate;
    setTempCoords(coords);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    
    if (!isModalVisible) {
      openModal(focusedDay);
    }
  };

  const calculateTotalTripCost = () => {
    if (!trip) return 0;
    return trip.itinerario.reduce((acc, day) => {
      return acc + day.puntos.reduce((dayAcc, point) => dayAcc + (point.costo || 0), 0);
    }, 0);
  };

  const calculateDayCost = (dayId) => {
    if (!trip) return 0;
    const day = trip.itinerario.find(d => d.dia === dayId);
    if (!day) return 0;
    return day.puntos.reduce((acc, point) => acc + (point.costo || 0), 0);
  };

  // En lugar de return null, devolvemos un View vacío para evitar errores de casteo nativo
  if (!trip) return <View style={{ flex: 1, backgroundColor: THEME.background }} />;

  const isOverBudget = calculateTotalTripCost() > (trip.presupuesto_total || 0);
  const spendingPercentage = trip.presupuesto_total > 0 
    ? (calculateTotalTripCost() / trip.presupuesto_total) * 100 
    : 0;

  const getProgressBarColor = () => {
    if (spendingPercentage >= 100) return '#FF4757'; // Red
    if (spendingPercentage >= 80) return THEME.accent; // Orange
    return THEME.success; // Green
  };

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

    let newTrips;
    const trips = await loadTrips();

    if (!editingPointId) {
      // ADD NEW POINT
      newTrips = trips.map(t => {
        if (String(t.id) === tripId) {
          return {
            ...t,
            itinerario: t.itinerario.map(day => {
              if (day.dia === selectedDay) {
                return {
                  ...day,
                  puntos: sortPointsByTime([
                    ...day.puntos,
                    {
                      id: String(Date.now()),
                      lugar: place.trim(),
                      hora: time,
                      costo: parseFloat(cost) || 0,
                      descripcion: description.trim(),
                      completado: false,
                      coords: tempCoords
                    }
                  ])
                };
              }
              return day;
            })
          };
        }
        return t;
      });
    } else {
      // EDIT POINT
      newTrips = trips.map(t => {
        if (String(t.id) === tripId) {
          return {
            ...t,
            itinerario: t.itinerario.map(day => ({
              ...day,
              puntos: sortPointsByTime(day.puntos.map(p =>
                String(p.id) === editingPointId
                  ? { ...p, lugar: place.trim(), hora: time, costo: parseFloat(cost) || 0, descripcion: description.trim(), coords: tempCoords }
                  : p
              ))
            }))
          };
        }
        return t;
      });
    }

    await saveTrips(newTrips);
    setTrip(newTrips.find(t => String(t.id) === tripId));
    
    // Feedback táctil específico para gastos
    const newTotal = calculateTotalTripCost() + (parseFloat(cost) || 0);
    const budget = trip.presupuesto_total || 0;
    
    if (parseFloat(cost) > 0) {
      if (budget > 0 && newTotal > budget) {
        // Alerta táctil si superamos el presupuesto
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      } else {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      }
    }
    
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
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
            // Feedback táctil de advertencia al borrar
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
    setCost(String(point.costo || 0));
    setDescription(point.descripcion || '');
    setTempCoords(point.coords || null);

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
    setTempCoords(null);
    setIsModalVisible(true);
  };

  const closeModal = () => {
    setIsModalVisible(false);
    setPlace('');
    setTime('10:00');
    setCost('0');
    setDescription('');
    setSelectedDay(null);
    setEditingPointId(null);
    setShowPicker(false);
    setTempCoords(null);
    setSearchResults([]);
    setIsSelectingResult(false);
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



  const renderDay = (day) => (
    <View key={String(day.dia)} style={styles.daySection}>
      <View style={styles.dayHeader}>
        <Calendar size={18} color={trip.color_acento || '#00FF41'} />
        <Text style={[styles.dayTitle, { color: trip.color_acento || '#00FF41' }]}>
          Día {day.dia} • {new Date(day.fecha + 'T00:00:00').toLocaleDateString('es-ES', { day: 'numeric', month: 'long' })}
        </Text>
        <TouchableOpacity
          style={[styles.addButton, { borderColor: (trip.color_acento || '#00FF41') + '44' }]}
          onPress={() => openModal(day.dia)}
          activeOpacity={0.7}
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
          isOverBudget={isOverBudget}
        />
      ))}
    </View>
  );

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
        <View style={{ flex: 1 }}>
          <Text style={styles.navTitle} numberOfLines={1}>{trip.titulo_viaje}</Text>
          <View style={styles.budgetHeader}>
            <Text style={styles.totalCostText}>
              Total: <Text style={{ color: isOverBudget ? '#FF4757' : THEME.accent }}>${calculateTotalTripCost()}</Text>
              {trip.presupuesto_total > 0 && ` / $${trip.presupuesto_total}`}
            </Text>
            {trip.presupuesto_total > 0 && (
              <Text style={[styles.percentageText, { color: getProgressBarColor() }]}>
                {Math.round(spendingPercentage)}%
              </Text>
            )}
          </View>
        </View>
      </View>

      {trip.presupuesto_total > 0 && (
        <View style={styles.budgetProgressWrapper}>
          <View style={styles.progressBarShell}>
            <Animatable.View 
              animation={spendingPercentage >= 100 ? "pulse" : undefined}
              iterationCount="infinite"
              duration={1000}
              style={[
                styles.progressBarFill, 
                { 
                  width: `${Math.min(spendingPercentage, 100)}%`,
                  backgroundColor: getProgressBarColor(),
                  shadowColor: getProgressBarColor(),
                }
              ]} 
            />
          </View>
        </View>
      )}

      <View style={styles.mapWrapper}>
        <MapView
          ref={mapRef}
          style={styles.map}
          customMapStyle={DARK_MAP_STYLE}
          initialRegion={{
            latitude: trip.itinerario[0]?.puntos[0]?.coords?.latitude || 35.6895,
            longitude: trip.itinerario[0]?.puntos[0]?.coords?.longitude || 139.6917,
            latitudeDelta: 0.05,
            longitudeDelta: 0.05,
          }}
          onLongPress={handleMapLongPress}
        >
          {trip.itinerario.find(d => d.dia === focusedDay)?.puntos.map(p => (
            p.coords && (
              <Marker
                key={p.id}
                coordinate={p.coords}
                title={p.lugar}
                description={p.hora}
              >
                <View style={[styles.markerPin, { backgroundColor: trip.color_acento || THEME.primary, shadowColor: trip.color_acento || THEME.primary }]} />
              </Marker>
            )
          ))}
          {tempCoords && (
            <Marker coordinate={tempCoords}>
              <View style={[styles.markerPin, { backgroundColor: THEME.secondary, borderColor: '#FFF', scale: 1.2 }]} />
            </Marker>
          )}
        </MapView>
        
        <TouchableOpacity 
          style={styles.locationButton} 
          onPress={centerOnUserLocation}
          activeOpacity={0.7}
        >
          <Navigation color={THEME.text} size={20} />
        </TouchableOpacity>
      </View>

      <View style={styles.daySelectorWrapper}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.daySelector}>
          {trip.itinerario.map(day => (
            <TouchableOpacity
              key={day.dia}
              style={[
                styles.dayTab,
                focusedDay === day.dia && { backgroundColor: (trip.color_acento || THEME.primary) + '22', borderColor: trip.color_acento || THEME.primary }
              ]}
              onPress={() => {
                setFocusedDay(day.dia);
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              }}
              activeOpacity={0.7}
            >
              <Text style={[
                styles.dayTabText,
                focusedDay === day.dia && { color: trip.color_acento || THEME.primary, fontWeight: 'bold' }
              ]}>
                Día {day.dia}
              </Text>
              <View style={[styles.dayCostBadge, focusedDay === day.dia && { backgroundColor: THEME.accent }]}>
                <Text style={[styles.dayCostBadgeText, focusedDay === day.dia && { color: THEME.background }]}>
                  ${calculateDayCost(day.dia)}
                </Text>
              </View>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      <ScrollView style={styles.content}>
        {trip.itinerario.filter(d => d.dia === focusedDay).map(renderDay)}
      </ScrollView>

      <Modal
        visible={isModalVisible}
        transparent={true}
        animationType="slide"
        onRequestClose={closeModal}
      >
        <Pressable style={styles.modalOverlay} onPress={closeModal}>
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            style={styles.modalContainer}
          >
            <Pressable 
              style={styles.modalContent} 
              onPress={(e) => e.stopPropagation()}
            >
              <ScrollView 
                keyboardShouldPersistTaps="handled"
                showsVerticalScrollIndicator={false}
              >
                <View style={styles.modalHeader}>
                  <Text style={styles.modalTitle}>
                    {editingPointId ? 'Editar Parada' : `Nueva Parada (Día ${selectedDay})`}
                  </Text>
                  <View style={styles.modalHeaderActions}>
                    {editingPointId && (
                      <TouchableOpacity
                        onPress={handleDeletePoint}
                        style={styles.deleteCircle}
                        activeOpacity={0.7}
                      >
                        <Trash2 color="#FF4757" size={20} />
                      </TouchableOpacity>
                    )}
                    <TouchableOpacity onPress={closeModal} activeOpacity={0.7}>
                      <X color={THEME.textMuted} size={24} />
                    </TouchableOpacity>
                  </View>
                </View>

                <View style={[styles.inputGroup, { zIndex: 1000 }]}>
                  <Text style={styles.label}>Lugar</Text>
                  <View style={styles.searchContainer}>
                    <TextInput
                      style={styles.input}
                      placeholder="Ej. Torre Eiffel"
                      placeholderTextColor={THEME.textMuted}
                      value={place}
                      onChangeText={(text) => {
                        setIsSelectingResult(false);
                        setPlace(text);
                      }}
                    />
                    {isSearching && (
                      <View style={styles.searchSpinner}>
                        <ActivityIndicator size="small" color={THEME.primary} />
                      </View>
                    )}
                  </View>
                  
                  {searchResults.length > 0 && (
                    <View style={styles.searchResultsList}>
                      {searchResults.map((item, index) => (
                        <TouchableOpacity
                          key={index}
                          style={styles.searchResultItem}
                          onPress={() => {
                            setIsSelectingResult(true);
                            setPlace(item.display_name.split(',')[0]);
                            const coords = {
                              latitude: parseFloat(item.lat),
                              longitude: parseFloat(item.lon)
                            };
                            setTempCoords(coords);
                            setSearchResults([]);
                            
                            mapRef.current?.animateToRegion({
                              ...coords,
                              latitudeDelta: 0.01,
                              longitudeDelta: 0.01
                            }, 1000);
                            
                            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                          }}
                        >
                          <MapIcon size={16} color={THEME.primary} />
                          <Text style={styles.searchResultText} numberOfLines={1}>
                            {item.display_name}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  )}
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

                  <View style={[styles.inputGroup, { flex: 1 }]}>
                    <Text style={styles.label}>Gasto estimado</Text>
                    <View style={styles.costInputContainer}>
                      <DollarSign size={16} color={THEME.accent} />
                      <TextInput
                        style={styles.costInput}
                        keyboardType="numeric"
                        placeholder="0"
                        placeholderTextColor={THEME.textMuted}
                        value={cost}
                        onChangeText={setCost}
                      />
                    </View>
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
                  activeOpacity={0.7}
                >
                  <Save color={THEME.background} size={20} />
                  <Text style={styles.saveButtonText}>
                    {editingPointId ? 'Guardar Cambios' : 'Guardar Parada'}
                  </Text>
                </TouchableOpacity>
              </ScrollView>
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
  },
  budgetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingRight: 8,
  },
  totalCostText: {
    fontSize: 12,
    color: THEME.textMuted,
    fontWeight: '500',
  },
  percentageText: {
    fontSize: 12,
    fontWeight: 'bold',
  },
  budgetProgressWrapper: {
    paddingHorizontal: 16,
    paddingBottom: 8,
    backgroundColor: THEME.background,
  },
  progressBarShell: {
    height: 6,
    backgroundColor: THEME.surface,
    borderRadius: 3,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: THEME.divider,
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 3,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 4,
    elevation: 5,
  },
  content: {
    flex: 1,
  },
  mapWrapper: {
    height: 250,
    margin: 16,
    borderRadius: 20,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: THEME.primary,
    shadowColor: THEME.primary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 10,
    elevation: 8,
  },
  map: {
    flex: 1,
  },
  locationButton: {
    position: 'absolute',
    bottom: 16,
    right: 16,
    backgroundColor: THEME.surface,
    width: 44,
    height: 44,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: THEME.divider,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 5,
  },
  markerPin: {
    width: 14,
    height: 14,
    borderRadius: 7,
    borderWidth: 2,
    borderColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 4,
    elevation: 10,
  },
  daySelectorWrapper: {
    borderBottomWidth: 1,
    borderBottomColor: THEME.divider,
    marginBottom: 10,
  },
  daySelector: {
    paddingHorizontal: 16,
    paddingBottom: 12,
    gap: 10,
  },
  dayTab: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: THEME.divider,
    backgroundColor: THEME.surface,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  dayTabText: {
    color: THEME.textMuted,
    fontSize: 14,
  },
  dayCostBadge: {
    backgroundColor: THEME.accent + '22',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: THEME.accent + '44',
  },
  dayCostBadgeText: {
    fontSize: 10,
    color: THEME.accent,
    fontWeight: 'bold',
  },
  daySection: {
    padding: 20,
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
    width: '100%',
  },
  searchContainer: {
    position: 'relative',
  },
  searchSpinner: {
    position: 'absolute',
    right: 16,
    top: 18,
  },
  searchResultsList: {
    position: 'absolute',
    top: '100%',
    left: 0,
    right: 0,
    backgroundColor: THEME.background,
    borderRadius: 12,
    marginTop: 4,
    borderWidth: 1,
    borderColor: THEME.divider,
    maxHeight: 200,
    zIndex: 2000,
    elevation: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  searchResultItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderBottomWidth: 1,
    borderBottomColor: THEME.divider,
  },
  searchResultText: {
    color: THEME.text,
    fontSize: 14,
    marginLeft: 10,
    flex: 1,
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
  costInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: THEME.background,
    paddingHorizontal: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: THEME.divider,
    height: 56,
  },
  costInput: {
    flex: 1,
    color: THEME.text,
    fontSize: 16,
    marginLeft: 8,
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
