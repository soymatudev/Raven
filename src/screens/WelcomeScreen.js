import React, { useState, useCallback } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  TouchableOpacity, 
  Image, 
  Dimensions 
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { THEME } from '../theme/theme';
import { loadTrips, loadUserData } from '../utils/storage';
import { useFocusEffect } from '@react-navigation/native';
import { Plus, Compass, Image as ImageIcon, Quote, Download } from 'lucide-react-native';
import * as Animatable from 'react-native-animatable';
import { triggerHaptic } from '../utils/haptics';

const { width } = Dimensions.get('window');

const TRAVEL_QUOTES = [
  "El mundo es un libro y aquellos que no viajan solo leen una página.",
  "No todos los que vagan están perdidos.",
  "Viajar es la única cosa que compras que te hace más rico.",
  "La aventura vale la pena.",
  "No he estado en todas partes, pero están en mi lista.",
  "Viajar es vivir.",
  "El viaje de mil millas comienza con un solo paso."
];

export const WelcomeScreen = ({ navigation }) => {
  const [activeTrip, setActiveTrip] = useState(null);
  const [nextTripDays, setNextTripDays] = useState(null);
  const [quote, setQuote] = useState(TRAVEL_QUOTES[0]);
  const [userName, setUserName] = useState('');

  const fetchData = async () => {
    const trips = await loadTrips();
    const userData = await loadUserData();
    
    calculateActiveTrip(trips);
    calculateNextTrip(trips);
    
    if (userData?.name) {
      setUserName(userData.name);
    } else {
      setUserName('');
    }

    // Random quote each time we focus
    setQuote(TRAVEL_QUOTES[Math.floor(Math.random() * TRAVEL_QUOTES.length)]);
  };

  const calculateActiveTrip = (allTrips) => {
    const today = new Date().toISOString().split('T')[0];
    
    // Find active trip
    const active = allTrips.find(trip => {
      if (!trip.fecha_inicio || !trip.itinerario.length) return false;
      const lastDayStr = trip.itinerario[trip.itinerario.length - 1].fecha;
      return today >= trip.fecha_inicio && today <= lastDayStr;
    });

    if (active) {
      const spentTotal = active.itinerario.reduce((acc, day) => 
        acc + day.puntos.reduce((pAcc, p) => pAcc + (p.costo || 0), 0)
      , 0);

      const completedStops = active.itinerario.reduce((acc, day) => 
        acc + day.puntos.filter(p => p.completado).length
      , 0);

      const totalStops = active.itinerario.reduce((acc, day) => 
        acc + day.puntos.length
      , 0);

      // Pending sync: if trip not synced, all are pending. If synced, checking points is speculative but for now we follow trip status.
      // Or better: count points that have photos and trip is not synced? 
      // User said "Tickets pendientes de sincronizar". Let's count points with cost > 0 if not synced.
      const pendingSyncCount = active.sincronizado ? 0 : active.itinerario.reduce((acc, day) => 
        acc + day.puntos.length
      , 0);

      setActiveTrip({
        ...active,
        spentTotal,
        completedStops,
        totalStops,
        pendingSyncCount
      });
    } else {
      setActiveTrip(null);
    }
  };

  const calculateNextTrip = (allTrips) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const upcoming = allTrips
      .filter(t => new Date(t.fecha_inicio + 'T00:00:00') > today)
      .sort((a, b) => new Date(a.fecha_inicio) - new Date(b.fecha_inicio));

    if (upcoming.length > 0) {
      const nextDate = new Date(upcoming[0].fecha_inicio + 'T00:00:00');
      const diffTime = Math.abs(nextDate - today);
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      setNextTripDays(diffDays);
    } else {
      setNextTripDays(null);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchData();
    }, [])
  );

  const todayStr = new Date().toLocaleDateString('es-ES', { 
    weekday: 'long', 
    day: 'numeric', 
    month: 'long' 
  });

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        
        {/* Header */}
        <Animatable.View animation="fadeIn" duration={1000} style={styles.header}>
          <Text style={styles.greeting}>Buenos días, {userName || 'Explorador'}</Text>
          <Text style={styles.date}>{todayStr.charAt(0).toUpperCase() + todayStr.slice(1)}</Text>
        </Animatable.View>

        {/* Countdown Widget */}
        <TouchableOpacity 
          onPress={() => navigation.navigate('Mis Viajes')}
          activeOpacity={0.9}
        >
          <Animatable.View animation="fadeInUp" delay={300} style={styles.countdownCard}>
            <View style={styles.countdownInfo}>
              <Compass color="#FFFFFF" size={32} style={styles.compassIcon} />
              <View>
                <Text style={styles.countdownTitle}>
                  {nextTripDays !== null 
                    ? `Próxima parada en ${nextTripDays} ${nextTripDays === 1 ? 'día' : 'días'}`
                    : '¿A dónde vamos después?'}
                </Text>
                <Text style={styles.countdownSubtitle}>
                  {nextTripDays !== null ? 'Tu aventura está cerca' : 'Planea tu siguiente ruta'}
                </Text>
              </View>
            </View>
          </Animatable.View>
        </TouchableOpacity>
        
        {/* Quick Actions */}
        <Animatable.View animation="fadeInUp" delay={400} style={styles.actionsGrid}>
          <TouchableOpacity 
            style={styles.actionItem} 
            onPress={() => {
              triggerHaptic('impactMedium');
              navigation.navigate('CreateTrip');
            }}
          >
            <View style={[styles.actionIconContainer, { backgroundColor: THEME.primary + '15' }]}>
              <Plus color={THEME.primary} size={24} />
            </View>
            <Text style={styles.actionText}>Nuevo Viaje</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.actionItem} 
            onPress={() => {
              triggerHaptic('impactMedium');
              navigation.navigate('ImportTrip');
            }}
          >
            <View style={[styles.actionIconContainer, { backgroundColor: THEME.secondary + '15' }]}>
              <Download color={THEME.secondary} size={24} />
            </View>
            <Text style={styles.actionText}>Importar</Text>
          </TouchableOpacity>
        </Animatable.View>

        {/* Current Trip Status Section (Replaces Carousel) */}
        {activeTrip && (
          <Animatable.View animation="fadeInUp" delay={500} style={styles.statusSection}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Estado del Viaje Actual</Text>
              <Text style={styles.tripBadge}>{activeTrip.titulo_viaje}</Text>
            </View>

            <View style={styles.statusCard}>
              <View style={styles.budgetProgressSection}>
                <View style={styles.budgetHeaderRow}>
                  <Text style={styles.budgetLabel}>Resumen de Gasto</Text>
                  <Text style={styles.budgetAmount}>
                    ${activeTrip.spentTotal} <Text style={styles.budgetLimit}>/ ${activeTrip.presupuesto_total || 0}</Text>
                  </Text>
                </View>
                
                <View style={styles.progressTrack}>
                  <View 
                    style={[
                      styles.progressBar, 
                      { 
                        width: `${Math.min(100, (activeTrip.spentTotal / (activeTrip.presupuesto_total || 1)) * 100)}%`,
                        backgroundColor: (activeTrip.spentTotal / (activeTrip.presupuesto_total || 1)) >= 0.8 ? THEME.secondary : THEME.primary 
                      }
                    ]} 
                  />
                </View>
                <Text style={styles.progressNote}>
                  {Math.round((activeTrip.spentTotal / (activeTrip.presupuesto_total || 1)) * 100)}% del presupuesto utilizado
                </Text>
              </View>

              <View style={styles.statsGrid}>
                <View style={styles.statWidget}>
                  <Text style={styles.statValue}>{activeTrip.completedStops}</Text>
                  <Text style={styles.statLabel}>Paradas realizadas</Text>
                </View>
                <View style={styles.statWidget}>
                  <Text style={[styles.statValue, { color: activeTrip.pendingSyncCount > 0 ? THEME.secondary : THEME.textMuted }]}>
                    {activeTrip.pendingSyncCount}
                  </Text>
                  <Text style={styles.statLabel}>Tickets ptes. sincronizar</Text>
                </View>
              </View>

              <TouchableOpacity 
                style={styles.detailsButton}
                onPress={() => navigation.navigate('TripDetailScreen', { tripId: String(activeTrip.id) })}
              >
                <Text style={styles.detailsButtonText}>Ver detalles del viaje</Text>
              </TouchableOpacity>
            </View>
          </Animatable.View>
        )}

        {/* Quote of the Day */}
        <Animatable.View animation="fadeIn" delay={1000} style={styles.quoteCard}>
          <Quote size={24} color={THEME.secondary} style={styles.quoteIcon} />
          <Text style={styles.quoteText}>{quote}</Text>
          <Text style={styles.quoteAuthor}>— Guía de Viaje Raven</Text>
        </Animatable.View>

      </ScrollView>

    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: THEME.background,
  },
  scrollContent: {
    padding: 24,
    paddingBottom: 100,
  },
  header: {
    marginBottom: 32,
  },
  greeting: {
    fontSize: 32,
    fontWeight: 'bold',
    color: THEME.primary,
    letterSpacing: -1,
  },
  date: {
    fontSize: 14,
    color: THEME.textMuted,
    marginTop: 4,
    fontWeight: '500',
  },
  countdownCard: {
    backgroundColor: THEME.primary,
    borderRadius: 24,
    padding: 24,
    shadowColor: THEME.primary,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.2,
    shadowRadius: 20,
    elevation: 10,
    marginBottom: 40,
  },
  countdownInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  compassIcon: {
    marginRight: 20,
  },
  countdownTitle: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: 'bold',
  },
  countdownSubtitle: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 14,
    marginTop: 2,
  },
  actionsGrid: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 40,
  },
  actionItem: {
    flex: 1,
    backgroundColor: THEME.surface,
    borderRadius: 20,
    padding: 20,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: THEME.divider,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
  },
  actionIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  actionText: {
    fontSize: 14,
    fontWeight: '700',
    color: THEME.text,
  },
  emptyText: {
    color: THEME.textMuted,
    fontSize: 14,
    marginTop: 12,
  },
  quoteCard: {
    backgroundColor: THEME.surface,
    padding: 32,
    borderRadius: 24,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: THEME.divider,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
  },
  quoteIcon: {
    marginBottom: 16,
    opacity: 0.5,
  },
  quoteText: {
    fontSize: 18,
    color: THEME.text,
    textAlign: 'center',
    fontStyle: 'italic',
    lineHeight: 28,
  },
  quoteAuthor: {
    marginTop: 16,
    fontSize: 12,
    color: THEME.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  statusSection: {
    marginBottom: 40,
  },
  tripBadge: {
    backgroundColor: THEME.primary + '15',
    color: THEME.primary,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    fontSize: 12,
    fontWeight: 'bold',
  },
  statusCard: {
    backgroundColor: THEME.surface,
    borderRadius: 24,
    padding: 24,
    borderWidth: 1,
    borderColor: THEME.divider,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
  },
  budgetProgressSection: {
    marginBottom: 24,
  },
  budgetHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    marginBottom: 12,
  },
  budgetLabel: {
    fontSize: 16,
    fontWeight: '700',
    color: THEME.text,
  },
  budgetAmount: {
    fontSize: 18,
    fontWeight: '800',
    color: THEME.text,
  },
  budgetLimit: {
    fontSize: 14,
    color: THEME.textMuted,
    fontWeight: '400',
  },
  progressTrack: {
    height: 10,
    backgroundColor: THEME.divider,
    borderRadius: 5,
    overflow: 'hidden',
    marginBottom: 8,
  },
  progressBar: {
    height: '100%',
    borderRadius: 5,
  },
  progressNote: {
    fontSize: 12,
    color: THEME.textMuted,
  },
  statsGrid: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 24,
  },
  statWidget: {
    flex: 1,
    backgroundColor: THEME.background,
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: THEME.divider,
  },
  statValue: {
    fontSize: 24,
    fontWeight: '800',
    color: THEME.primary,
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 11,
    color: THEME.textMuted,
    fontWeight: '600',
    textAlign: 'center',
    textTransform: 'uppercase',
  },
  detailsButton: {
    backgroundColor: THEME.background,
    paddingVertical: 14,
    borderRadius: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: THEME.primary,
  },
  detailsButtonText: {
    color: THEME.primary,
    fontWeight: 'bold',
    fontSize: 14,
  },
  fab: {
    position: 'absolute',
    bottom: 110,
    right: 24,
    backgroundColor: THEME.primary,
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 10,
    elevation: 8,
  }
});
