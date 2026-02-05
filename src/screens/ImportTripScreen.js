import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ScrollView
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Search, Download, ArrowLeft, Info, FileText } from 'lucide-react-native';
import { THEME } from '../theme/theme';
import { getViajeById } from '../services/api';
import { loadTrips, saveTrips } from '../utils/storage';
import { triggerHaptic } from '../utils/haptics';

const ImportTripScreen = ({ navigation }) => {
  const insets = useSafeAreaInsets();
  const [tripId, setTripId] = useState('');
  const [loading, setLoading] = useState(false);
  const [searchResult, setSearchResult] = useState(null);

  const handleSearch = async () => {
    if (!tripId.trim() || isNaN(tripId)) {
      Alert.alert('Error', 'Por favor ingresa un ID de viaje numérico válido.');
      return;
    }

    setLoading(true);
    setSearchResult(null);
    try {
      const trip = await getViajeById(tripId);
      if (trip) {
        setSearchResult(trip);
        triggerHaptic('notificationSuccess');
      } else {
        Alert.alert('No encontrado', 'No se encontró ningún viaje con ese ID.');
      }
    } catch (error) {
      Alert.alert('Error', 'Ocurrió un error al buscar el viaje. Verifica tu conexión.');
    } finally {
      setLoading(false);
    }
  };

  const handleImport = async () => {
    if (!searchResult) return;

    try {
      const localTrips = (await loadTrips()) || [];
      
      // Filtro robusto para evitar duplicados sin borrar lo demás
      const filteredTrips = localTrips.filter(t => {
        const erpIdMatch = t.erp_id && String(t.erp_id) === String(searchResult.id);
        const uuidMatch = t.uuid_movil && t.uuid_movil === searchResult.uuid_movil;
        const localIdMatch = String(t.id) === String(searchResult.id);
        
        // Mantener el viaje SOLO si no coincide con ninguno de los criterios de duplicado
        return !(erpIdMatch || uuidMatch || localIdMatch);
      });

      // Preparar viaje para guardado local con marca de solo lectura
      const tripToImport = {
        ...searchResult,
        id: String(Date.now()), // ID local temporal para navegación
        erp_id: searchResult.id,
        readonly: true,
        sincronizado: true, // Se considera sincronizado porque viene del ERP
        titulo_viaje: searchResult.titulo || "Viaje Importado",
        presupuesto_total: searchResult.presupuesto || 0,
        itinerario: searchResult.paradas ? transformParadasToItinerario(searchResult.paradas, searchResult.fecha_inicio) : [],
        propietario: searchResult.nombre_usuario || "Otro técnico",
        color_acento: searchResult.color_acento || THEME.primary
      };

      await saveTrips([...filteredTrips, tripToImport]);
      
      Alert.alert(
        '¡Éxito!',
        'Viaje importado en modo lectura.',
        [{ text: 'Ver Viaje', onPress: () => navigation.navigate('TripDetailScreen', { tripId: tripToImport.id }) }]
      );
      
      triggerHaptic('notificationSuccess');
    } catch (error) {
      console.error('Error importing:', error);
      Alert.alert('Error', 'No se pudo guardar el viaje localmente.');
    }
  };

  // Helper para convertir el formato plano del ERP al formato de días de la App
  const transformParadasToItinerario = (paradas, fechaInicio) => {
    // Por simplicidad en importación rápida, agrupamos todo en el día 1 
    // o preservamos la lógica si el ERP devuelve fechas. 
    // Aquí implementamos una agrupación básica por fecha.
    const groups = {};
    paradas.forEach(p => {
      const date = p.fecha || fechaInicio || new Date().toISOString().split('T')[0];
      if (!groups[date]) groups[date] = [];
      groups[date].push({
        ...p,
        id: String(p.id || Math.random()),
        costo: p.monto || 0,
        fotos: p.evidencias ? p.evidencias.map(e => e.url_archivo) : []
      });
    });

    return Object.keys(groups).sort().map((date, index) => ({
      dia: index + 1,
      fecha: date,
      puntos: groups[date]
    }));
  };

  return (
    <View style={styles.container}>
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        <View style={[styles.header, { paddingTop: insets.top + 10 }]}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <ArrowLeft color={THEME.text} size={24} />
          </TouchableOpacity>
          <Text style={styles.title}>Importar Viaje</Text>
        </View>

        <ScrollView contentContainerStyle={styles.content}>
          <View style={styles.searchSection}>
            <Text style={styles.label}>ID del Viaje (ERP)</Text>
            <View style={styles.searchContainer}>
              <Search color={THEME.textMuted} size={20} style={styles.searchIcon} />
              <TextInput
                style={styles.input}
                placeholder="Ej: 1024"
                placeholderTextColor={THEME.textMuted}
                value={tripId}
                onChangeText={setTripId}
                keyboardType="numeric"
              />
              <TouchableOpacity 
                style={styles.searchBtn} 
                onPress={handleSearch}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator size="small" color="#FFF" />
                ) : (
                  <Text style={styles.searchBtnText}>Buscar</Text>
                )}
              </TouchableOpacity>
            </View>
            <Text style={styles.hint}>Pide el ID numérico al dueño del viaje o revisa el ERP.</Text>
          </View>

          {searchResult && (
            <View style={styles.resultCard}>
              <View style={styles.resultHeader}>
                <FileText color={THEME.primary} size={32} />
                <View style={{ flex: 1, marginLeft: 12 }}>
                  <Text style={styles.resultTitle}>{searchResult.titulo}</Text>
                  <Text style={styles.resultOwner}>Por: {searchResult.nombre_usuario || 'Técnico Raven'}</Text>
                </View>
              </View>
              
              <View style={styles.infoGrid}>
                <View style={styles.infoItem}>
                  <Text style={styles.infoLabel}>Fecha</Text>
                  <Text style={styles.infoValue}>{searchResult.fecha_inicio}</Text>
                </View>
                <View style={styles.infoItem}>
                  <Text style={styles.infoLabel}>Paradas</Text>
                  <Text style={styles.infoValue}>{searchResult.paradas?.length || 0}</Text>
                </View>
              </View>

              <View style={styles.warningBox}>
                <Info color={THEME.secondary} size={18} />
                <Text style={styles.warningText}>
                  Este viaje se importará en modo **Solo Lectura**.
                </Text>
              </View>

              <TouchableOpacity style={styles.importBtn} onPress={handleImport}>
                <Download color="#FFF" size={20} />
                <Text style={styles.importBtnText}>Confirmar Importación</Text>
              </TouchableOpacity>
            </View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: THEME.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: 20,
    gap: 16,
  },
  backButton: {
    padding: 8,
    backgroundColor: THEME.surface,
    borderRadius: 12,
  },
  title: {
    fontSize: 24,
    fontWeight: '800',
    color: THEME.text,
    letterSpacing: -0.5,
  },
  content: {
    padding: 20,
  },
  searchSection: {
    marginBottom: 30,
  },
  label: {
    fontSize: 12,
    fontWeight: '700',
    color: THEME.textMuted,
    textTransform: 'uppercase',
    marginBottom: 12,
    letterSpacing: 1,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: THEME.surface,
    borderRadius: 16,
    paddingLeft: 16,
    borderWidth: 1,
    borderColor: THEME.divider,
  },
  searchIcon: {
    marginRight: 10,
  },
  input: {
    flex: 1,
    height: 56,
    color: THEME.text,
    fontSize: 16,
    fontWeight: '500',
  },
  searchBtn: {
    backgroundColor: THEME.primary,
    paddingHorizontal: 20,
    height: 56,
    borderTopRightRadius: 15,
    borderBottomRightRadius: 15,
    justifyContent: 'center',
    alignItems: 'center',
  },
  searchBtnText: {
    color: '#FFF',
    fontWeight: 'bold',
  },
  hint: {
    fontSize: 12,
    color: THEME.textMuted,
    marginTop: 10,
    lineHeight: 18,
  },
  resultCard: {
    backgroundColor: THEME.surface,
    borderRadius: 24,
    padding: 24,
    borderWidth: 1,
    borderColor: THEME.divider,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.1,
    shadowRadius: 20,
    elevation: 5,
  },
  resultHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  resultTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: THEME.text,
  },
  resultOwner: {
    fontSize: 14,
    color: THEME.textMuted,
    marginTop: 2,
  },
  infoGrid: {
    flexDirection: 'row',
    marginBottom: 24,
    gap: 20,
  },
  infoItem: {
    flex: 1,
  },
  infoLabel: {
    fontSize: 10,
    color: THEME.textMuted,
    textTransform: 'uppercase',
    fontWeight: '700',
    marginBottom: 4,
  },
  infoValue: {
    fontSize: 15,
    fontWeight: '600',
    color: THEME.text,
  },
  warningBox: {
    flexDirection: 'row',
    backgroundColor: THEME.secondary + '10',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 24,
    gap: 12,
  },
  warningText: {
    flex: 1,
    fontSize: 13,
    color: THEME.secondary,
    fontWeight: '500',
  },
  importBtn: {
    backgroundColor: THEME.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 56,
    borderRadius: 28,
    gap: 10,
  },
  importBtnText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: 'bold',
  }
});

export default ImportTripScreen;
