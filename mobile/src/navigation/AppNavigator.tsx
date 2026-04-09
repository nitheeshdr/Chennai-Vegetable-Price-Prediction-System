import React from 'react';
import { View } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createStackNavigator } from '@react-navigation/stack';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTheme } from 'react-native-paper';

import HomeScreen     from '../screens/HomeScreen';
import ScanScreen     from '../screens/ScanScreen';
import TrendsScreen   from '../screens/TrendsScreen';
import AlertsScreen   from '../screens/AlertsScreen';
import ResultScreen   from '../screens/ResultScreen';
import ForecastScreen from '../screens/ForecastScreen';
import AdminScreen    from '../screens/AdminScreen';
import { C } from '../theme';

const Tab   = createBottomTabNavigator();
const Stack = createStackNavigator();

type TabName = 'Home' | 'Scan' | 'Trends' | 'Alerts' | 'Admin';

const TAB_ICONS: Record<TabName, [string, string]> = {
  Home:   ['home-variant', 'home-variant-outline'],
  Scan:   ['camera', 'camera-outline'],
  Trends: ['chart-line', 'chart-line-variant'],
  Alerts: ['bell', 'bell-outline'],
  Admin:  ['cog', 'cog-outline'],
};

const HEADER_OPTS = {
  headerStyle:       { backgroundColor: C.surface, borderBottomWidth: 0 } as any,
  headerTintColor:   C.text,
  headerTitleStyle:  { fontWeight: '700' as const, color: C.text, fontSize: 16 },
  headerShadowVisible: false,
};

function TabIcon({ name, focused, color }: { name: TabName; focused: boolean; color: string }) {
  const [active, inactive] = TAB_ICONS[name];
  const icon = focused ? active : inactive;
  return (
    <View style={{
      alignItems: 'center', justifyContent: 'center',
      backgroundColor: focused ? `${C.primary}22` : 'transparent',
      borderRadius: 16, paddingHorizontal: 20, paddingVertical: 4,
      minWidth: 64,
    }}>
      <MaterialCommunityIcons name={icon as any} size={24} color={color} />
    </View>
  );
}

function MainTabs() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, color }) => (
          <TabIcon name={route.name as TabName} focused={focused} color={color} />
        ),
        tabBarActiveTintColor:   C.primary,
        tabBarInactiveTintColor: C.text3,
        tabBarStyle: {
          backgroundColor: C.surface,
          borderTopColor:  C.border,
          borderTopWidth:  1,
          height:          68,
          paddingBottom:   10,
          paddingTop:      8,
        },
        tabBarLabelStyle: { fontSize: 11, fontWeight: '600' as const, marginTop: 2 },
        tabBarIconStyle:  { marginBottom: 0 },
        ...HEADER_OPTS,
      })}
    >
      <Tab.Screen name="Home"   component={HomeScreen}   options={{ title: 'VegPrice',  headerShown: false }} />
      <Tab.Screen name="Scan"   component={ScanScreen}   options={{ title: 'Scan',     headerShown: false }} />
      <Tab.Screen name="Trends" component={TrendsScreen} options={{ title: 'Trends',   headerShown: false }} />
      <Tab.Screen name="Alerts" component={AlertsScreen} options={{ title: 'Alerts',   headerShown: false }} />
      <Tab.Screen name="Admin"  component={AdminScreen}  options={{ title: 'Control',  headerShown: false }} />
    </Tab.Navigator>
  );
}

export default function AppNavigator() {
  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        <Stack.Screen name="Main"     component={MainTabs} />
        <Stack.Screen name="Result"   component={ResultScreen}   options={{ headerShown: true, title: 'Scan Result',      ...HEADER_OPTS }} />
        <Stack.Screen name="Forecast" component={ForecastScreen} options={{ headerShown: true, title: 'Price Forecast',   ...HEADER_OPTS }} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
