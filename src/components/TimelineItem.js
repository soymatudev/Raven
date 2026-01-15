import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { THEME } from '../theme/theme';
import { CheckCircle2, Circle } from 'lucide-react-native';

export const TimelineItem = ({ point, isLast, onToggle, onLongPress, accentColor }) => {
  // Conversión ultra-segura a booleano puro
  const isCompleted = point.completado === true || String(point.completado) === 'true';

  // Creamos los estilos aparte para no enviarle "lógica" al componente Text de Android
  const titleStyle = [
    styles.title,
    isCompleted ? styles.textCompleted : null
  ];

  const descriptionStyle = [
    styles.description,
    isCompleted ? styles.textCompleted : null
  ];

  return (
    <TouchableOpacity 
      style={styles.container} 
      onLongPress={() => onLongPress(point)}
      delayLongPress={500}
      activeOpacity={0.7}
    >
      <View style={styles.timelineLeft}>
        <TouchableOpacity onPress={() => onToggle(point.id)}>
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
          <Text style={[styles.time, { color: accentColor }]}>
            {point.hora}
          </Text>
          {/* Usamos el estilo ya procesado */}
          <Text style={titleStyle}>
            {point.lugar}
          </Text>
        </View>
        <Text style={descriptionStyle}>
          {point.descripcion}
        </Text>
      </View>
    </TouchableOpacity>
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
  },
  description: {
    fontSize: 14,
    color: THEME.textMuted,
    lineHeight: 20,
  },
  textCompleted: {
    color: THEME.textMuted,
    textDecorationLine: 'line-through',
  }
});
