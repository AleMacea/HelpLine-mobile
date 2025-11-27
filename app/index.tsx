import React, { useEffect, useState } from "react";
import { View, ActivityIndicator } from "react-native";
import { Redirect } from "expo-router";
import { getMe } from "@/src/services/auth";
import { clearToken, getToken } from "@/src/services/api";

type AuthState = 'checking' | 'auth' | 'guest';

export default function Index() {
  const [state, setState] = useState<AuthState>('checking');

  useEffect(() => {
    (async () => {
      try {
        const token = await getToken();
        if (!token) {
          setState('guest');
          return;
        }
        await getMe();
        setState('auth');
      } catch {
        await clearToken();
        setState('guest');
      }
    })();
  }, []);

  if (state === 'checking') {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator />
      </View>
    );
  }

  if (state === 'auth') return <Redirect href="/home" />;
  return <Redirect href="/login" />;
}
