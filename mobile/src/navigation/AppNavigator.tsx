import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createStackNavigator } from '@react-navigation/stack';
import { Ionicons } from '@expo/vector-icons';

import HomeScreen from '../screens/HomeScreen';
import ScanScreen from '../screens/ScanScreen';
import ResultScreen from '../screens/ResultScreen';
import TrendsScreen from '../screens/TrendsScreen';
import ForecastScreen from '../screens/ForecastScreen';
import AlertsScreen from '../screens/AlertsScreen';

const Tab = createBottomTabNavigator();
const Stack = createStackNavigator();

function MainTabs() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, color, size }) => {
          const icons: Record<string, string> = {
            Home: focused ? 'home' : 'home-outline',
            Scan: focused ? 'camera' : 'camera-outline',
            Trends: focused ? 'trending-up' : 'trending-up-outline',
            Alerts: focused ? 'notifications' : 'notifications-outline',
          };
          return <Ionicons name={(icons[route.name] || 'ellipse') as any} size={size} color={color} />;
        },
        tabBarActiveTintColor: '#22c55e',
        tabBarInactiveTintColor: '#9ca3af',
        tabBarStyle: { backgroundColor: '#1a1a2e', borderTopColor: '#374151' },
        headerStyle: { backgroundColor: '#1a1a2e' },
        headerTintColor: '#f9fafb',
        headerTitleStyle: { fontWeight: 'bold' },
      })}
    >
      <Tab.Screen name="Home" component={HomeScreen} options={{ title: 'VegPrice' }} />
      <Tab.Screen name="Scan" component={ScanScreen} options={{ title: 'Scan Vegetable' }} />
      <Tab.Screen name="Trends" component={TrendsScreen} options={{ title: 'Price Trends' }} />
      <Tab.Screen name="Alerts" component={AlertsScreen} options={{ title: 'Price Alerts' }} />
    </Tab.Navigator>
  );
}

export default function AppNavigator() {
  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        <Stack.Screen name="Main" component={MainTabs} />
        <Stack.Screen
          name="Result"
          component={ResultScreen}
          options={{
            headerShown: true,
            title: 'Scan Result',
            headerStyle: { backgroundColor: '#1a1a2e' },
            headerTintColor: '#f9fafb',
          }}
        />
        <Stack.Screen
          name="Forecast"
          component={ForecastScreen}
          options={{
            headerShown: true,
            title: 'Weekly Forecast',
            headerStyle: { backgroundColor: '#1a1a2e' },
            headerTintColor: '#f9fafb',
          }}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
