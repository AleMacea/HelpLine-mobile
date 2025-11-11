import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity } from 'react-native';
import { colors } from '@/src/theme';
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
      try { const me = await getMe(); setName(me.name); setEmail(me.email); setRoles(me.roles || []); } catch {}
    })();
  }, []);

  return (
    <View style={styles.container}>
      <View style={styles.avatarWrap}>
        <Image source={{ uri: `https://api.dicebear.com/9.x/initials/svg?seed=${encodeURIComponent(name||email||'U')}` }} style={styles.avatar} />
      </View>
      <Text style={styles.name}>{name || 'Usuário'}</Text>
      <Text style={styles.email}>{email}</Text>
      <Text style={styles.roles}>{roles.join(' • ')}</Text>

      <View style={{ height: 16 }} />

      <TouchableOpacity style={styles.btn} onPress={async () => { await clearToken(); router.replace('/login'); }}>
        <Text style={styles.btnText}>Sair</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg, alignItems: 'center', padding: 24 },
  avatarWrap: { width: 120, height: 120, borderRadius: 60, overflow: 'hidden', borderWidth: 2, borderColor: colors.primary, marginTop: 24, marginBottom: 12 },
  avatar: { width: '100%', height: '100%' },
  name: { fontSize: 20, fontWeight: 'bold', color: colors.text },
  email: { fontSize: 14, color: colors.textMuted, marginTop: 4 },
  roles: { fontSize: 12, color: colors.textMuted, marginTop: 2 },
  btn: { backgroundColor: colors.primary, paddingVertical: 12, paddingHorizontal: 24, borderRadius: 8, marginTop: 24 },
  btnText: { color: colors.white, fontWeight: 'bold' },
});

