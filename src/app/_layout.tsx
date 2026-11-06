import React, { useEffect, useRef } from 'react';
import { View, ActivityIndicator, useColorScheme, Platform } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { Stack, router, useSegments } from 'expo-router';
import * as Notifications from 'expo-notifications';
import * as SplashScreen from 'expo-splash-screen';
import { AuthProvider, useAuth } from '@/contexts/auth';
import { registerPushDevice } from '@/services/api';
import { Colors } from '@/constants/theme';

// Configuração do comportamento de notificações em primeiro plano
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

SplashScreen.preventAutoHideAsync().catch(() => {});

function RootNavigationLayout() {
  const { user, isAuthenticated, isLoading } = useAuth();
  const segments = useSegments();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const theme = isDark ? Colors.dark : Colors.light;

  const responseListener = useRef<Notifications.EventSubscription | null>(null);

  // Guarda de Autenticação e Roteamento
  useEffect(() => {
    if (isLoading) return;

    const currentSegment = (segments as string[])[0];

    if (!isAuthenticated) {
      if (currentSegment !== 'login') {
        router.replace('/login' as any);
      }
    } else if (user?.must_change_password) {
      if (currentSegment !== 'alterar-senha') {
        router.replace('/alterar-senha' as any);
      }
    } else if (currentSegment === 'login') {
      router.replace('/(tabs)' as any);
    }

    SplashScreen.hideAsync().catch(() => {});
  }, [isAuthenticated, isLoading, user, segments]);

  // Registro e Escuta de Push Notifications & Deep Linking
  useEffect(() => {
    if (!isAuthenticated || !user) return;

    async function setupPush() {
      try {
        if (Platform.OS === 'android') {
          await Notifications.setNotificationChannelAsync('default', {
            name: 'Chamados',
            importance: Notifications.AndroidImportance.MAX,
            vibrationPattern: [0, 250, 250, 250],
            lightColor: '#2dd4bf',
            sound: 'default',
          });
        }

        const { status: existingStatus } = await Notifications.getPermissionsAsync();
        let finalStatus = existingStatus;
        if (existingStatus !== 'granted') {
          const { status } = await Notifications.requestPermissionsAsync();
          finalStatus = status;
        }
        if (finalStatus !== 'granted') return;

        const tokenData = await Notifications.getExpoPushTokenAsync({
          projectId: '7dd24128-9199-4c61-a894-156f62cf217d',
        }).catch(err => {
          console.warn('[Push] Erro ao obter token Expo:', err);
          return null;
        });
        if (tokenData?.data) {
          console.log('[Push] Token oficial obtido com sucesso:', tokenData.data);
          await registerPushDevice(tokenData.data);
        }
      } catch (e) {
        console.warn('[Push] Erro ao obter token:', e);
      }
    }

    setupPush();

    // Listener ao clicar na notificação (Deep Linking)
    responseListener.current = Notifications.addNotificationResponseReceivedListener(response => {
      const data = response.notification.request.content.data;
      if (data?.chamadoId) {
        router.push(`/chamado/${data.chamadoId}` as any);
      }
    });

    return () => {
      if (responseListener.current) {
        responseListener.current.remove();
      }
    };
  }, [isAuthenticated, user]);

  if (isLoading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#030f14' }}>
        <ActivityIndicator size="large" color="#2dd4bf" />
      </View>
    );
  }

  return (
    <>
      <StatusBar style="light" />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: {
            backgroundColor: '#030f14',
          },
        }}>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="chamado/[id]" options={{ headerShown: false }} />
        <Stack.Screen name="login" options={{ headerShown: false }} />
        <Stack.Screen name="alterar-senha" options={{ headerShown: false }} />
      </Stack>
    </>
  );
}

export default function RootLayout() {
  return (
    <AuthProvider>
      <RootNavigationLayout />
    </AuthProvider>
  );
}
