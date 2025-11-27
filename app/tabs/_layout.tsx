import React, { useEffect, useState } from 'react';
import { View, ActivityIndicator, Platform } from 'react-native';
import { Redirect, Tabs } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { colors } from '@/src/theme';

const TOKEN_KEY = 'auth.token';

export default function TabsGuardLayout() {
  const [loading, setLoading] = useState(true);
  const [hasToken, setHasToken] = useState<boolean | null>(null);


  useEffect(() => {
    (async () => {
      try {
        const t = await AsyncStorage.getItem(TOKEN_KEY);
        setHasToken(!!t);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  if (loading) return <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}><ActivityIndicator /></View>;
  if (!hasToken) return <Redirect href="/login" />;

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: { backgroundColor: colors.primary, borderTopColor: colors.primaryDark, paddingBottom: Platform.OS === 'ios' ? 24 : 18, paddingTop: 8, height: 88 },
        tabBarActiveTintColor: colors.warning,
        tabBarInactiveTintColor: '#D1D5DB',
      }}
    >
      <Tabs.Screen name="artigos" options={{ title: 'Artigos', tabBarIcon: ({ color, size }) => (<Ionicons name="book-outline" color={color} size={size} />) }} />
      <Tabs.Screen name="chatbot" options={{ title: 'Chat', tabBarIcon: ({ color, size }) => (<Ionicons name="chatbubble-ellipses-outline" color={color} size={size} />) }} />
      <Tabs.Screen name="chamados" options={{ title: 'Chamados', tabBarIcon: ({ color, size }) => (<Ionicons name="list-outline" color={color} size={size} />) }} />
      <Tabs.Screen name="perfil" options={{ title: 'Perfil', tabBarIcon: ({ color, size }) => (<Ionicons name="person-circle-outline" color={color} size={size} />) }} />
    </Tabs>
  );
}


