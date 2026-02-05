# 🦅 Raven Business

Raven Business is a premium travel management application designed for professional logistics and field operations. It combines an elegant, editorial-style interface with robust business features like ERP synchronization and budget tracking.

## ✨ Objetivo

El objetivo de Raven Business es proporcionar una experiencia de gestión de viajes corporativos sofisticada y eficiente. Permite a los técnicos y coordinadores gestionar itinerarios complejos, registrar gastos en tiempo real y mantener sincronizada la información con el sistema central, todo bajo una estética minimalista y moderna.

## 🚀 Tecnologías Principales

- **Framework**: [Expo](https://expo.dev/) (SDK 54)
- **Base**: [React Native](https://reactnative.dev/) (0.81.5)
- **Navegación**: [React Navigation](https://reactnavigation.org/) (Stack & Bottom Tabs)
- **Iconos**: [Lucide React Native](https://lucide.dev/)
- **Mapas**: [React Native Maps](https://github.com/react-native-maps/react-native-maps)
- **Sincronización**: Integración con API Central (ERP)
- **Almacenamiento**: [Async Storage](https://react-native-async-storage.github.io/async-storage/)
- **UX**: Exo Haptics para feedback táctil premium.

## 📂 Estructura del Proyecto

```text
RavenBusiness/
├── src/
│   ├── components/     # UI Reutilizable (TripCard, TimelineItem)
│   ├── screens/        # Dashboard, Detalle, Importación, Perfil
│   ├── services/       # Capa de API y Sincronización ERP
│   ├── theme/          # Sistema de diseño y colores corporativos
│   └── utils/          # Storage, Haptics, validaciones
├── App.js              # Entry point y Navegación
├── app.json            # Configuración de Identidad (Bundle ID, EAS)
└── package.json        # Dependencias
```

## 📱 Pantallas y Flujos

- **Dashboard de Inicio**: Resumen dinámico del viaje activo, progreso del presupuesto y paradas pendientes.
- **Importar Viaje**: Buscador por ID de viaje para traer datos directamente desde el ERP.
- **Detalle del Viaje**: Itinerario detallado con insignia de ID ERP, función "Tocar para Copiar" y gestión offline.
- **Sincronización**: Sistema de carga por lotes para evidencias y datos de ruta al servidor central.

## ⚙️ Integración ERP

Raven Business incluye una capa nativa de comunicación con el ERP central que permite:
- **Vincular Empleado**: Identificación mediante número de nómina.
- **ID de ERP**: Cada viaje sincronizado muestra su referencia oficial para fácil seguimiento.
- **Offline First**: Trabaja sin conexión en ruta y sincroniza tus tickets y firmas al finalizar.

---
*Desarrollado con ❤️ para profesionales exigentes.*
