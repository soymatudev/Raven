import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { THEME } from '../theme/theme';
import { ChevronRight, MapPin, DollarSign } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import * as Animatable from 'react-native-animatable';

export const TripCard = ({ trip, onPress, onLongPress }) => {
  const accentColor = trip.color_acento || THEME.primary;

  const [isPulsing, setIsPulsing] = React.useState(false);

  const handleLongPress = () => {
    setIsPulsing(true);
    onLongPress(trip);
    setTimeout(() => setIsPulsing(false), 500);
  };

  const totalCost = (trip.itinerario || []).reduce((acc, day) => {
    return acc + (day.puntos || []).reduce((dayAcc, point) => dayAcc + (point.costo || 0), 0);
  }, 0);

  const budget = trip.presupuesto_total || 0;
  const isOverBudget = budget > 0 && totalCost > budget;

  return (
    <Animatable.View
      animation={isPulsing ? "pulse" : undefined}
      duration={400}
    >
      <TouchableOpacity
        style={[styles.card, { borderLeftColor: accentColor }]}
        onPress={onPress}
        onLongPress={handleLongPress}
        delayLongPress={600}
        activeOpacity={0.7}
      >
        <View style={styles.info}>
        <Text style={styles.title}>{trip.titulo_viaje}</Text>
        <View style={styles.details}>
          <MapPin size={14} color={THEME.textMuted} />
          <Text style={styles.subtitle}>
            {trip.itinerario.length} días • {trip.itinerario.reduce((acc, day) => acc + day.puntos.length, 0)} paradas
          </Text>
        </View>
        <View style={[styles.details, { marginTop: 4 }]}>
          <DollarSign size={14} color={isOverBudget ? '#FF4757' : THEME.accent} />
          <Text style={[styles.subtitle, { color: isOverBudget ? '#FF4757' : THEME.accent, fontWeight: 'bold' }]}>
            Gasto: ${totalCost}{budget > 0 ? ` / $${budget}` : ''}
          </Text>
        </View>
      </View>
      <ChevronRight color={THEME.textMuted} size={20} />
    </TouchableOpacity>
    </Animatable.View>
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
