import { setToken } from '@/src/services/api';
import { loginUser } from '@/src/services/auth';
import { colors } from '@/src/theme';
import { useRouter } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';
import React, { useState } from 'react';
import { Keyboard, KeyboardAvoidingView, Platform, StyleSheet, Text, TextInput, TouchableOpacity, View, TouchableWithoutFeedback } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPwd, setShowPwd] = useState(false);
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const router = useRouter();

  const handleLogin = async () => {
    setErro(null);
    setLoading(true);
    try {
      const resp = await loginUser({ email, password });
      await setToken(resp.token);
      router.replace('/(tabs)/artigos');
    } catch (e: any) {
      const msg: string = e?.message || '';
      if (msg.includes('401')) setErro('E-mail ou senha inválidos.');
      else setErro('Falha no login. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }}>
      <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
      <View>
      <Text style={styles.title}>Bem-vindo</Text>
      <Text style={styles.subtitle}>Acesse sua conta para continuar</Text>

      <Text style={styles.label}>E-mail</Text>
      <TextInput
        style={styles.input}
        placeholder="seu@email.com"
        placeholderTextColor={colors.textMuted}
        value={email}
        onChangeText={setEmail}
        keyboardType="email-address"
        autoCapitalize="none"
      />

      <Text style={styles.label}>Senha</Text>
      <View style={styles.inputWrapper}>
        <TextInput
          style={[styles.input, styles.inputWithIcon]}
          placeholder="********"
          placeholderTextColor={colors.textMuted}
          value={password}
          onChangeText={setPassword}
          secureTextEntry={!showPwd}
          returnKeyType="go"
          onSubmitEditing={handleLogin}
        />
        <TouchableOpacity
          style={styles.eyeInside}
          onPress={() => setShowPwd((s) => !s)}
          accessibilityLabel={showPwd ? 'Ocultar senha' : 'Mostrar senha'}
        >
          <Ionicons
            name={showPwd ? 'eye-off-outline' : 'eye-outline'}
            size={22}
            color={colors.warning}
          />
        </TouchableOpacity>
      </View>

      {erro && <Text style={{ color: '#DC2626', textAlign: 'center', marginBottom: 8 }}>{erro}</Text>}
      <TouchableOpacity style={styles.button} onPress={handleLogin} disabled={loading}
        accessibilityRole="button" accessibilityLabel="Entrar">
        <Text style={styles.buttonText}>{loading ? 'Entrando...' : 'Entrar'}</Text>
      </TouchableOpacity>

      <TouchableOpacity onPress={() => router.push('/register')} accessibilityRole="button" accessibilityLabel="Ir para cadastro">
        <Text style={styles.link}>Não tem uma conta? Cadastre-se</Text>
      </TouchableOpacity>
      </View>
      </TouchableWithoutFeedback>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg, padding: 24, justifyContent: 'center' },
  title: { fontSize: 28, fontWeight: 'bold', marginBottom: 8, textAlign: 'center', color: colors.primary },
  subtitle: { fontSize: 16, color: colors.textMuted, marginBottom: 24, textAlign: 'center' },
  label: { fontSize: 16, marginBottom: 6, color: '#374151' },
  input: { backgroundColor: colors.white, padding: 12, borderRadius: 8, marginBottom: 16, borderWidth: 1, borderColor: colors.border },
  inputWrapper: { position: 'relative', marginBottom: 16 },
  inputWithIcon: { paddingRight: 42 },
  eyeInside: { position: 'absolute', right: 10, top: 12, padding: 4 },
  button: { backgroundColor: colors.primary, padding: 14, borderRadius: 8, alignItems: 'center', marginBottom: 12 },
  buttonText: { color: colors.white, fontWeight: 'bold' },
  link: { color: colors.info, textAlign: 'center', fontWeight: '600' },
});
