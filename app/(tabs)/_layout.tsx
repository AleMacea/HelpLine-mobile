import React, { useEffect, useState } from 'react';
import { View, ActivityIndicator, Text, TouchableOpacity } from 'react-native';
import { Redirect, Tabs, useRouter } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { clearToken } from '@/src/services/api';
import { colors } from '@/src/theme';

const TOKEN_KEY = 'auth.token';

export default function TabsGuardLayout() {
  const [loading, setLoading] = useState(true);
  const [hasToken, setHasToken] = useState<boolean | null>(null);
  const router = useRouter();

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

  const HeaderLogout = () => (
    <TouchableOpacity
      onPress={async () => { await clearToken(); router.replace('/login'); }}
      style={{ paddingHorizontal: 12, paddingVertical: 6 }}
      accessibilityLabel="Sair"
    >
      <Text style={{ color: '#2563EB', fontWeight: '600' }}>Sair</Text>
    </TouchableOpacity>
  );

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: { backgroundColor: colors.primary, borderTopColor: colors.primaryDark },
        tabBarActiveTintColor: colors.warning,
        tabBarInactiveTintColor: '#D1D5DB',
      }}
    >
      <Tabs.Screen name="artigos" options={{ title: 'Artigos', tabBarIcon: ({ color, size }) => (<Ionicons name="book-outline" color={color} size={size} />) }} />
      <Tabs.Screen name="chatbot" options={{ title: 'Chatbot', tabBarIcon: ({ color, size }) => (<Ionicons name="chatbubble-ellipses-outline" color={color} size={size} />) }} />
      <Tabs.Screen name="chamados" options={{ title: 'Chamados', tabBarIcon: ({ color, size }) => (<Ionicons name="list-outline" color={color} size={size} />) }} />
      <Tabs.Screen name="perfil" options={{ title: 'Perfil', tabBarIcon: ({ color, size }) => (<Ionicons name="person-circle-outline" color={color} size={size} />) }} />
    </Tabs>
  );
}
