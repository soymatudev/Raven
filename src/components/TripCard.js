import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { THEME } from '../theme/theme';
import { ChevronRight, MapPin, Trash2 } from 'lucide-react-native';

export const TripCard = ({ trip, onPress, onLongPress }) => {
  const accentColor = trip.color_acento || THEME.primary;
  return (
    <TouchableOpacity
      style={[styles.card, { borderLeftColor: accentColor }]}
      onPress={onPress}
      onLongPress={() => onLongPress(trip.id)}
      delayLongPress={600}
      activeOpacity={0.8}
    >
      <View style={styles.info}>
        <Text style={styles.title}>{trip.titulo_viaje}</Text>
        <View style={styles.details}>
          <MapPin size={14} color={THEME.textMuted} />
          <Text style={styles.subtitle}>
            {trip.itinerario.length} días • {trip.itinerario.reduce((acc, day) => acc + day.puntos.length, 0)} puntos
          </Text>
        </View>
      </View>
      <View style={styles.actions}>
        <TouchableOpacity 
          onPress={() => onLongPress(trip.id)} 
          style={styles.deleteButton}
        >
          <Trash2 color={THEME.accent} size={18} />
        </TouchableOpacity>
        <ChevronRight color={THEME.textMuted} size={20} />
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: THEME.surface,
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderLeftWidth: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
    borderWidth: 1,
    borderColor: 'rgba(211, 145, 250, 0.2)',
  },
  info: {
    flex: 1,
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  deleteButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255, 159, 67, 0.1)', // Usando THEME.accent (#FF9F43) con opacidad
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    color: THEME.text,
    marginBottom: 6,
  },
  details: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  subtitle: {
    fontSize: 14,
    color: THEME.textMuted,
    marginLeft: 6,
  },
});
