import React, { createContext, PropsWithChildren, useCallback, useContext, useMemo, useRef, useState } from "react";
import { Animated, Image, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Ionicons from "@expo/vector-icons/Ionicons";
import { useRouter, useSegments } from "expo-router";

import HelplineLogo from "@/assets/images/helpline-logo.png";
import { colors } from "@/src/theme";
import { clearToken } from "@/src/services/api";

const DrawerContext = createContext<{ open: () => void; close: () => void } | null>(null);

export function useDrawer() {
  const ctx = useContext(DrawerContext);
  if (!ctx) throw new Error("useDrawer precisa estar dentro do DrawerProvider");
  return ctx;
}

export function DrawerProvider({ children }: PropsWithChildren) {
  const [visible, setVisible] = useState(false);
  const anim = useRef(new Animated.Value(0)).current;

  const open = useCallback(() => {
    setVisible(true);
    Animated.timing(anim, { toValue: 1, duration: 250, useNativeDriver: true }).start();
  }, [anim]);

  const close = useCallback(() => {
    Animated.timing(anim, { toValue: 0, duration: 200, useNativeDriver: true }).start(({ finished }) => {
      if (finished) setVisible(false);
    });
  }, [anim]);

  const value = useMemo(() => ({ open, close }), [open, close]);

  return (
    <DrawerContext.Provider value={value}>
      {children}
      {visible && <DrawerOverlay anim={anim} close={close} />}
    </DrawerContext.Provider>
  );
}

function DrawerOverlay({ anim, close }: { anim: Animated.Value; close: () => void }) {
  const router = useRouter();
  const segments = useSegments();
  const insets = useSafeAreaInsets();

  const current = Array.isArray(segments) ? '/' + segments.join('/') : '';

  const go = async (href: string, shouldClear?: boolean) => {
    close();
    if (shouldClear) await clearToken();
    router.push(href as any);
  };

  const drawerStyle = {
    transform: [
      {
        translateX: anim.interpolate({ inputRange: [0, 1], outputRange: [320, 0] }),
      },
    ],
  };

  return (
    <View style={styles.overlay}>
      <TouchableOpacity style={styles.backdrop} activeOpacity={1} onPress={close} />
      <Animated.View style={[styles.drawer, drawerStyle, { paddingTop: Math.max(24, insets.top + 12), paddingBottom: Math.max(24, insets.bottom + 12) }]}>
        <View style={styles.drawerHeader}>
          <View style={styles.branding}>
            <Image source={HelplineLogo} style={styles.logo} resizeMode="contain" />
            <Text style={styles.brandText}>HelpLine</Text>
          </View>
          <TouchableOpacity style={styles.closeButton} onPress={close} accessibilityLabel="Fechar menu">
            <Ionicons name="close" size={18} color="#1D0E6F" />
          </TouchableOpacity>
        </View>

        <DrawerItem icon="home" label="Inicio" active={current === '/home'} onPress={() => go('/home')} />
        <DrawerItem icon="chatbubble-ellipses-outline" label="Chat" active={current.includes('chatbot')} onPress={() => go('/tabs/chatbot')} />
        <DrawerItem icon="book-outline" label="Artigos uteis" active={current.includes('artigos')} onPress={() => go('/tabs/artigos')} />
        <DrawerItem icon="list-outline" label="Meus chamados" active={current.includes('chamados')} onPress={() => go('/tabs/chamados')} />

        <TouchableOpacity style={styles.logout} onPress={() => go('/login', true)} accessibilityRole="button">
          <Ionicons name="log-out-outline" size={20} color={colors.warning} />
          <Text style={styles.logoutText}>Sair</Text>
        </TouchableOpacity>
      </Animated.View>
    </View>
  );
}

function DrawerItem({ icon, label, onPress, active }: { icon: keyof typeof Ionicons.glyphMap; label: string; onPress: () => void; active?: boolean }) {
  return (
    <TouchableOpacity style={[styles.item, active && styles.itemActive]} onPress={onPress} accessibilityRole="button">
      <Ionicons name={icon} size={20} color={active ? colors.warning : '#fff'} style={{ width: 30 }} />
      <Text style={[styles.itemText, active && styles.itemTextActive]}>{label}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  overlay: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.35)',
  },
  backdrop: { flex: 1 },
  drawer: {
    width: '78%',
    maxWidth: 320,
    height: '100%',
    backgroundColor: '#1D0E6F',
    paddingHorizontal: 18,
    borderTopLeftRadius: 24,
    borderBottomLeftRadius: 24,
  },
  drawerHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 32 },
  branding: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  logo: { width: 36, height: 36 },
  brandText: { color: '#F59E0B', fontSize: 20, fontWeight: '700' },
  closeButton: { width: 32, height: 32, borderRadius: 10, backgroundColor: '#FEE2E2', alignItems: 'center', justifyContent: 'center' },
  item: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12 },
  itemActive: { backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 12 },
  itemText: { color: '#fff', fontSize: 16, fontWeight: '500' },
  itemTextActive: { color: colors.warning },
  logout: { marginTop: 'auto', flexDirection: 'row', gap: 10, alignItems: 'center', paddingTop: 18, borderTopWidth: 1, borderTopColor: '#2F1F78' },
  logoutText: { color: colors.warning, fontWeight: '600' },
});

