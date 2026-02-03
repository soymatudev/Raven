# 🦅 Raven

Raven is a premium travel management application designed to help users plan, organize, and visualize their journeys with an elegant, editorial-style interface.

## ✨ Objetivo

El objetivo de Raven es proporcionar una experiencia de gestión de viajes sofisticada y fluida. Permite a los usuarios crear itinerarios detallados, gestionar paradas y visualizar sus rutas de viaje en un mapa interactivo, todo bajo una estética minimalista y moderna.

## 🚀 Tecnologías Principales

- **Framework**: [Expo](https://expo.dev/) (SDK 54)
- **Base**: [React Native](https://reactnative.dev/) (0.81.5)
- **Navegación**: [React Navigation](https://reactnavigation.org/) (Stack & Bottom Tabs)
- **Iconos**: [Lucide React Native](https://lucide.dev/)
- **Mapas**: [React Native Maps](https://github.com/react-native-maps/react-native-maps)
- **Almacenamiento**: [Async Storage](https://react-native-async-storage.github.io/async-storage/)
- **Animaciones**: [React Native Animatable](https://github.com/oblador/react-native-animatable)
- **Experiencia de Usuario**: Expo Haptics & Location

## 📂 Estructura del Proyecto

```text
Raven/
├── assets/             # Recursos estáticos (iconos, fuentes, imágenes)
├── src/
│   ├── components/     # Componentes de UI reutilizables (TripCard, TimelineItem)
│   ├── screens/        # Pantallas principales del flujo de la app
│   ├── theme/          # Sistema de diseño (colores, tipografía, variables)
│   └── utils/          # Utilidades (Storage, Haptics, validaciones)
├── App.js              # Punto de entrada y configuración de navegación
├── app.json            # Configuración de Expo
└── package.json        # Dependencias y scripts
```

## 📱 Pantallas

- **Inicio (Welcome)**: Pantalla de bienvenida con acceso rápido.
- **Mis Viajes (Home)**: Listado de viajes activos y pasados con tarjetas visuales.
- **Detalle del Viaje**: Itinerario detallado con línea de tiempo y mapa de ruta.
- **Crear Viaje**: Flujo intuitivo para añadir nuevos destinos y fechas.
- **Perfil**: Configuración y preferencias del usuario.

## 🛠️ Instalación y Uso

1. **Clonar el repositorio**:
   ```bash
   git clone <url-del-repositorio>
   cd Raven
   ```

2. **Instalar dependencias**:
   ```bash
   npm install
   ```

3. **Iniciar el proyecto**:
   ```bash
   npx expo start
   ```

---
*Desarrollado con ❤️ para viajeros exigentes.*
