import React, { useEffect, useState } from 'react';
import { ActivityIndicator, View, Text, TextInput, TouchableOpacity, StyleSheet, KeyboardAvoidingView, Platform, Modal, FlatList, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';
import { registerUser } from '@/src/services/auth';
import { colors } from '@/src/theme';
import { getDepartments } from '@/src/services/departments';

const fallbackDepartments = ['Geral', 'Recursos Humanos', 'Comercial', 'Financeiro', 'TI', 'Operacoes', 'Suporte'];

export default function RegisterScreen() {
  const [nome, setNome] = useState('');
  const [email, setEmail] = useState('');
  const [confirmEmail, setConfirmEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [confirmSenha, setConfirmSenha] = useState('');
  const [analystToken, setAnalystToken] = useState('');
  const [department, setDepartment] = useState(fallbackDepartments[0]);
  const [availableDepartments, setAvailableDepartments] = useState<string[]>(fallbackDepartments);
  const [loadingDepartments, setLoadingDepartments] = useState(false);
  const [departmentError, setDepartmentError] = useState<string | null>(null);
  const [showPwd, setShowPwd] = useState(false);
  const [showConfirmPwd, setShowConfirmPwd] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleRegister = async () => {
    setErro(null);
    if (!nome || !email || !confirmEmail || !senha || !confirmSenha) {
      setErro('Preencha todos os campos obrigatorios.');
      return;
    }
    if (email !== confirmEmail) {
      setErro('Os emails precisam ser iguais.');
      return;
    }
    if (senha !== confirmSenha) {
      setErro('As senhas devem coincidir.');
      return;
    }

    try {
      setLoading(true);
      await registerUser({
        name: nome,
        email,
        password: senha,
        department,
        inviteToken: analystToken || undefined,
        role: 'user',
        origin: 'mobile',
      });
      router.replace('/login');
    } catch (e: any) {
      const msg = e?.userMessage || e?.message || 'Falha no cadastro.';
      setErro(msg);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let active = true;
    setLoadingDepartments(true);
    setDepartmentError(null);
    getDepartments()
      .then((list) => {
        if (!active || list.length === 0) return;
        const names = list.map((dept) => dept.name);
        setAvailableDepartments(names);
        setDepartment(names[0]);
      })
      .catch((err) => {
        if (!active) return;
        setDepartmentError(err.message);
      })
      .finally(() => {
        if (active) setLoadingDepartments(false);
      });
    return () => {
      active = false;
    };
  }, []);

  return (
    <SafeAreaView style={styles.wrapper}>
      <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <ScrollView contentContainerStyle={styles.cardWrapper} keyboardShouldPersistTaps="handled" keyboardDismissMode="interactive">
          <View style={styles.card}>
          <Text style={styles.title}>Cadastro</Text>

          <Text style={styles.label}>Nome completo</Text>
          <TextInput
            style={styles.input}
            placeholder="Nome completo"
            placeholderTextColor={colors.textMuted}
            value={nome}
            onChangeText={setNome}
          />

          <Text style={styles.label}>E-mail</Text>
          <TextInput
            style={styles.input}
            placeholder="E-mail"
            placeholderTextColor={colors.textMuted}
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
          />

          <Text style={styles.label}>Confirmar E-mail</Text>
          <TextInput
            style={styles.input}
            placeholder="Confirme o e-mail"
            placeholderTextColor={colors.textMuted}
            value={confirmEmail}
            onChangeText={setConfirmEmail}
            keyboardType="email-address"
            autoCapitalize="none"
          />

          <Text style={styles.label}>Departamento</Text>
          <TouchableOpacity style={styles.selectInput} onPress={() => setModalVisible(true)}>
            <Text style={styles.selectText}>{department}</Text>
            <Ionicons name="caret-down-outline" size={20} color={colors.textMuted} />
          </TouchableOpacity>
          {loadingDepartments && (
            <View style={styles.loaderRow}>
              <ActivityIndicator size="small" color={colors.primary} />
              <Text style={styles.loaderText}>Carregando departamentos...</Text>
            </View>
          )}
          {departmentError && <Text style={styles.errorSmall}>{departmentError}</Text>}

          <Text style={styles.label}>Token de analista (opcional)</Text>
          <TextInput
            style={styles.input}
            placeholder="Informe somente se for analista"
            placeholderTextColor={colors.textMuted}
            value={analystToken}
            onChangeText={setAnalystToken}
            autoCapitalize="none"
          />

          <Text style={styles.label}>Senha</Text>
          <View style={styles.inputWrapper}>
            <TextInput
              style={[styles.input, styles.inputWithIcon]}
              placeholder="Senha"
              placeholderTextColor={colors.textMuted}
              value={senha}
              onChangeText={setSenha}
              secureTextEntry={!showPwd}
              returnKeyType="next"
              onSubmitEditing={handleRegister}
            />
            <TouchableOpacity style={styles.eyeInside} onPress={() => setShowPwd((s) => !s)} accessibilityLabel={showPwd ? 'Ocultar senha' : 'Mostrar senha'}>
              <Ionicons name={showPwd ? 'eye-off-outline' : 'eye-outline'} size={22} color={colors.warning} />
            </TouchableOpacity>
          </View>

          <Text style={styles.label}>Confirmar Senha</Text>
          <View style={styles.inputWrapper}>
            <TextInput
              style={[styles.input, styles.inputWithIcon]}
              placeholder="Repita a senha"
              placeholderTextColor={colors.textMuted}
              value={confirmSenha}
              onChangeText={setConfirmSenha}
              secureTextEntry={!showConfirmPwd}
              returnKeyType="done"
              onSubmitEditing={handleRegister}
            />
            <TouchableOpacity style={styles.eyeInside} onPress={() => setShowConfirmPwd((s) => !s)} accessibilityLabel={showConfirmPwd ? 'Ocultar senha' : 'Mostrar senha'}>
              <Ionicons name={showConfirmPwd ? 'eye-off-outline' : 'eye-outline'} size={22} color={colors.warning} />
            </TouchableOpacity>
          </View>

          {erro && <Text style={styles.erro}>{erro}</Text>}

          <TouchableOpacity style={styles.button} onPress={handleRegister} disabled={loading} accessibilityRole="button" accessibilityLabel="Cadastrar">
            <Text style={styles.buttonText}>{loading ? 'Cadastrando...' : 'Cadastrar'}</Text>
          </TouchableOpacity>

          <TouchableOpacity onPress={() => router.back()} accessibilityRole="button" accessibilityLabel="Voltar para login">
            <Text style={styles.link}>Ja tem uma conta? Voltar ao login</Text>
          </TouchableOpacity>
        </View>
        </ScrollView>
      </KeyboardAvoidingView>

      <Modal transparent visible={modalVisible} animationType="fade" onRequestClose={() => setModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <Text style={styles.modalTitle}>Departamento</Text>
            <FlatList
              data={availableDepartments}
              keyExtractor={(item) => item}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={styles.modalOption}
                  onPress={() => {
                    setDepartment(item);
                    setModalVisible(false);
                  }}
                >
                  <Text style={styles.modalOptionText}>{item}</Text>
                </TouchableOpacity>
              )}
            />
            <TouchableOpacity style={styles.modalClose} onPress={() => setModalVisible(false)}>
              <Text style={styles.modalCloseText}>Cancelar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  wrapper: { flex: 1, backgroundColor: colors.bg },
  container: { flex: 1 },
  cardWrapper: { flexGrow: 1, padding: 24, justifyContent: 'center' },
  card: { backgroundColor: colors.white, borderRadius: 16, padding: 24, shadowColor: '#000', shadowOpacity: 0.05, shadowOffset: { width: 0, height: 4 }, shadowRadius: 12, elevation: 4 },
  title: { fontSize: 28, fontWeight: 'bold', marginBottom: 16, textAlign: 'center', color: colors.primary },
  label: { fontSize: 14, fontWeight: '600', color: '#4B5563', marginBottom: 6 },
  input: { backgroundColor: '#F3F4F6', padding: 12, borderRadius: 8, marginBottom: 16, borderWidth: 1, borderColor: '#E5E7EB', color: colors.text },
  selectInput: { backgroundColor: '#F9FAFB', borderRadius: 8, borderWidth: 1, borderColor: '#E5E7EB', padding: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 },
  selectText: { color: colors.text, fontWeight: '600' },
  loaderRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  loaderText: { marginLeft: 8, color: colors.textMuted, fontSize: 12 },
  errorSmall: { color: colors.danger, fontSize: 12, marginBottom: 8 },
  inputWrapper: { position: 'relative', marginBottom: 16 },
  inputWithIcon: { paddingRight: 42 },
  eyeInside: { position: 'absolute', right: 10, top: 12, padding: 4 },
  button: { backgroundColor: colors.accent, padding: 14, borderRadius: 10, alignItems: 'center', marginBottom: 12 },
  buttonText: { color: colors.white, fontWeight: 'bold' },
  link: { color: colors.info, textAlign: 'center', fontWeight: '600' },
  erro: { color: colors.danger, textAlign: 'center', marginBottom: 12 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.35)', justifyContent: 'center', padding: 20 },
  modalContainer: { backgroundColor: colors.white, borderRadius: 16, padding: 16, maxHeight: '60%' },
  modalTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 10, textAlign: 'center' },
  modalOption: { paddingVertical: 12, paddingHorizontal: 8, borderBottomWidth: 1, borderBottomColor: '#E5E7EB' },
  modalOptionText: { fontSize: 16, color: colors.text },
  modalClose: { marginTop: 12, alignItems: 'center' },
  modalCloseText: { color: colors.primary, fontWeight: '600' },
});





