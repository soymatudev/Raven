import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEY = '@travel_routes';

export const saveTrips = async (trips) => {
  try {
    const jsonValue = JSON.stringify(trips);
    await AsyncStorage.setItem(STORAGE_KEY, jsonValue);
  } catch (e) {
    console.error('Error saving trips', e);
  }
};

export const loadTrips = async () => {
  try {
    const jsonValue = await AsyncStorage.getItem(STORAGE_KEY);
    if (jsonValue == null) return [];
    
    const trips = JSON.parse(jsonValue);
    
    // FORZAR CONVERSIÓN CRÍTICA PARA ANDROID
    // Asegura que 'completado' NUNCA sea un string al entrar al motor de renderizado
    return trips.map(trip => ({
      ...trip,
      itinerario: trip.itinerario.map(day => ({
        ...day,
        puntos: day.puntos.map(point => ({
          ...point,
          completado: point.completado === true || String(point.completado) === 'true'
        }))
      }))
    }));
  } catch (e) {
    console.error('Error loading trips', e);
    return [];
  }
};

export const getInitialData = () => [
  {
    id: 'v1',
    titulo_viaje: 'Ruta de Ejemplo',
    color_acento: '#00FF41',
    fecha_inicio: '2025-10-10',
    itinerario: [
      {
        dia: 1,
        fecha: '2025-10-10',
        puntos: [
          { 
            id: 'p1', 
            hora: '09:00', 
            lugar: 'Punto de Inicio', 
            descripcion: 'Comienza tu aventura aquí.', 
            completado: false 
          },
          { 
            id: 'p2', 
            hora: '12:30', 
            lugar: 'Almuerzo en la ciudad', 
            descripcion: 'Prueba la comida local.', 
            completado: false 
          },
          { 
            id: 'p3', 
            hora: '15:00', 
            lugar: 'Museo de Historia', 
            descripcion: 'Cultura y arte.', 
            completado: false 
          }
        ]
      },
      {
        dia: 2,
        fecha: '2025-10-11',
        puntos: [
          { 
            id: 'p4', 
            hora: '10:00', 
            lugar: 'Parque Central', 
            descripcion: 'Caminata relajante.', 
            completado: false 
          }
        ]
      }
    ]
  }
];
