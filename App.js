import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { HomeScreen } from './src/screens/HomeScreen';
import { TripDetailScreen } from './src/screens/TripDetailScreen';
import { CreateTripScreen } from './src/screens/CreateTripScreen';
import { THEME } from './src/theme/theme'; // Volvemos a importar el Theme

const Stack = createNativeStackNavigator();

export default function App() {
  return (
    <SafeAreaProvider> 
      <NavigationContainer>
        <Stack.Navigator
          screenOptions={{
            headerShown: false,
            // Ahora es seguro volver a usar THEME.background
            contentStyle: { backgroundColor: THEME.background }
          }}
        >
          <Stack.Screen name="Home" component={HomeScreen} />
          <Stack.Screen name="TripDetail" component={TripDetailScreen} />
          <Stack.Screen name="CreateTrip" component={CreateTripScreen} />
        </Stack.Navigator>
      </NavigationContainer>
    </SafeAreaProvider>
  );
}