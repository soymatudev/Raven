import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image } from 'react-native';
import { THEME } from '../theme/theme';
import { CheckCircle2, Circle, DollarSign, Camera } from 'lucide-react-native';
import * as Animatable from 'react-native-animatable';
import * as Haptics from 'expo-haptics';

export const TimelineItem = ({ point, isLast, onToggle, onLongPress, accentColor, isOverBudget }) => {
  // Conversión ultra-segura a booleano puro
  const isCompleted = point.completado === true || String(point.completado) === 'true';

  const handleToggle = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onToggle(point.id);
  };

  return (
    <Animatable.View 
      animation="fadeIn" 
      duration={500}
      useNativeDriver
      style={[isCompleted && { opacity: 0.6 }]}
    >
      <TouchableOpacity 
        style={styles.container} 
        onLongPress={() => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
          onLongPress(point);
        }}
        delayLongPress={500}
        activeOpacity={0.7}
      >
        <View style={styles.timelineLeft}>
          <TouchableOpacity onPress={handleToggle} activeOpacity={0.7}>
            {isCompleted ? (
              <CheckCircle2 color={accentColor} size={24} />
            ) : (
              <Circle color={THEME.textMuted} size={24} />
            )}
          </TouchableOpacity>
        
        {!isLast && (
          <View 
            style={[
              styles.line, 
              { backgroundColor: isCompleted ? accentColor : THEME.divider }
            ]} 
          />
        )}
      </View>
      
        <View style={styles.content}>
          <View style={styles.header}>
            <View>
              <Text style={[styles.time, { color: accentColor }]}>
                {point.hora}
              </Text>
              {(point.costo > 0) && (
                <View style={styles.costContainer}>
                  <DollarSign size={10} color={isOverBudget ? '#FF4757' : THEME.accent} />
                  <Text style={[styles.costText, isOverBudget && { color: '#FF4757' }]}>{point.costo}</Text>
                </View>
              )}
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.title, isCompleted && styles.textCompleted]}>
                {point.lugar}
              </Text>
              {(point.fotos && point.fotos.length > 0) && (
                <View style={styles.memoryIndicator}>
                  <Camera size={12} color={THEME.primary} />
                  <View style={styles.miniGrid}>
                    {point.fotos.map((uri, idx) => (
                      <Image key={idx} source={{ uri }} style={styles.miniPhoto} />
                    ))}
                  </View>
                </View>
              )}
            </View>
          </View>
          <Text style={[styles.description, isCompleted && styles.textCompleted]}>
            {point.descripcion}
          </Text>
        </View>
      </TouchableOpacity>
    </Animatable.View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    marginBottom: 20,
    minHeight: 80,
  },
  timelineLeft: {
    width: 30,
    alignItems: 'center',
},
  line: {
    flex: 1,
    width: 2,
    marginTop: 4,
  },
  content: {
    flex: 1,
    marginLeft: 15,
    paddingBottom: 10,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  time: {
    fontSize: 14,
    fontWeight: 'bold',
    marginRight: 10,
    minWidth: 50,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    color: THEME.text,
    flex: 1,
  },
  costContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    marginTop: 2,
  },
  costText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: THEME.accent,
  },
  description: {
    fontSize: 14,
    color: THEME.textMuted,
    lineHeight: 20,
  },
  textCompleted: {
    color: THEME.textMuted,
    textDecorationLine: 'line-through',
  },
  memoryIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 6,
  },
  miniGrid: {
    flexDirection: 'row',
    marginLeft: 8,
  },
  miniPhoto: {
    width: 24,
    height: 24,
    borderRadius: 4,
    marginRight: 4,
    borderWidth: 1,
    borderColor: THEME.divider,
  }
});
