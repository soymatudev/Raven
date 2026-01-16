import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, FlatList, StyleSheet, StatusBar, TouchableOpacity, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { THEME } from '../theme/theme';
import { TripCard } from '../components/TripCard';
import { loadTrips, saveTrips, getInitialData } from '../utils/storage';
import { useFocusEffect } from '@react-navigation/native';
import { Plus } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import * as Animatable from 'react-native-animatable';
import { MapPin, Clock, DollarSign } from 'lucide-react-native';

export const HomeScreen = ({ navigation }) => {
  const [trips, setTrips] = useState([]);
  const [activeTripInfo, setActiveTripInfo] = useState(null);

  const fetchTrips = async () => {
    let data = await loadTrips();
    if (data.length === 0) {
      data = getInitialData();
      await saveTrips(data);
    }
    setTrips(data);
    calculateActiveStatus(data);
  };

  const calculateActiveStatus = (allTrips) => {
    const today = new Date().toISOString().split('T')[0];
    const now = new Date();
    const currentTime = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;

    const active = allTrips.find(trip => {
      if (!trip.fecha_inicio || !trip.itinerario.length) return false;
      const lastDay = trip.itinerario[trip.itinerario.length - 1].fecha;
      return today >= trip.fecha_inicio && today <= lastDay;
    });

    if (active) {
      const todayPlan = active.itinerario.find(d => d.fecha === today);
      if (todayPlan) {
        const nextStop = todayPlan.puntos
          .filter(p => !p.completado)
          .find(p => p.hora > currentTime);
        
        setActiveTripInfo({
          trip: active,
          nextStop: nextStop || (todayPlan.puntos.length > 0 ? { lugar: 'No hay más paradas hoy', hora: '--:--' } : null)
        });
      } else {
        setActiveTripInfo(null);
      }
    } else {
      setActiveTripInfo(null);
    }
  };

  const handleEditTrip = (trip) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    navigation.navigate('CreateTrip', { tripId: String(trip.id) });
  };

  const handleCreatePress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    navigation.navigate('CreateTrip');
  };

  useFocusEffect(
    useCallback(() => {
      fetchTrips();
    }, [])
  );
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: THEME.background }}>
      <View style={styles.header}>
        <Text style={styles.title}>Mis Viajes</Text>
        <Text style={styles.subtitle}>Gestiona tus rutas offline</Text>
      </View>

      {activeTripInfo && (
        <Animatable.View 
          animation="fadeInDown" 
          duration={800} 
          style={styles.activeCard}
        >
          <View style={styles.activeHeader}>
            <Animatable.View 
              animation="pulse" 
              iterationCount="infinite" 
              duration={2000}
            >
              <MapPin color={THEME.primary} size={24} />
            </Animatable.View>
            <Text style={styles.activeLabel}>📍 Tu parada actual</Text>
          </View>
          
          <View style={styles.activeContent}>
            <Text style={styles.activeTripName}>{activeTripInfo.trip.titulo_viaje}</Text>
            {activeTripInfo.nextStop ? (
              <View style={styles.nextStopRow}>
                <Clock size={16} color={THEME.textMuted} />
                <Text style={styles.nextStopText}>
                  Próxima: <Text style={{ color: THEME.primary, fontWeight: 'bold' }}>{activeTripInfo.nextStop.hora}</Text> - {activeTripInfo.nextStop.lugar}
                </Text>
              </View>
            ) : (
              <Text style={styles.noStopsText}>Sin paradas programadas para hoy</Text>
            )}
            <View style={[styles.nextStopRow, { marginTop: 8 }]}>
              <DollarSign size={16} color={THEME.accent} />
              <Text style={styles.nextStopText}>
                Gasto acumulado: <Text style={{ color: THEME.accent, fontWeight: 'bold' }}>${activeTripInfo.trip.itinerario.reduce((acc, day) => acc + day.puntos.reduce((dayAcc, p) => dayAcc + (p.costo || 0), 0), 0)}</Text>
              </Text>
            </View>
          </View>
          
          <TouchableOpacity 
            style={styles.activeButton}
            onPress={() => navigation.navigate('TripDetail', { tripId: String(activeTripInfo.trip.id) })}
            activeOpacity={0.7}
          >
            <Text style={styles.activeButtonText}>Ver Plan del Día</Text>
          </TouchableOpacity>
        </Animatable.View>
      )}

      <FlatList
        data={trips}
        keyExtractor={(item) => String(item.id)} // Forzamos String aquí
        renderItem={({ item, index }) => (
          <Animatable.View 
            animation="fadeInUp" 
            duration={600} 
            delay={index * 150}
            useNativeDriver
          >
            <TripCard 
              trip={item} 
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                navigation.navigate('TripDetail', { tripId: String(item.id) });
              }} 
              onLongPress={() => handleEditTrip(item)}
            />
          </Animatable.View>
        )}
        contentContainerStyle={styles.list}
      />
      <TouchableOpacity 
        style={styles.fab} 
        onPress={handleCreatePress}
        activeOpacity={0.7}
      >
        <Plus color={THEME.background} size={30} />
      </TouchableOpacity>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: THEME.background,
  },
  header: {
    padding: 24,
    paddingTop: 40,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: THEME.text,
  },
  subtitle: {
    fontSize: 16,
    color: THEME.textMuted,
    marginTop: 4,
  },
  list: {
    padding: 20,
    paddingTop: 0,
  },
  fab: {
    position: 'absolute',
    bottom: 30,
    right: 30,
    backgroundColor: THEME.primary,
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 8,
    shadowColor: THEME.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 6,
  },
  activeCard: {
    margin: 20,
    marginTop: 0,
    backgroundColor: THEME.surfaceLight,
    borderRadius: 20,
    padding: 20,
    borderWidth: 2,
    borderColor: THEME.primary,
    shadowColor: THEME.primary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 10,
  },
  activeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15,
  },
  activeLabel: {
    color: THEME.textMuted,
    fontSize: 14,
    fontWeight: 'bold',
    marginLeft: 10,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  activeContent: {
    marginBottom: 15,
  },
  activeTripName: {
    color: THEME.text,
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  nextStopRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  nextStopText: {
    color: THEME.textSecondary,
    fontSize: 16,
    marginLeft: 8,
  },
  noStopsText: {
    color: THEME.textMuted,
    fontSize: 16,
    fontStyle: 'italic',
  },
  activeButton: {
    backgroundColor: 'rgba(211, 145, 250, 0.1)',
    padding: 12,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(211, 145, 250, 0.3)',
  },
  activeButtonText: {
    color: THEME.primary,
    fontWeight: 'bold',
    fontSize: 14,
  },
});
