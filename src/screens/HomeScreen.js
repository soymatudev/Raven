import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, FlatList, StyleSheet, StatusBar, TouchableOpacity, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { THEME } from '../theme/theme';
import { TripCard } from '../components/TripCard';
import { loadTrips, saveTrips, getInitialData } from '../utils/storage';
import { useFocusEffect } from '@react-navigation/native';
import { Plus } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';

export const HomeScreen = ({ navigation }) => {
  const [trips, setTrips] = useState([]);

  const fetchTrips = async () => {
    let data = await loadTrips();
    if (data.length === 0) {
      data = getInitialData();
      await saveTrips(data);
    }
    setTrips(data);
  };

  const handleDeleteTrip = async (tripId) => {
    Alert.alert(
      '¿Borrar viaje?',
      'Se perderán todos los datos y paradas de este viaje permanentemente.',
      [
        { text: 'Cancelar', style: 'cancel' },
        { 
          text: 'Borrar', 
          style: 'destructive',
          onPress: async () => {
            // Vibración para el borrado completo del viaje
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
            
            const allTrips = await loadTrips();
            const filteredTrips = allTrips.filter(t => String(t.id) !== String(tripId));
            await saveTrips(filteredTrips);
            setTrips(filteredTrips);
          }
        }
      ]
    );
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
      <FlatList
        data={trips}
        keyExtractor={(item) => String(item.id)} // Forzamos String aquí
        renderItem={({ item }) => (
          <TripCard 
            trip={item} 
            onPress={() => navigation.navigate('TripDetail', { tripId: String(item.id) })} 
            onLongPress={handleDeleteTrip}
          />
        )}
        contentContainerStyle={styles.list}
      />
      <TouchableOpacity 
        style={styles.fab} 
        onPress={() => navigation.navigate('CreateTrip')}
        activeOpacity={0.8}
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
});
