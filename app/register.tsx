import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, KeyboardAvoidingView, Platform, Keyboard, TouchableWithoutFeedback } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';
import { registerUser } from '@/src/services/auth';
import { colors } from '@/src/theme';

export default function RegisterScreen() {
  const [nome, setNome] = useState('');
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [showPwd, setShowPwd] = useState(false);
  const [tipoUsuario, setTipoUsuario] = useState<'usuario' | 'analista'>('usuario');
  const [invite, setInvite] = useState('');
  const [erro, setErro] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleRegister = async () => {
    setErro(null);
    if (!nome || !email || !senha) { setErro('Preencha nome, e-mail e senha.'); return; }
    if (tipoUsuario === 'analista' && invite !== 'SUPORTE4280') { setErro('Token de convite inválido para analista.'); return; }
    try {
      setLoading(true);
      await registerUser({ name: nome, email, password: senha, kind: tipoUsuario });
      // Após cadastro bem-sucedido, voltar ao login para o usuário entrar conscientemente
      router.replace('/login');
    } catch (e: any) {
      setErro(e?.message || 'Falha no cadastro');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }}>
      <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
      <View>
      <Text style={styles.title}>Cadastro</Text>

      <TextInput style={styles.input} placeholder="Nome completo" placeholderTextColor={colors.textMuted} value={nome} onChangeText={setNome} />
      <TextInput style={styles.input} placeholder="E-mail" placeholderTextColor={colors.textMuted} value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" />
      <View style={styles.inputWrapper}>
        <TextInput
          style={[styles.input, styles.inputWithIcon]}
          placeholder="Senha"
          placeholderTextColor={colors.textMuted}
          value={senha}
          onChangeText={setSenha}
          secureTextEntry={!showPwd}
          returnKeyType="go"
          onSubmitEditing={handleRegister}
        />
        <TouchableOpacity style={styles.eyeInside} onPress={() => setShowPwd((s) => !s)} accessibilityLabel={showPwd ? 'Ocultar senha' : 'Mostrar senha'}>
          <Ionicons name={showPwd ? 'eye-off-outline' : 'eye-outline'} size={22} color={colors.warning} />
        </TouchableOpacity>
      </View>

      <Text style={styles.label}>Tipo de usuário</Text>
      <View style={styles.tipoContainer}>
        <TouchableOpacity style={[styles.tipoBotao, tipoUsuario === 'usuario' && styles.tipoSelecionado]} onPress={() => setTipoUsuario('usuario')}>
          <Text style={[styles.tipoTexto, tipoUsuario === 'usuario' && styles.tipoTextoSel]}>Usuário</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.tipoBotao, tipoUsuario === 'analista' && styles.tipoSelecionado]} onPress={() => setTipoUsuario('analista')}>
          <Text style={[styles.tipoTexto, tipoUsuario === 'analista' && styles.tipoTextoSel]}>Analista</Text>
        </TouchableOpacity>
      </View>

      {tipoUsuario === 'analista' && (
        <TextInput style={styles.input} placeholder="Token de convite" placeholderTextColor={colors.textMuted} value={invite} onChangeText={setInvite} />
      )}

      {erro && <Text style={styles.erro}>{erro}</Text>}

      <TouchableOpacity style={styles.button} onPress={handleRegister} disabled={loading} accessibilityRole="button" accessibilityLabel="Cadastrar">
        <Text style={styles.buttonText}>{loading ? 'Cadastrando...' : 'Cadastrar'}</Text>
      </TouchableOpacity>

      <TouchableOpacity onPress={() => router.back()} accessibilityRole="button" accessibilityLabel="Voltar para login">
        <Text style={styles.link}>Já tem uma conta? Voltar ao login</Text>
      </TouchableOpacity>
      </View>
      </TouchableWithoutFeedback>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg, padding: 24, justifyContent: 'center' },
  title: { fontSize: 28, fontWeight: 'bold', marginBottom: 24, textAlign: 'center', color: colors.primary },
  label: { fontSize: 16, marginBottom: 6, color: '#374151' },
  input: { backgroundColor: colors.white, padding: 12, borderRadius: 8, marginBottom: 16, borderWidth: 1, borderColor: colors.border },
  inputWrapper: { position: 'relative', marginBottom: 16 },
  inputWithIcon: { paddingRight: 42 },
  eyeInside: { position: 'absolute', right: 10, top: 12, padding: 4 },
  tipoContainer: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 16 },
  tipoBotao: { flex: 1, padding: 12, borderRadius: 8, borderWidth: 1, borderColor: colors.border, marginHorizontal: 4, backgroundColor: colors.white },
  tipoSelecionado: { backgroundColor: colors.primary },
  tipoTexto: { textAlign: 'center', fontWeight: '600', color: colors.text },
  tipoTextoSel: { color: colors.white },
  button: { backgroundColor: colors.accent, padding: 14, borderRadius: 8, alignItems: 'center', marginBottom: 12 },
  buttonText: { color: colors.white, fontWeight: 'bold' },
  link: { color: colors.info, textAlign: 'center', fontWeight: '600' },
  erro: { color: colors.danger, textAlign: 'center', marginBottom: 12 },
});
