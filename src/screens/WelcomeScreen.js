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
import { Plus, Compass, Image as ImageIcon, Quote } from 'lucide-react-native';
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
  const [nextTripDays, setNextTripDays] = useState(null);
  const [memories, setMemories] = useState([]);
  const [quote, setQuote] = useState(TRAVEL_QUOTES[0]);
  const [userName, setUserName] = useState('');

  const fetchData = async () => {
    const trips = await loadTrips();
    const userData = await loadUserData();
    
    calculateNextTrip(trips);
    extractMemories(trips);
    
    if (userData?.name) {
      setUserName(userData.name);
    } else {
      setUserName('');
    }

    // Random quote each time we focus
    setQuote(TRAVEL_QUOTES[Math.floor(Math.random() * TRAVEL_QUOTES.length)]);
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

  const extractMemories = (allTrips) => {
    let allPhotos = [];
    allTrips.forEach(trip => {
      trip.itinerario.forEach(day => {
        day.puntos.forEach(point => {
          if (point.fotos && point.fotos.length > 0) {
            allPhotos.push(...point.fotos);
          }
        });
      });
    });
    setMemories(allPhotos.slice(0, 10)); // Top 10 latest memories
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

        {/* Momentos Carousel */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Momentos</Text>
            <TouchableOpacity onPress={() => navigation.navigate('Mis Viajes')}>
              <Text style={styles.seeAll}>Ver todos</Text>
            </TouchableOpacity>
          </View>
          
          <ScrollView 
            horizontal 
            showsHorizontalScrollIndicator={false} 
            contentContainerStyle={styles.carousel}
          >
            {memories.length > 0 ? (
              memories.map((uri, index) => (
                <Animatable.View 
                  key={index} 
                  animation="fadeInRight" 
                  delay={500 + (index * 100)}
                  style={styles.memoryCard}
                >
                  <Image source={{ uri }} style={styles.memoryImage} />
                </Animatable.View>
              ))
            ) : (
              <View style={styles.emptyMemories}>
                <ImageIcon size={40} color={THEME.divider} />
                <Text style={styles.emptyText}>Tus recuerdos aparecerán aquí</Text>
              </View>
            )}
          </ScrollView>
        </View>

        {/* Quote of the Day */}
        <Animatable.View animation="fadeIn" delay={1000} style={styles.quoteCard}>
          <Quote size={24} color={THEME.secondary} style={styles.quoteIcon} />
          <Text style={styles.quoteText}>{quote}</Text>
          <Text style={styles.quoteAuthor}>— Guía de Viaje Raven</Text>
        </Animatable.View>

      </ScrollView>

      {/* Floating Action Button */}
      <TouchableOpacity 
        style={styles.fab}
        onPress={() => {
          triggerHaptic('impactLight');
          navigation.navigate('Mis Viajes');
        }}
        activeOpacity={0.7}
      >
        <Plus color="#FFFFFF" size={32} />
      </TouchableOpacity>
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
  section: {
    marginBottom: 40,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: THEME.primary,
  },
  seeAll: {
    color: THEME.secondary,
    fontSize: 14,
    fontWeight: '600',
  },
  carousel: {
    paddingRight: 24,
  },
  memoryCard: {
    width: width * 0.7,
    height: 200,
    marginRight: 16,
    borderRadius: 24,
    overflow: 'hidden',
    backgroundColor: THEME.surface,
    borderWidth: 1,
    borderColor: THEME.divider,
  },
  memoryImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  emptyMemories: {
    width: width - 48,
    height: 200,
    borderRadius: 24,
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: THEME.divider,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: THEME.surface,
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
