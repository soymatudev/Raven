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
  ActivityIndicator,
  Image,
  StatusBar,
  Share,
  Switch,
  Clipboard
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import * as Animatable from 'react-native-animatable';
import { SafeAreaView } from 'react-native-safe-area-context';
import { STOP_CATEGORIES, THEME } from '../theme/theme';
import { TimelineItem } from '../components/TimelineItem';
import { loadTrips, saveTrips, loadEmployeeData } from '../utils/storage';
import { uploadEvidencias, syncViaje, obtenerCategorias, getViajeById } from '../services/api';
import DateTimePicker from '@react-native-community/datetimepicker';
import { triggerHaptic } from '../utils/haptics';
import * as Location from 'expo-location';
import { Linking } from 'react-native';
import { Plus, Calendar, Clock, MapPin, DollarSign, ChevronRight, Share2, Info, ArrowLeft, CloudUpload, Map as MapIcon, Image as ImageIcon, Camera, Trash2, X, FileText, CheckCircle, MessageSquarePlus, User, RefreshCw, Save } from 'lucide-react-native';
// import MapView, { Marker } from 'react-native-maps'; // REMOVED FOR LITE MODE
// import { DARK_MAP_STYLE } from '../theme/mapStyle';  // REMOVED FOR LITE MODE

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
  const [category, setCategory] = useState('ACTIVIDAD');
  const [description, setDescription] = useState('');
  const [editingPointId, setEditingPointId] = useState(null);
  const [tempCoords, setTempCoords] = useState(null);
  const [photos, setPhotos] = useState([]);
  const [facturable, setFacturable] = useState(false);
  const [availableCategories, setAvailableCategories] = useState([]);
  const [notes, setNotes] = useState('');
  const [fullScreenPhoto, setFullScreenPhoto] = useState(null);
  const [focusedDay, setFocusedDay] = useState(1);
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const mapRef = React.useRef(null);
  
  // Picker state
  const [showPicker, setShowPicker] = useState(false);
  const [pickerDate, setPickerDate] = useState(new Date());
  const [isLinked, setIsLinked] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncMessage, setSyncMessage] = useState('');
  
  // Note Modal state
  const [isNoteModalVisible, setIsNoteModalVisible] = useState(false);
  const [noteTitle, setNoteTitle] = useState('');
  const [noteContent, setNoteContent] = useState('');
  const [noteType, setNoteType] = useState('General');
  const [editingNoteId, setEditingNoteId] = useState(null);

  const isMounted = React.useRef(true);
  
  const copyToClipboard = (id) => {
    if (!id) return;
    Clipboard.setString(String(id));
    triggerHaptic('notificationSuccess');
    Alert.alert('¡Copiado!', 'ID del viaje copiado al portapapeles.');
  };

  useEffect(() => {
    return () => { isMounted.current = false; };
  }, []);

  useEffect(() => {
    const fetchTrip = async () => {
      try {
        // Carga Inicial Local (Siempre)
        const trips = await loadTrips();
        const localTrip = trips.find(t => String(t.id) === tripId);
        
        if (!localTrip) return;
        setTrip(localTrip);

        // REGLA: Solo busca en el API si ya está marcado como sincronizado 
        // y si tenemos un ID numérico real devuelto por el ERP anteriormente
        if (localTrip.sincronizado && localTrip.erp_id) {
          const erpIdNum = Number(localTrip.erp_id);
          
          // Validación estricta: debe ser un número válido y mayor a 0
          if (!isNaN(erpIdNum) && erpIdNum > 0) {
            try {
              const remoteTrip = await getViajeById(erpIdNum);
              if (remoteTrip && isMounted.current) {
                // Mezclamos pero mantenemos el ID local para que la navegación siga funcionando
                setTrip(prev => ({ ...prev, ...remoteTrip, id: prev.id })); 
              }
            } catch (apiError) {
              console.warn('Fallo al refrescar desde ERP:', apiError.message);
            }
          }
        }
      } catch (error) {
        console.error('Error cargando el viaje:', error);
        Alert.alert('Error', 'No se pudo cargar la información del viaje.');
      }
    };
    fetchTrip();
    checkLinkage();
  }, [tripId]);

  const checkLinkage = async () => {
    const empData = await loadEmployeeData();
    setIsLinked(!!empData);
  };

  useEffect(() => {
    const fetchCategories = async () => {
      const cats = await obtenerCategorias();
      if (cats.length > 0) {
        setAvailableCategories(cats);
      }
    };
    fetchCategories();
  }, []);

  const generateUUID = () => {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
      var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  };

  const handleSync = async () => {
    if (!isLinked && !trip.readonly) {
      Alert.alert(
        'Vincular Empleado',
        'Debes vincular tu clave de empleado en el Perfil para poder sincronizar.',
        [
          { text: 'Ir al Perfil', onPress: () => navigation.navigate('Perfil') },
          { text: 'Cancelar', style: 'cancel' }
        ]
      );
      return;
    }

    // Modo Refresco para ReadOnly
    if (trip.readonly) {
      setIsSyncing(true);
      setSyncMessage('Actualizando datos del ERP...');
      try {
        const erpId = trip.erp_id || trip.uuid_movil;
        if (!erpId || isNaN(erpId)) throw new Error('ID de viaje no válido para refresco.');
        
        const remoteTrip = await getViajeById(erpId);
        if (remoteTrip) {
          const trips = await loadTrips();
          const updatedTrips = trips.map(t => 
            String(t.id) === tripId 
            ? { ...t, ...remoteTrip, id: t.id, readonly: true, erp_id: erpId } 
            : t
          );
          await saveTrips(updatedTrips);
          setTrip(updatedTrips.find(t => String(t.id) === tripId));
          triggerHaptic('notificationSuccess');
          Alert.alert('Actualizado', 'Los datos del viaje han sido actualizados desde el ERP.');
        }
      } catch (error) {
        Alert.alert('Error', 'No se pudo refrescar el viaje.');
      } finally {
        setIsSyncing(false);
      }
      return;
    }

    setIsSyncing(true);
    setSyncMessage('Iniciando sincronización...');
    triggerHaptic('impactMedium');

    try {
      const empData = await loadEmployeeData();
      const cve_emple = Number(empData?.id);
      
      if (!cve_emple || isNaN(cve_emple)) {
        throw new Error('No se pudo validar tu clave de empleado. Por favor, vincúlala de nuevo en el Perfil.');
      }

      const uuid_movil = trip.uuid_movil || generateUUID();
      
      // Clonar el viaje para procesar
      const tripToSync = JSON.parse(JSON.stringify(trip));
      tripToSync.cve_emple = cve_emple;
      tripToSync.uuid_movil = uuid_movil;

      // Procesar cada parada y sus fotos
      setSyncMessage('Subiendo evidencias...');
      for (let day of tripToSync.itinerario) {
        for (let point of day.puntos) {
          if (point.fotos && point.fotos.length > 0) {
            const localPhotos = point.fotos.filter(uri => uri.startsWith('file://') || uri.startsWith('content://'));
            const cloudPhotos = point.fotos.filter(uri => !(uri.startsWith('file://') || uri.startsWith('content://')));
            
            if (localPhotos.length > 0) {
              const uploadedUrls = await uploadEvidencias(localPhotos);
              point.fotos = [...cloudPhotos, ...uploadedUrls];
            }
          }
        }
      }

      // Preparar JSON final con validaciones estrictas
      const finalPayload = {
        cve_emple: cve_emple,
        uuid_movil: uuid_movil,
        titulo: tripToSync.titulo_viaje || "Viaje Raven",
        fecha_inicio: (tripToSync.fecha_inicio || new Date().toISOString()).split('T')[0], // YYYY-MM-DD
        presupuesto: Number(tripToSync.presupuesto_total) || 0,
        paradas: tripToSync.itinerario.flatMap(day => 
          day.puntos.map(p => ({
            lugar: p.lugar,
            hora: p.hora,
            monto: Number(p.costo) || 0,
            cve_catvj: p.cve_catvj || 1,
            facturable: p.facturable || false,
            lat: p.coords?.latitude ?? null,
            lng: p.coords?.longitude ?? null,
            descripcion: p.descripcion || "",
            evidencias: (p.fotos || []).map(url => {
              if (!url) return null;
              return {
                tipo_archivo: url.toLowerCase().endsWith('.pdf') ? 'application/pdf' : 'image/jpeg',
                url_archivo: url,
                fuente: 'App'
              };
            }).filter(ev => ev !== null && ev.url_archivo),
            notas: p.notas || p.descripcion || "",
            hora_registro: new Date().toISOString()
          }))
        ),
        notas: (tripToSync.notas_erp || []).map(n => ({
          titulo: n.titulo,
          contenido: n.contenido,
          tipo_nota: n.tipo_nota
        }))
      };

      setSyncMessage('Enviando datos al ERP...');
      
      // Log para depuración solicitado por el usuario
      //console.log('--- FINAL PAYLOAD TO ERP ---');
      //console.log(JSON.stringify(finalPayload, null, 2));
      
      const syncResult = await syncViaje(finalPayload);

      // Marcar como sincronizado localmente
      const trips = await loadTrips();
      const updatedTrips = trips.map(t => 
        String(t.id) === tripId 
        ? { 
            ...t, 
            sincronizado: true, 
            uuid_movil: uuid_movil, 
            notas_erp: tripToSync.notas_erp,
            erp_id: syncResult?.clave|| syncResult?.cve_viaje || t.erp_id,
            ultima_sincronizacion: new Date().toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })
          } 
        : t
      );
      await saveTrips(updatedTrips);
      setTrip(updatedTrips.find(t => String(t.id) === tripId));

      triggerHaptic('notificationSuccess');
      Alert.alert('¡Éxito!', '¡Viaje sincronizado con éxito!');
    } catch (error) {
      console.error('Sync process failed:', error);
      Alert.alert('Error de Sincronización', error.message || 'No se pudo sincronizar el viaje.');
      triggerHaptic('notificationError');
    } finally {
      setIsSyncing(false);
      setSyncMessage('');
    }
  };

  const handleSaveNote = async () => {
    if (!noteTitle.trim() || !noteContent.trim()) {
      Alert.alert('Error', 'Título y contenido son obligatorios.');
      return;
    }

    const trips = await loadTrips();
    const newTrips = trips.map(t => {
      if (String(t.id) === tripId) {
        const currentNotes = t.notas_erp || [];
        let updatedNotes;

        if (editingNoteId) {
          updatedNotes = currentNotes.map(n => 
            n.id === editingNoteId 
            ? { ...n, titulo: noteTitle, contenido: noteContent, tipo_nota: noteType } 
            : n
          );
        } else {
          updatedNotes = [
            ...currentNotes,
            {
              id: String(Date.now()),
              titulo: noteTitle,
              contenido: noteContent,
              tipo_nota: noteType
            }
          ];
        }

        return { ...t, notas_erp: updatedNotes };
      }
      return t;
    });

    await saveTrips(newTrips);
    setTrip(newTrips.find(t => String(t.id) === tripId));
    triggerHaptic('notificationSuccess');
    closeNoteModal();
  };

  const handleDeleteNote = async (noteId) => {
    if (trip.sincronizado) return;

    Alert.alert(
      '¿Eliminar nota?',
      'Esta nota se borrará permanentemente.',
      [
        { text: 'Cancelar', style: 'cancel' },
        { 
          text: 'Eliminar', 
          style: 'destructive',
          onPress: async () => {
            const trips = await loadTrips();
            const newTrips = trips.map(t => {
              if (String(t.id) === tripId) {
                return {
                  ...t,
                  notas_erp: (t.notas_erp || []).filter(n => n.id !== noteId)
                };
              }
              return t;
            });

            await saveTrips(newTrips);
            setTrip(newTrips.find(t => String(t.id) === tripId));
            triggerHaptic('impactLight');
          }
        }
      ]
    );
  };

  const openNoteModal = (note = null) => {
    if (note) {
      setEditingNoteId(note.id);
      setNoteTitle(note.titulo);
      setNoteContent(note.contenido);
      setNoteType(note.tipo_nota);
    } else {
      setEditingNoteId(null);
      setNoteTitle('');
      setNoteContent('');
      setNoteType('General');
    }
    setIsNoteModalVisible(true);
  };

  const closeNoteModal = () => {
    setIsNoteModalVisible(false);
  };

  // MAP VIEW LOGIC REMOVED FOR LITE MODE
  // useEffect(() => {
  //   if (trip && mapRef.current) {
  //      ...
  //   }
  // }, [focusedDay, (trip ? trip.id : null)]);

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
      if (isMounted.current) {
        setSearchResults(data);
      }
    } catch (error) {
      console.error('Search error:', error);
      // Opcionalmente mostrar un mensaje de error discreto
    } finally {
      if (isMounted.current) {
        setIsSearching(false);
      }
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

      triggerHaptic('impactLight');
    } catch (error) {
      Alert.alert('Error', 'No se pudo obtener la ubicación actual.');
    }
  };

  const handleMapLongPress = (e) => {
    const coords = e.nativeEvent.coordinate;
    setTempCoords(coords);
    triggerHaptic('impactMedium');
    
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
    if (spendingPercentage >= 100) return '#E63946'; // Rojo Editorial
    if (spendingPercentage >= 80) return '#F4A261'; // Naranja-Ámbar
    return THEME.secondary; // Verde Turquesa
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
                      coords: tempCoords,
                      fotos: photos,
                      facturable: facturable,
                      notas: notes.trim(),
                      categoria: category,
                      cve_catvj: availableCategories.find(c => c.nombre === category)?.cve_catvj || 1
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
                  ? { 
                      ...p, 
                      lugar: place.trim(), 
                      hora: time, 
                      costo: parseFloat(cost) || 0, 
                      descripcion: description.trim(), 
                      coords: tempCoords,
                      fotos: photos,
                      facturable: facturable,
                      notas: notes.trim(),
                      categoria: category,
                      cve_catvj: availableCategories.find(c => c.nombre === category)?.cve_catvj || 1
                    }
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
        triggerHaptic('notificationWarning');
      } else {
        triggerHaptic('impactLight');
      }
    }
    
    triggerHaptic('notificationSuccess');
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
            triggerHaptic('notificationWarning');

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
    setPhotos(point.fotos || []);
    setNotes(point.notas || '');
    setCategory(point.categoria || 'ACTIVIDAD');
    setFacturable(point.facturable || false);

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
    setPhotos([]);
    setNotes('');
    setCategory('ACTIVIDAD');
    setFacturable(false);
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
    setPhotos([]);
    setNotes('');
    setCategory('ACTIVIDAD');
    setFacturable(false);
    setSearchResults([]);
    setIsSelectingResult(false);
  };

  const pickImage = async () => {
    if (photos.length >= 5) {
      Alert.alert('Límite alcanzado', 'Puedes guardar hasta 5 archivos por parada.');
      return;
    }

    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permiso denegado', 'Necesitamos acceso a tu galería para guardar recuerdos.');
      return;
    }

    // Aseguramos que el StatusBar sea visible para evitar que tape botones de Android
    StatusBar.setHidden(false);

    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.7,
    });

    if (!result.canceled) {
      setPhotos([...photos, result.assets[0].uri]);
      triggerHaptic('impactLight');
    }
  };

  const pickDocument = async () => {
    if (photos.length >= 5) {
      Alert.alert('Límite alcanzado', 'Puedes guardar hasta 5 archivos por parada.');
      return;
    }

    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['application/pdf', 'image/*'],
        copyToCacheDirectory: true
      });

      if (!result.canceled) {
        setPhotos([...photos, result.assets[0].uri]);
        triggerHaptic('impactLight');
      }
    } catch (err) {
      console.error('Error picking document:', err);
    }
  };

  const removeImage = (uri) => {
    setPhotos(photos.filter(p => p !== uri));
    triggerHaptic('notificationSuccess');
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

  const handleExport = async () => {
    if (!trip) return;

    const totalCost = calculateTotalTripCost();
    const budget = trip.presupuesto_total || 0;
    
    let message = `🌌 *ITINERARIO: ${trip.titulo_viaje.toUpperCase()}* 🌌\n\n`;
    message += `📅 *Inicio:* ${new Date(trip.fecha_inicio + 'T00:00:00').toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' })}\n`;
    message += `⏳ *Duración:* ${trip.itinerario.length} días\n\n`;

    trip.itinerario.forEach(day => {
      if (day.puntos.length > 0) {
        message += `📍 *DÍA ${day.dia}* (${new Date(day.fecha + 'T00:00:00').toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })})\n`;
        day.puntos.forEach(p => {
          const cat = STOP_CATEGORIES[p.categoria] || STOP_CATEGORIES.ACTIVIDAD;
          message += `  ${cat.emoji} ${p.hora} - ${p.lugar}${p.costo > 0 ? ` ($${p.costo})` : ''}\n`;
          if (p.notas) message += `    📝 _"${p.notas}"_\n`;
        });
        message += `\n`;
      }
    });

    message += `💰 *RESUMEN DE GASTOS* 💰\n`;
    message += `Total gastado: $${totalCost}\n`;
    if (budget > 0) {
      message += `Presupuesto: $${budget}\n`;
      const diff = budget - totalCost;
      if (diff >= 0) {
        message += `✅ ¡Bajo presupuesto! Te sobran $${diff}\n`;
      } else {
        message += `⚠️ Excedido por $${Math.abs(diff)}\n`;
      }
    }

    message += `\n✨ *MENSAJE RAVEN* ✨\n`;
    if (budget > 0 && totalCost <= budget) {
      message += `_"¡Eres un maestro del ahorro intergaláctico! Disfruta tu viaje sin culpas."_ 🚀`;
    } else if (budget > 0) {
      message += `_"El presupuesto es solo un número, los recuerdos son infinitos. ¡Sigue explorando!"_ 🌠`;
    } else {
      message += `_"¡Viajar es vivir! Que tu ruta esté llena de estrellas."_ 🛸`;
    }

    try {
      await Share.share({
        message: message,
        title: `Itinerario: ${trip.titulo_viaje}`
      });
      triggerHaptic('notificationSuccess');
    } catch (error) {
      Alert.alert('Error', 'No se pudo compartir el itinerario.');
    }
  };


  const renderDay = (day) => (
    <View key={String(day.dia)} style={styles.daySection}>
      <View style={styles.dayHeader}>
        <Calendar size={18} color={trip.color_acento || '#00FF41'} />
        <Text style={[styles.dayTitle, { color: trip.color_acento || '#00FF41' }]}>
          Día {day.dia} • {new Date(day.fecha + 'T00:00:00').toLocaleDateString('es-ES', { day: 'numeric', month: 'long' })}
        </Text>
        {!trip.readonly && (
          <TouchableOpacity
            style={styles.addButton}
            onPress={() => openModal(day.dia)}
            activeOpacity={0.7}
          >
            <Plus size={16} color={THEME.primary} />
            <Text style={styles.addButtonText}>Añadir parada</Text>
          </TouchableOpacity>
        )}
      </View>
      {day.puntos.map((point, index) => (
        <TimelineItem
          key={String(point.id)}
          point={point}
          isLast={index === day.puntos.length - 1}
          accentColor={trip.color_acento || '#00FF41'}
          onToggle={trip.readonly ? () => {} : togglePoint}
          onLongPress={trip.readonly ? () => {} : handleLongPressPoint}
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
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <Text style={styles.navTitle} numberOfLines={1}>{trip.titulo_viaje}</Text>
            {trip.sincronizado ? (
              <TouchableOpacity 
                style={styles.idBadge} 
                onPress={() => copyToClipboard(trip.erp_id)}
                activeOpacity={0.7}
              >
                <Text style={styles.idBadgeText}>#{trip.erp_id || '...'}</Text>
              </TouchableOpacity>
            ) : (
              <View style={[styles.idBadge, { backgroundColor: THEME.divider }]}>
                <Text style={[styles.idBadgeText, { color: THEME.textMuted }]}>Pendiente</Text>
              </View>
            )}
          </View>
          <View style={styles.budgetHeader}>
            <View>
              <Text style={styles.totalCostText}>
                Gasto: <Text style={{ color: isOverBudget ? '#E63946' : THEME.secondary }}>${calculateTotalTripCost()}</Text>
                {trip.presupuesto_total > 0 && ` / $${trip.presupuesto_total}`}
              </Text>
              {trip.ultima_sincronizacion && (
                <Text style={styles.lastSyncText}>Última sincronización: {trip.ultima_sincronizacion}</Text>
              )}
            </View>
            {trip.presupuesto_total > 0 && (
              <Text style={[styles.percentageText, { color: getProgressBarColor() }]}>
                {Math.round(spendingPercentage)}%
              </Text>
            )}
          </View>
        </View>
        <TouchableOpacity
          onPress={handleSync}
          style={[styles.syncButton, !trip.readonly && !isLinked && { opacity: 0.5 }]}
          activeOpacity={0.7}
          disabled={isSyncing}
        >
          {isSyncing ? (
            <ActivityIndicator size="small" color={THEME.primary} />
          ) : (
            trip.readonly ? (
              <RefreshCw color={THEME.secondary} size={22} />
            ) : (
              <CloudUpload color={trip.sincronizado ? (isOverBudget ? '#E63946' : THEME.secondary) : (isLinked ? THEME.primary : THEME.textMuted)} size={22} />
            )
          )}
        </TouchableOpacity>
        <TouchableOpacity
          onPress={handleExport}
          style={styles.shareButton}
          activeOpacity={0.7}
        >
          <Share2 color={THEME.primary} size={22} />
        </TouchableOpacity>
      </View>

      {trip.readonly && (
        <Animatable.View animation="fadeInDown" style={styles.readOnlyBanner}>
          <User size={16} color="#FFF" />
          <Text style={styles.readOnlyText}>
            Modo Visualización: Este viaje pertenece a <Text style={{ fontWeight: 'bold' }}>{trip.propietario || 'otro usuario'}</Text>
          </Text>
        </Animatable.View>
      )}

      {trip.presupuesto_total > 0 && (
        <View style={styles.budgetProgressWrapper}>
          <View style={styles.progressBarShell}>
            <View 
              style={[
                styles.progressBarFill, 
                { 
                  width: `${Math.min(spendingPercentage, 100)}%`,
                  backgroundColor: getProgressBarColor()
                }
              ]} 
            />
          </View>
        </View>
      )}

      {isSyncing && (
        <View style={styles.syncProgressOverlay}>
          <ActivityIndicator size="large" color={THEME.primary} />
          <Text style={styles.syncProgressText}>{syncMessage}</Text>
        </View>
      )}

      <View style={styles.mapWrapper}>
        <View style={styles.staticMapPlaceholder}>
          <MapIcon size={48} color={THEME.textMuted} />
          <Text style={styles.staticMapText}>Vista de Mapa Lite</Text>
          <TouchableOpacity 
            style={styles.externalMapBtn}
            onPress={() => {
              // Open Google Maps search for the current day's first point or trip location
              const day = trip.itinerario.find(d => d.dia === focusedDay);
              const firstPoint = day?.puntos?.find(p => p.coords) || day?.puntos?.[0];
              
              let query = trip.titulo_viaje;
              if (firstPoint) {
                 if (firstPoint.coords) {
                   query = `${firstPoint.coords.latitude},${firstPoint.coords.longitude}`;
                 } else {
                   query = firstPoint.lugar;
                 }
              }
              
              const url = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;
              Linking.openURL(url).catch(err => Alert.alert('Error', 'No se pudo abrir mapas.'));
            }}
          >
            <Text style={styles.externalMapBtnText}>Ver Ruta en Google Maps</Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.daySelectorWrapper}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.daySelector}>
          {trip.itinerario.map(day => (
            <TouchableOpacity
              key={day.dia}
              style={[
                styles.dayTab,
                focusedDay === day.dia && styles.dayTabActive
              ]}
              onPress={() => {
                setFocusedDay(day.dia);
                triggerHaptic('impactLight');
              }}
              activeOpacity={0.7}
            >
              <Text style={[
                styles.dayTabText,
                focusedDay === day.dia && styles.dayTabTextActive
              ]}>
                Día {day.dia}
              </Text>
              <View style={[styles.dayCostBadge, focusedDay === day.dia && styles.dayCostBadgeActive]}>
                <Text style={[styles.dayCostBadgeText, focusedDay === day.dia && styles.dayCostBadgeTextActive]}>
                  ${calculateDayCost(day.dia)}
                </Text>
              </View>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      <ScrollView style={styles.content}>
        {trip.itinerario.filter(d => d.dia === focusedDay).map(renderDay)}
        
        {/* Notas y Reportes Section */}
        <View style={styles.notesSection}>
          <View style={styles.notesHeader}>
            <Text style={styles.sectionTitle}>Notas y Reportes</Text>
            {!trip.readonly && (
              <TouchableOpacity style={styles.addNoteBtn} onPress={() => openNoteModal()}>
                <MessageSquarePlus size={18} color={THEME.primary} />
                <Text style={styles.addNoteBtnText}>Agregar Nota</Text>
              </TouchableOpacity>
            )}
          </View>

          {(trip.notas_erp || []).length === 0 ? (
            <View style={styles.emptyNotes}>
              <FileText size={40} color={THEME.textMuted + '40'} />
              <Text style={styles.emptyNotesText}>No hay notas en este viaje.</Text>
            </View>
          ) : (
            <View style={styles.notesList}>
              {(trip.notas_erp || []).map((note) => (
                <TouchableOpacity 
                   key={note.id} 
                   style={styles.noteCard}
                   onPress={() => !trip.sincronizado && openNoteModal(note)}
                >
                  <View style={[
                    styles.noteTypeIndicator, 
                    { backgroundColor: note.tipo_nota === 'Incidencia' ? '#E63946' : (note.tipo_nota === 'Checklist' ? THEME.secondary : '#F4D03F') }
                  ]}>
                    {note.tipo_nota === 'Incidencia' ? <Info size={14} color="#FFF" /> : 
                     note.tipo_nota === 'Checklist' ? <FileText size={14} color="#FFF" /> : 
                     <FileText size={14} color="#FFF" />}
                  </View>
                  <View style={styles.noteContentInfo}>
                    <Text style={styles.noteTitle}>{note.titulo}</Text>
                    <Text style={styles.notePreview} numberOfLines={2}>{note.contenido}</Text>
                    <Text style={styles.noteTypeTag}>{note.tipo_nota}</Text>
                  </View>
                  {!trip.sincronizado && (
                    <TouchableOpacity onPress={() => handleDeleteNote(note.id)} style={styles.deleteNoteBtn}>
                      <Trash2 size={18} color="#E63946" style={{ opacity: 0.6 }} />
                    </TouchableOpacity>
                  )}
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>
      </ScrollView>

      {/* Note Modal */}
      <Modal
        visible={isNoteModalVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={closeNoteModal}
      >
        <Pressable style={styles.modalOverlay} onPress={closeNoteModal}>
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            style={styles.modalContainer}
          >
            <Pressable 
              style={styles.modalContent} 
              onPress={(e) => e.stopPropagation()}
            >
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>
                  {editingNoteId ? 'Editar Nota' : 'Nueva Nota'}
                </Text>
                <TouchableOpacity onPress={closeNoteModal}>
                  <X color={THEME.textMuted} size={24} />
                </TouchableOpacity>
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>Título</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Ej. Daño en unidad"
                  value={noteTitle}
                  onChangeText={setNoteTitle}
                  placeholderTextColor={THEME.textMuted}
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>Tipo de Nota</Text>
                <View style={styles.typeSelector}>
                  {['General', 'Incidencia', 'Checklist'].map((type) => (
                    <TouchableOpacity
                      key={type}
                      style={[
                        styles.typeOption,
                        noteType === type && styles.typeOptionActive,
                        noteType === type && { borderColor: type === 'Incidencia' ? '#E63946' : (type === 'Checklist' ? THEME.secondary : '#F4D03F') }
                      ]}
                      onPress={() => setNoteType(type)}
                    >
                      <Text style={[
                        styles.typeOptionText,
                        noteType === type && styles.typeOptionTextActive,
                        noteType === type && { color: type === 'Incidencia' ? '#E63946' : (type === 'Checklist' ? THEME.secondary : '#D4AC0D') }
                      ]}>{type}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>Contenido</Text>
                <TextInput
                  style={[styles.input, styles.textArea]}
                  placeholder="Describe los detalles aquí..."
                  value={noteContent}
                  onChangeText={setNoteContent}
                  multiline={true}
                  numberOfLines={5}
                  placeholderTextColor={THEME.textMuted}
                />
              </View>

              <TouchableOpacity style={styles.saveButton} onPress={handleSaveNote}>
                <Save color="#FFF" size={20} />
                <Text style={styles.saveButtonText}>Guardar Nota</Text>
              </TouchableOpacity>
            </Pressable>
          </KeyboardAvoidingView>
        </Pressable>
      </Modal>

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
                        <Trash2 color="#E63946" size={20} />
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
                            
                            triggerHaptic('impactMedium');
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

                <View style={[styles.inputGroup, styles.billingRow]}>
                  <View style={styles.billingLabelContainer}>
                    <FileText size={18} color={THEME.primary} />
                    <Text style={styles.billingLabel}>¿Requiere Factura?</Text>
                  </View>
                  <Switch
                    value={facturable}
                    onValueChange={(val) => {
                      setFacturable(val);
                      triggerHaptic('impactLight');
                    }}
                    trackColor={{ false: THEME.border, true: THEME.primary + '40' }}
                    thumbColor={facturable ? THEME.primary : '#f4f3f4'}
                  />
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.label}>Categoría</Text>
                  <ScrollView 
                    horizontal 
                    showsHorizontalScrollIndicator={false} 
                    style={styles.categorySelector}
                    contentContainerStyle={styles.categoryContent}
                  >
                    {(availableCategories.length > 0 ? availableCategories : Object.values(STOP_CATEGORIES)).map((cat) => {
                      const iconName = cat.icon || 'MoreHorizontal';
                      const IconComp = {
                        Camera: Camera,
                        Plane: MapIcon,
                        Bed: Info,
                        Car: MapIcon,
                        Utensils: Info,
                        Fuel: DollarSign,
                        MoreHorizontal: Plus,
                        Receipt: FileText,
                        AlertCircle: Info,
                        ClipboardList: FileText
                      }[iconName] || Plus;

                      const idString = String(cat.id || cat.cve_catvj);
                      const isSelected = category === (cat.nombre || cat.id);

                      return (
                        <TouchableOpacity
                          key={idString}
                          style={[
                            styles.categoryItem,
                            isSelected && { borderColor: cat.color || THEME.primary, backgroundColor: (cat.color || THEME.primary) + '15' }
                          ]}
                          onPress={() => {
                            setCategory(cat.nombre);
                            triggerHaptic('impactLight');
                          }}
                          activeOpacity={0.7}
                        >
                          <IconComp size={20} color={isSelected ? (cat.color || THEME.primary) : THEME.textMuted} />
                          <Text style={[
                            styles.categoryItemText,
                            isSelected && { color: cat.color || THEME.primary, fontWeight: 'bold' }
                          ]}>
                            {cat.nombre}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </ScrollView>
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.label}>Descripción</Text>
                  <TextInput
                    style={[styles.input, styles.textArea, { minHeight: 120 }]}
                    placeholder="Describe detalladamente el motivo del gasto o actividad..."
                    placeholderTextColor={THEME.textMuted}
                    value={description}
                    onChangeText={setDescription}
                    multiline={true}
                    numberOfLines={6}
                    textAlignVertical="top"
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

                <View style={styles.memoriesSection}>
                  <View style={styles.sectionDivider} />
                  <View style={styles.rowBetween}>
                    <Text style={styles.sectionTitle}>
                      <ImageIcon size={18} color={THEME.primary} /> Evidencias
                    </Text>
                    <Text style={styles.photoCount}>{photos.length}/5 archivos</Text>
                  </View>

                  <TextInput
                    style={[styles.input, styles.notesInput]}
                    placeholder="Escribe algunas notas o recuerdos aquí..."
                    placeholderTextColor={THEME.textMuted}
                    value={notes}
                    onChangeText={setNotes}
                    multiline={true}
                    numberOfLines={4}
                  />

                  <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.photosGrid}>
                    {photos.map((uri, index) => (
                      <View key={index} style={styles.photoContainer}>
                        <TouchableOpacity onPress={() => setFullScreenPhoto(uri)} activeOpacity={0.9}>
                          <Image source={{ uri }} style={styles.photoThumb} />
                        </TouchableOpacity>
                        <TouchableOpacity 
                          style={styles.removePhoto} 
                          onPress={() => removeImage(uri)}
                          activeOpacity={0.7}
                        >
                          <X color="#FFF" size={12} />
                        </TouchableOpacity>
                      </View>
                    ))}
                    {photos.length < 5 && (
                      <View style={styles.addMediaContainer}>
                        <TouchableOpacity style={styles.addMediaItem} onPress={pickImage} activeOpacity={0.7}>
                          <Camera color={THEME.primary} size={20} />
                          <Text style={styles.addMediaText}>Cámara</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.addMediaItem} onPress={pickDocument} activeOpacity={0.7}>
                          <FileText color={THEME.primary} size={20} />
                          <Text style={styles.addMediaText}>Doc/PDF</Text>
                        </TouchableOpacity>
                      </View>
                    )}
                  </ScrollView>
                </View>
              </ScrollView>
            </Pressable>
          </KeyboardAvoidingView>
        </Pressable>
      </Modal>

      <Modal visible={!!fullScreenPhoto} transparent={true} animationType="fade">
        <Pressable style={styles.fullScreenOverlay} onPress={() => setFullScreenPhoto(null)}>
          <Image source={{ uri: fullScreenPhoto }} style={styles.fullScreenImage} resizeMode="contain" />
          <TouchableOpacity style={styles.closeFullScreen} onPress={() => setFullScreenPhoto(null)}>
            <X color="#FFF" size={32} />
          </TouchableOpacity>
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
  idBadge: {
    backgroundColor: THEME.primary + '20',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: THEME.primary + '40',
  },
  idBadgeText: {
    fontSize: 12,
    fontWeight: '800',
    color: THEME.primary,
  },
  lastSyncText: {
    fontSize: 10,
    color: THEME.secondary,
    fontWeight: '600',
    marginTop: 2,
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
  },
  content: {
    flex: 1,
  },
  mapWrapper: {
    height: 200,
    backgroundColor: THEME.surfaceLight,
    marginVertical: 10,
    borderRadius: 16,
    overflow: 'hidden',
    marginHorizontal: 16,
  },
  staticMapPlaceholder: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#E9ECEF',
    gap: 12,
  },
  staticMapText: {
    color: THEME.textMuted,
    fontSize: 14,
    fontWeight: '500',
  },
  externalMapBtn: {
    backgroundColor: THEME.surface,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: THEME.divider,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  externalMapBtnText: {
    color: THEME.primary,
    fontWeight: 'bold',
    fontSize: 14,
  },
  markerPin: {
    width: 16,
    height: 16,
    borderRadius: 8,
    borderWidth: 3,
    borderColor: '#FFFFFF',
    backgroundColor: THEME.primary, // Esmeralda
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 5,
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
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 30, // Pill style
    borderWidth: 1,
    borderColor: THEME.divider,
    backgroundColor: THEME.surface,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  dayTabActive: {
    backgroundColor: THEME.primary,
    borderColor: THEME.primary,
  },
  dayTabText: {
    color: THEME.textMuted,
    fontSize: 14,
    fontWeight: '600',
  },
  dayTabTextActive: {
    color: '#FFFFFF',
  },
  dayCostBadge: {
    backgroundColor: '#F1F3F5',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  dayCostBadgeActive: {
    backgroundColor: 'rgba(255,255,255,0.2)',
  },
  dayCostBadgeText: {
    fontSize: 11,
    color: THEME.primary,
    fontWeight: 'bold',
  },
  dayCostBadgeTextActive: {
    color: '#FFFFFF',
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
    fontSize: 20,
    fontWeight: 'bold',
    marginLeft: 10,
    color: THEME.text,
    letterSpacing: -0.5,
    flex: 1,
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 30, // Pill style
    borderWidth: 1,
    borderColor: THEME.primary,
    backgroundColor: THEME.surface,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 5,
    elevation: 2,
  },
  addButtonText: {
    fontSize: 13,
    fontWeight: 'bold',
    color: THEME.primary,
    marginLeft: 6,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)', // Sutil para luz
    justifyContent: 'flex-end',
  },
  modalContainer: {
    width: '100%',
  },
  modalContent: {
    backgroundColor: THEME.surface,
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    padding: 24,
    paddingBottom: 40,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -10 },
    shadowOpacity: 0.1,
    shadowRadius: 20,
    elevation: 10,
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
    fontSize: 22,
    fontWeight: 'bold',
    color: THEME.primary,
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
    shadowOpacity: 0.1,
    shadowRadius: 15,
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
    borderRadius: 30, // Pill style
    marginTop: 10,
    shadowColor: THEME.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 5,
  },
  saveButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: 'bold',
    marginLeft: 10,
  },
  sectionDivider: {
    height: 1,
    backgroundColor: THEME.divider,
    marginVertical: 20,
  },
  memoriesSection: {
    paddingBottom: 40,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: THEME.text,
    marginBottom: 16,
    flexDirection: 'row',
    alignItems: 'center',
  },
  rowBetween: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  photoCount: {
    fontSize: 12,
    color: THEME.textMuted,
  },
  notesInput: {
    minHeight: 120,
    textAlignVertical: 'top',
    borderColor: THEME.divider,
    backgroundColor: THEME.surfaceLight,
    color: THEME.text, 
    fontSize: 15,
    lineHeight: 22,
    padding: 16,
    borderRadius: 16,
  },
  photosGrid: {
    marginTop: 16,
    flexDirection: 'row',
  },
  photoContainer: {
    marginRight: 12,
    position: 'relative',
  },
  photoThumb: {
    width: 110,
    height: 110,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: THEME.divider,
  },
  removePhoto: {
    position: 'absolute',
    top: -6,
    right: -6,
    backgroundColor: '#FF4757',
    width: 20,
    height: 20,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: THEME.surface,
  },
  addPhotoBtn: {
    width: 100,
    height: 100,
    borderRadius: 20,
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: THEME.divider,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: THEME.surfaceLight,
  },
  fullScreenOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.95)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  fullScreenImage: {
    width: '100%',
    height: '100%',
  },
  closeFullScreen: {
    position: 'absolute',
    top: 50,
    right: 20,
    padding: 10,
  },
  shareButton: {
    padding: 8,
    backgroundColor: '#F1F3F5',
    borderRadius: 12,
  },
  syncButton: {
    padding: 8,
    backgroundColor: '#F1F3F5',
    borderRadius: 12,
    marginRight: 8,
  },
  categorySelector: {
    marginTop: 8,
  },
  categoryContent: {
    paddingRight: 16,
    gap: 12,
  },
  categoryItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 30, // Pill style
    borderWidth: 1.5,
    borderColor: THEME.divider,
    backgroundColor: THEME.surfaceLight,
  },
  categoryItemText: {
    fontSize: 14,
    color: THEME.textMuted,
    marginLeft: 8,
  },
  syncProgressOverlay: {
    padding: 16,
    backgroundColor: THEME.primary + '10',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    marginHorizontal: 16,
    borderRadius: 12,
    marginBottom: 8,
  },
  syncProgressText: {
    color: THEME.primary,
    fontWeight: '700',
    fontSize: 14,
  },
  notesSection: {
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: THEME.divider,
    backgroundColor: THEME.surface,
  },
  notesHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  addNoteBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  addNoteBtnText: {
    color: THEME.primary,
    fontWeight: '700',
    fontSize: 14,
  },
  emptyNotes: {
    alignItems: 'center',
    paddingVertical: 30,
    gap: 10,
  },
  emptyNotesText: {
    color: THEME.textMuted,
    fontSize: 14,
  },
  notesList: {
    gap: 12,
  },
  noteCard: {
    flexDirection: 'row',
    backgroundColor: THEME.background,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: THEME.divider,
    alignItems: 'center',
  },
  noteTypeIndicator: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  noteContentInfo: {
    flex: 1,
  },
  noteTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: THEME.text,
  },
  notePreview: {
    fontSize: 13,
    color: THEME.textSecondary,
    marginTop: 2,
  },
  noteTypeTag: {
    fontSize: 10,
    fontWeight: '700',
    color: THEME.textMuted,
    textTransform: 'uppercase',
    marginTop: 6,
  },
  deleteNoteBtn: {
    padding: 8,
  },
  typeSelector: {
    flexDirection: 'row',
    gap: 10,
  },
  typeOption: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: THEME.divider,
    backgroundColor: THEME.background,
  },
  typeOptionActive: {
    backgroundColor: THEME.surface,
    borderWidth: 2,
  },
  typeOptionText: {
    fontSize: 12,
    fontWeight: '600',
    color: THEME.textMuted,
  },
  typeOptionTextActive: {
    fontWeight: '800',
  },
  billingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: THEME.primary + '08',
    padding: 12,
    borderRadius: 12,
    marginBottom: 16,
  },
  billingLabelContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  billingLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: THEME.primary,
  },
  addMediaContainer: {
    flexDirection: 'row',
    gap: 12,
  },
  addMediaItem: {
    width: 80,
    height: 90,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: THEME.primary,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: THEME.surface,
  },
  addMediaText: {
    fontSize: 10,
    fontWeight: '700',
    color: THEME.primary,
    marginTop: 4,
  },
  readOnlyBanner: {
    backgroundColor: THEME.secondary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    gap: 10,
  },
  readOnlyText: {
    color: '#FFF',
    fontSize: 13,
    fontWeight: '500',
  }
});
