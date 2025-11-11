import React, { useEffect, useMemo, useRef, useState } from 'react';
import { FlatList, KeyboardAvoidingView, Platform, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { enviarParaChatGPT } from '@/src/services/chatgpt';
import { getJson, postJson } from '@/src/services/api';
import { colors } from '@/src/theme';

type Sender = 'user' | 'bot' | 'analyst' | 'system';
type Message = { id: string; sender: Sender; text: string };

export default function ChatbotScreen() {
  const params = useLocalSearchParams<{ context?: string }>();

  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'w1',
      sender: 'bot',
      text:
        'Bem-vindo ao HelpLine! Este canal faz triagem inicial. Suas informacoes serao tratadas conforme a LGPD (Lei 13.709/2018). Ao continuar, voce concorda com o uso dos dados para atendimento tecnico.',
    },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [accepted, setAccepted] = useState(false);
  const [pendingFbForId, setPendingFbForId] = useState<string | null>(null);
  const [failCount, setFailCount] = useState(0);
  const [escalated, setEscalated] = useState(false);
  const [ticketId, setTicketId] = useState<string | null>(null);
  const [lastUserText, setLastUserText] = useState('');

  const flatRef = useRef<FlatList>(null);

  // Auto-scroll on new messages
  useEffect(() => {
    setTimeout(() => {
      // @ts-ignore
      flatRef.current?.scrollToEnd?.({ animated: true });
    }, 40);
  }, [messages]);

  // If opened from an article with context, seed the conversation
  useEffect(() => {
    const ctx = (params?.context || '').toString().trim();
    if (ctx) {
      const m: Message = { id: String(Date.now()), sender: 'user', text: ctx };
      setMessages((prev) => [...prev, m]);
      setAccepted(true);
      setInput('');
      // answer in background
      setTimeout(() => handleProcess(ctx, m.id), 10);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const quickReplies = useMemo(
    () => [
      'Problemas de rede (Wi-Fi/VPN)',
      'Acesso e senha (conta bloqueada)',
      'Sistema lento ou travando',
      'Erro ao abrir sistema X',
      'Impressora nao imprime',
    ],
    []
  );

  const classify = (t: string) => {
    const s = t.toLowerCase();
    if (s.includes('impressora') || s.includes('monitor') || s.includes('teclado')) return 'Hardware';
    if (s.includes('wi-fi') || s.includes('rede') || s.includes('vpn')) return 'Rede';
    if (s.includes('windows') || s.includes('linux') || s.includes('sistema operacional')) return 'Sistema Operacional';
    if (s.includes('senha') || s.includes('acesso') || s.includes('login')) return 'Acesso/Security';
    if (s.includes('sistema') || s.includes('aplicativo') || s.includes('software')) return 'Software';
    return 'Outros';
  };
  const levelFor = (cat: string) => (cat === 'Hardware' || cat === 'Rede' ? 'N2' : cat === 'Software' || cat === 'Sistema Operacional' ? 'N3' : 'N1');
  const inWorkHours = () => {
    const d = new Date();
    const dow = d.getDay();
    const h = d.getHours();
    return dow >= 1 && dow <= 5 && h >= 8 && h < 18;
  };

  async function handleProcess(userText: string, originId: string) {
    setLoading(true);
    try {
      setLastUserText(userText);
      const ans = await enviarParaChatGPT([...messages, { id: originId, sender: 'user', text: userText }].map(m => ({ role: m.sender === 'user' ? 'user' : 'assistant', content: m.text })) as any);
      const bot: Message = { id: String(Date.now() + 1), sender: 'bot', text: ans || 'Certo! Me conte um pouco mais...' };
      setPendingFbForId(bot.id);
      setMessages((prev) => [...prev, bot]);
    } catch {
      setMessages((prev) => [...prev, { id: String(Date.now() + 2), sender: 'bot', text: 'Falha momentanea. Tente novamente em instantes.' }]);
    } finally {
      setLoading(false);
    }
  }

  async function handleSend() {
    const t = input.trim();
    if (!t || loading || !accepted) return;
    const m: Message = { id: String(Date.now()), sender: 'user', text: t };
    setMessages((prev) => [...prev, m]);
    setInput('');
    await handleProcess(t, m.id);
  }

  function handleAccept() {
    if (accepted) return;
    setAccepted(true);
    const confirm: Message = {
      id: String(Date.now()),
      sender: 'user',
      text: 'Concordo com os termos de tratamento de dados (LGPD) para suporte tecnico.',
    };
    const bot: Message = {
      id: String(Date.now() + 1),
      sender: 'bot',
      text: 'Obrigado! Descreva o problema com o maximo de detalhes. Posso sugerir passos de diagnostico.',
    };
    setMessages((prev) => [...prev, confirm, bot]);
  }

  async function escalate() {
    if (escalated) return;
    setLoading(true);
    try {
      const categoria = classify(lastUserText);
      const nivel = levelFor(categoria);
      const categoryId: any = { 'Hardware': 1, 'Software': 2, 'Rede': 3, 'Sistema Operacional': 4, 'Acesso/Security': 5, 'Outros': 6 };
      const levelId: any = { 'N1': 1, 'N2': 2, 'N3': 3 };
      const priorityId: any = { 'Baixa': 1, 'Media': 2, 'Alta': 3, 'Critica': 4 };

      const me = await getJson<{ userId: string; name: string; email: string; roles: string[] }>("/auth/me");
      const requesterId = me.userId;
      const title = (lastUserText || 'Solicitacao de suporte').slice(0, 120);
      const history = messages.map(m => `${m.sender}: ${m.text}`).join('\n').slice(0, 8000);
      const description = `Resumo da conversa com o bot:\n${history}`;

      const created: any = await postJson('/tickets', {
        requesterId,
        title,
        description,
        categoryId: categoryId[categoria] ?? 6,
        levelId: levelId[nivel] ?? 1,
        priorityId: priorityId['Alta'],
        assigneeId: null,
        initialStatusId: null,
        origin: 'mobile',
      });
      const newTicketId = created.ticketId ?? created.TicketId;
      const protocol = created.protocol ?? created.Protocol;
      setTicketId(newTicketId);
      setEscalated(true);

      try {
        if (lastUserText) await postJson(`/tickets/${newTicketId}/messages`, { senderType: 'user', senderUserId: requesterId, content: lastUserText });
        await postJson(`/tickets/${newTicketId}/messages`, { senderType: 'sistema', senderUserId: null, content: `Encaminhado. Categoria: ${categoria}. Protocolo: ${protocol}.` });
        await postJson(`/tickets/${newTicketId}/messages`, { senderType: 'sistema', senderUserId: null, content: `Historico:\n${history}` });
      } catch {}

      const sys: Message[] = [
        { id: String(Date.now() + 2), sender: 'system', text: `Chamado encaminhado. Categoria: ${categoria}. Protocolo: ${protocol}. Aguarde atendimento aqui.` },
      ];
      if (!inWorkHours()) sys.push({ id: String(Date.now() + 3), sender: 'system', text: 'Fora do horario (08h-18h, seg a sex). Seu chamado sera atendido na proxima janela.' });
      setMessages((prev) => [...prev, ...sys]);
    } catch {
      const pseudo = `HL-${Date.now()}`;
      setTicketId(pseudo);
      setEscalated(true);
      setMessages((prev) => [...prev, { id: String(Date.now() + 9), sender: 'system', text: `Chamado encaminhado. Protocolo provisorio: ${pseudo}.` }]);
    } finally {
      setLoading(false);
    }
  }

  function handleFeedback(ok: boolean) {
    setPendingFbForId(null);
    if (ok) {
      setFailCount(0);
      setMessages((prev) => [...prev, { id: String(Date.now()), sender: 'bot', text: 'Que bom! Se precisar, estou por aqui.' }]);
      return;
    }
    const next = failCount + 1;
    setFailCount(next);
    if (next >= 2) {
      escalate();
    } else {
      setMessages((prev) => [...prev, { id: String(Date.now()), sender: 'bot', text: 'Entendi. Vou tentar outra abordagem. Conte mais detalhes, por favor.' }]);
    }
  }

  const renderItem = ({ item }: { item: Message }) => (
    <View
      style={[
        styles.message,
        item.sender === 'user'
          ? styles.userMessage
          : item.sender === 'bot'
          ? styles.botMessage
          : item.sender === 'analyst'
          ? styles.analystMessage
          : styles.systemMessage,
      ]}
      accessibilityRole="text"
    >
      <Text style={[styles.messageText, item.sender === 'user' ? styles.userText : styles.botText]}>{item.text}</Text>

      {item.id === 'w1' && !accepted && (
        <TouchableOpacity style={styles.acceptBtn} onPress={handleAccept} accessibilityRole="button" accessibilityLabel="Aceitar termos e continuar">
          <Text style={styles.acceptText}>Aceitar e continuar</Text>
        </TouchableOpacity>
      )}

      {pendingFbForId === item.id && !escalated && (
        <View style={styles.feedbackRow}>
          <TouchableOpacity style={[styles.fbBtn, styles.fbOk]} onPress={() => handleFeedback(true)}>
            <Text style={styles.fbText}>Resolveu</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.fbBtn, styles.fbNo]} onPress={() => handleFeedback(false)}>
            <Text style={styles.fbText}>Nao resolveu</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined} keyboardVerticalOffset={80}>
      {escalated && (
        <View style={styles.banner}>
          <Text style={styles.bannerText}>Chamado escalado{ticketId ? ` • Protocolo: ${ticketId}` : ''}. Um analista vai responder aqui.</Text>
        </View>
      )}

      <FlatList ref={flatRef} data={messages} keyExtractor={(i) => i.id} renderItem={renderItem} contentContainerStyle={styles.chat} />

      {!escalated && accepted && (
        <View style={styles.quickRow}>
          {quickReplies.map((q) => (
            <TouchableOpacity key={q} style={styles.quickChip} onPress={() => setInput(q)}>
              <Text style={styles.quickText}>{q}</Text>
            </TouchableOpacity>
          ))}
        </View>
      )}

      <View style={styles.inputRow}>
        <TextInput
          style={styles.input}
          placeholder="Descreva seu problema..."
          value={input}
          onChangeText={setInput}
          editable={!loading && accepted}
          returnKeyType="send"
          blurOnSubmit={false}
          onSubmitEditing={handleSend}
        />
        <TouchableOpacity style={styles.sendBtn} onPress={handleSend} disabled={loading || !accepted} accessibilityRole="button" accessibilityLabel="Enviar mensagem">
          <Text style={styles.sendText}>{loading ? '...' : 'Enviar'}</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg, padding: 16 },
  chat: { paddingBottom: 16 },
  message: { padding: 12, borderRadius: 8, marginBottom: 10, maxWidth: '80%' },
  userMessage: { backgroundColor: colors.info, alignSelf: 'flex-end' },
  botMessage: { backgroundColor: '#E5E7EB', alignSelf: 'flex-start' },
  analystMessage: { backgroundColor: '#D1FAE5', alignSelf: 'flex-start', borderWidth: 1, borderColor: '#34D399' },
  systemMessage: { backgroundColor: '#F3F4F6', alignSelf: 'center', borderWidth: 1, borderColor: colors.border },
  messageText: { fontSize: 16 },
  userText: { color: colors.white },
  botText: { color: colors.text },
  inputRow: { flexDirection: 'row', padding: 12, borderTopWidth: 1, borderColor: colors.border, backgroundColor: colors.white, alignItems: 'center', gap: 8 },
  input: { flex: 1, backgroundColor: '#F9FAFB', padding: 10, borderRadius: 8, borderWidth: 1, borderColor: colors.border },
  sendBtn: { backgroundColor: colors.accent, paddingVertical: 10, paddingHorizontal: 16, borderRadius: 8, justifyContent: 'center' },
  sendText: { color: colors.white, fontWeight: 'bold' },
  acceptBtn: { marginTop: 12, backgroundColor: colors.primary, paddingVertical: 10, paddingHorizontal: 20, borderRadius: 8, alignSelf: 'flex-start' },
  acceptText: { color: colors.white, fontWeight: 'bold', fontSize: 16 },
  feedbackRow: { flexDirection: 'row', marginTop: 8 },
  fbBtn: { paddingVertical: 8, paddingHorizontal: 12, borderRadius: 6, marginRight: 8 },
  fbOk: { backgroundColor: colors.accent },
  fbNo: { backgroundColor: '#F87171' },
  fbText: { color: colors.white, fontWeight: '600' },
  quickRow: { flexDirection: 'row', flexWrap: 'wrap', marginBottom: 8 },
  quickChip: { backgroundColor: colors.white, borderColor: colors.border, borderWidth: 1, borderRadius: 16, paddingVertical: 6, paddingHorizontal: 10, marginRight: 8, marginBottom: 8 },
  quickText: { color: colors.text, fontSize: 12 },
  banner: { backgroundColor: '#FEF3C7', padding: 8, borderRadius: 8, marginBottom: 8, borderWidth: 1, borderColor: colors.warning },
  bannerText: { color: '#92400E', textAlign: 'center', fontWeight: '600' },
});
