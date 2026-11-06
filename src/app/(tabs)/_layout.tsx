import React from 'react';
import { Platform } from 'react-native';
import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function TabLayout() {
  const insets = useSafeAreaInsets();

  // Recuo inferior dinâmico para garantir que os ícones e rótulos fiquem acima dos 3 botões do Android (estilo Catho/Fintech)
  const bottomPadding = insets.bottom > 0 ? insets.bottom + 4 : (Platform.OS === 'ios' ? 28 : 10);
  const tabHeight = 60 + (insets.bottom > 0 ? insets.bottom : (Platform.OS === 'ios' ? 28 : 10));

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: '#2dd4bf',
        tabBarInactiveTintColor: '#64748b',
        tabBarStyle: {
          backgroundColor: '#07171e',
          borderTopColor: 'rgba(255, 255, 255, 0.08)',
          borderTopWidth: 1,
          height: tabHeight,
          paddingBottom: bottomPadding,
          paddingTop: 8,
          elevation: 10,
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '600',
          letterSpacing: 0.3,
        },
      }}>
      <Tabs.Screen
        name="index"
        options={{
          title: 'Início',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? 'grid' : 'grid-outline'} size={22} color={color as any} />
          ),
        }}
      />
      <Tabs.Screen
        name="chamados"
        options={{
          title: 'Chamados',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? 'receipt' : 'receipt-outline'} size={22} color={color as any} />
          ),
        }}
      />
      <Tabs.Screen
        name="novo"
        options={{
          title: 'Novo',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? 'add-circle' : 'add-circle-outline'} size={26} color={color as any} />
          ),
        }}
      />
      <Tabs.Screen
        name="perfil"
        options={{
          title: 'Perfil',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? 'person' : 'person-outline'} size={22} color={color as any} />
          ),
        }}
      />
    </Tabs>
  );
}
