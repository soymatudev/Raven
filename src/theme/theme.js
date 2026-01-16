export const THEME = {
  // Fondos con más luminancia (para que no se pierdan con poco brillo)
  background: '#1A1D29',    // Un azul grisáceo más claro que el negro puro
  surface: '#24293D',       // Tarjetas más visibles
  surfaceLight: '#313852',  // Para estados de hover o bordes
  
  // Colores "Vivos" (Pastel-Neón: brillan más con menos luz)
  primary: '#D391FA',       // Púrpura lavanda (más claro, más visible)
  secondary: '#70A1FF',     // Azul cielo vibrante
  accent: '#FF9F43',        // Naranja suave/melocotón
  
  // Semántica y Detalles
  success: '#55EFC4',       // Verde menta neón
  divider: '#3F4663',       // Líneas mucho más marcadas
  
  // Texto (Aumentamos el contraste del texto secundario)
  text: '#FFFFFF',          
  textMuted: '#B2BEC3',     // Gris mucho más claro que antes
  textSecondary: '#DFE6E9', 
};

export const STOP_CATEGORIES = {
  ACTIVIDAD: {
    id: 'ACTIVIDAD',
    nombre: 'Actividad',
    icon: 'Camera',
    emoji: '🏛️',
    color: '#D391FA', // Púrpura (THEME.primary)
  },
  VUELO: {
    id: 'VUELO',
    nombre: 'Vuelo',
    icon: 'Plane',
    emoji: '✈️',
    color: '#00D2FF', // Cyan neón
  },
  ALOJAMIENTO: {
    id: 'ALOJAMIENTO',
    nombre: 'Alojamiento',
    icon: 'Bed',
    emoji: '🏨',
    color: '#70A1FF', // Azul (THEME.secondary)
  },
  TRANSPORTE: {
    id: 'TRANSPORTE',
    nombre: 'Transporte',
    icon: 'Car',
    emoji: '🚗',
    color: '#55EFC4', // Verde menta (THEME.success)
  },
  COMIDA: {
    id: 'COMIDA',
    nombre: 'Comida',
    icon: 'Utensils',
    emoji: '🍴',
    color: '#FF9F43', // Naranja (THEME.accent)
  },
  GASOLINA: {
    id: 'GASOLINA',
    nombre: 'Gasolina',
    icon: 'Fuel',
    emoji: '⛽',
    color: '#FF7F50', // Coral / Naranja fuego
  },
  OTRO: {
    id: 'OTRO',
    nombre: 'Otro',
    icon: 'MoreHorizontal',
    emoji: '📦',
    color: '#B2BEC3', // Gris claro (THEME.textMuted)
  }
};