import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { Home, Map as MapIcon, User } from 'lucide-react-native';

import { HomeScreen } from './src/screens/HomeScreen';
import { TripDetailScreen } from './src/screens/TripDetailScreen';
import { CreateTripScreen } from './src/screens/CreateTripScreen';
import { WelcomeScreen } from './src/screens/WelcomeScreen';
import { ProfileScreen } from './src/screens/ProfileScreen';
import { THEME } from './src/theme/theme';

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

function MainTabs() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarStyle: {
          backgroundColor: THEME.surface,
          borderTopWidth: 0,
          height: 70,
          paddingBottom: 12,
          paddingTop: 8,
          position: 'absolute',
          bottom: 25,
          left: 20,
          right: 20,
          borderRadius: 35,
          elevation: 8,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.1,
          shadowRadius: 12,
        },
        tabBarActiveTintColor: THEME.primary,
        tabBarInactiveTintColor: THEME.textMuted,
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '600',
        },
        tabBarIcon: ({ color, size }) => {
          let IconComponent;
          if (route.name === 'Inicio') {
            IconComponent = Home;
          } else if (route.name === 'Mis Viajes') {
            IconComponent = MapIcon;
          } else if (route.name === 'Perfil') {
            IconComponent = User;
          }
          return <IconComponent size={22} color={color} />;
        },
      })}
    >
      <Tab.Screen name="Inicio" component={WelcomeScreen} />
      <Tab.Screen name="Mis Viajes" component={HomeScreen} />
      <Tab.Screen name="Perfil" component={ProfileScreen} />
    </Tab.Navigator>
  );
}

export default function App() {
  return (
    <SafeAreaProvider>
      <NavigationContainer>
        <Stack.Navigator
          screenOptions={{
            headerShown: false,
            contentStyle: { backgroundColor: THEME.background }
          }}
        >
          <Stack.Screen name="MainTabs" component={MainTabs} />
          <Stack.Screen name="TripDetail" component={TripDetailScreen} />
          <Stack.Screen name="CreateTrip" component={CreateTripScreen} />
        </Stack.Navigator>
      </NavigationContainer>
    </SafeAreaProvider>
  );
}