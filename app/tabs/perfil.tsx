import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors } from '@/src/theme';
import { AppHeader } from '@/src/components/AppHeader';
import { getMe } from '@/src/services/auth';
import { clearToken } from '@/src/services/api';
import { useRouter } from 'expo-router';

export default function PerfilScreen() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [roles, setRoles] = useState<string[]>([]);
  const router = useRouter();

  useEffect(() => {
    (async () => {
      try {
        const me = await getMe();
        setName(me.name);
        setEmail(me.email);
        setRoles(me.roles || []);
      } catch {}
    })();
  }, []);

  const initial = useMemo(() => {
    const source = (name || email || 'U').trim();
    return source ? source.charAt(0).toUpperCase() : 'U';
  }, [name, email]);

  const roleLabel = roles.length ? roles.join(' / ') : 'User';

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
      <AppHeader style={styles.appHeader} />
      <View style={styles.container}>
        <View style={styles.avatarWrap}>
          <Text style={styles.avatarInitial}>{initial}</Text>
        </View>
        <Text style={styles.name}>{name || 'Usuario'}</Text>
        <Text style={styles.email}>{email}</Text>
        <Text style={styles.roles}>{roleLabel}</Text>

        <View style={{ height: 16 }} />

        <TouchableOpacity
          style={styles.btn}
          onPress={async () => {
            await clearToken();
            router.replace('/login');
          }}
        >
          <Text style={styles.btnText}>Sair</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.bg },
  appHeader: { paddingBottom: 0 },
  container: { flex: 1, backgroundColor: colors.bg, alignItems: 'center', padding: 24 },
  avatarWrap: {
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 2,
    borderColor: colors.primary,
    marginTop: 24,
    marginBottom: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#E0E7FF',
  },
  avatarInitial: { fontSize: 48, fontWeight: '700', color: colors.primary },
  name: { fontSize: 20, fontWeight: 'bold', color: colors.text },
  email: { fontSize: 14, color: colors.textMuted, marginTop: 4 },
  roles: { fontSize: 12, color: colors.textMuted, marginTop: 2 },
  btn: { backgroundColor: colors.primary, paddingVertical: 12, paddingHorizontal: 24, borderRadius: 8, marginTop: 24 },
  btnText: { color: colors.white, fontWeight: 'bold' },
});
