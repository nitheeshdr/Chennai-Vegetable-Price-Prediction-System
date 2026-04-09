import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createStackNavigator } from '@react-navigation/stack';
import { Ionicons } from '@expo/vector-icons';

import HomeScreen from '../screens/HomeScreen';
import ScanScreen from '../screens/ScanScreen';
import TrendsScreen from '../screens/TrendsScreen';
import AlertsScreen from '../screens/AlertsScreen';
import ResultScreen from '../screens/ResultScreen';
import ForecastScreen from '../screens/ForecastScreen';
import AdminScreen from '../screens/AdminScreen';
import { C } from '../theme';

const Tab = createBottomTabNavigator();
const Stack = createStackNavigator();

const TAB_ICONS: Record<string, [string, string]> = {
  Home:    ['home', 'home-outline'],
  Scan:    ['camera', 'camera-outline'],
  Trends:  ['trending-up', 'trending-up-outline'],
  Alerts:  ['notifications', 'notifications-outline'],
  Admin:   ['settings', 'settings-outline'],
};

const HEADER = {
  headerStyle: { backgroundColor: '#0a1628', borderBottomWidth: 0 } as any,
  headerTintColor: C.text,
  headerTitleStyle: { fontWeight: '700' as const, color: C.text },
  headerShadowVisible: false,
};

function MainTabs() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, color, size }) => {
          const [active, inactive] = TAB_ICONS[route.name] ?? ['ellipse', 'ellipse-outline'];
          return <Ionicons name={(focused ? active : inactive) as any} size={size} color={color} />;
        },
        tabBarActiveTintColor: C.indigo,
        tabBarInactiveTintColor: C.text3,
        tabBarStyle: {
          backgroundColor: '#0a1628',
          borderTopColor: C.border,
          borderTopWidth: 1,
          height: 60,
          paddingBottom: 8,
        },
        tabBarLabelStyle: { fontSize: 11, fontWeight: '600' },
        ...HEADER,
      })}
    >
      <Tab.Screen name="Home"   component={HomeScreen}   options={{ title: 'VegPrice AI', headerShown: false }} />
      <Tab.Screen name="Scan"   component={ScanScreen}   options={{ title: 'Scan' }} />
      <Tab.Screen name="Trends" component={TrendsScreen} options={{ title: 'Trends' }} />
      <Tab.Screen name="Alerts" component={AlertsScreen} options={{ title: 'Alerts' }} />
      <Tab.Screen name="Admin"  component={AdminScreen}  options={{ title: 'Control', headerShown: false }} />
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
          options={{ headerShown: true, title: 'Scan Result', ...HEADER }}
        />
        <Stack.Screen
          name="Forecast"
          component={ForecastScreen}
          options={{ headerShown: true, title: 'Weekly Forecast', ...HEADER }}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
