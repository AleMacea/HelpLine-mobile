import { AppHeader } from '@/src/components/AppHeader';
import { getJson, postJson } from '@/src/services/api';
import { enviarParaChatGPT } from '@/src/services/chatgpt';
import { colors } from '@/src/theme';
import { useLocalSearchParams } from 'expo-router';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  GestureResponderEvent,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

type Sender = 'user' | 'bot' | 'analyst' | 'system';
type MessageMeta =
  | { kind: 'issue-options'; options: string[] }
  | { kind: 'prompt-choice'; promptId: string; options: string[] };
type Message = { id: string; sender: Sender; text: string; meta?: MessageMeta };

type TriageCategory = {
  id: 'hardware' | 'software' | 'rede' | 'acesso' | 'infra' | 'outros';
  label: string;
  description: string;
  ticketName: string;
};

type TriageCategoryId = TriageCategory['id'];

const TRIAGE_CATEGORIES: TriageCategory[] = [
  { id: 'hardware', label: 'Hardware', description: 'Computadores, impressoras e outros equipamentos.', ticketName: 'Hardware' },
  { id: 'software', label: 'Software', description: 'Aplicativos corporativos e sistemas internos.', ticketName: 'Software' },
  { id: 'rede', label: 'Rede', description: 'Wi-Fi, VPN, links e queda de conexao.', ticketName: 'Rede' },
  { id: 'acesso', label: 'Acesso/Security', description: 'Senhas, MFA, bloqueios e perfis.', ticketName: 'Acesso/Security' },
  { id: 'infra', label: 'Infraestrutura/Servicos', description: 'Servidores, banco de dados, cloud e backups.', ticketName: 'Sistema Operacional' },
  { id: 'outros', label: 'Outros', description: 'Quando nao encaixar nas opcoes acima.', ticketName: 'Outros' },
];

const FOLLOWUP_GUIDE: Record<TriageCategoryId | 'default', { title: string; steps: string[] }> = {
  hardware: {
    title: 'Vamos tentar mais algumas verificacoes rapidas:',
    steps: [
      'Desligue o equipamento totalmente e aguarde 30 segundos antes de ligar de novo.',
      'Teste outro cabo de energia ou tomada e confirme se ha ventilacao livre.',
      'Desconecte perifericos desnecessarios (HD externo, impressora etc.) para ver se algum deles causa travamento.',
    ],
  },
  software: {
    title: 'Algumas outras acoes que costumam ajudar:',
    steps: [
      'Feche o aplicativo e abra novamente apos limpar arquivos temporarios ou cache.',
      'Verifique se ha atualizacoes pendentes do sistema e do app.',
      'Teste o mesmo acesso em outro navegador ou maquina para comparar.',
    ],
  },
  rede: {
    title: 'Confirme estes pontos antes de encaminharmos:',
    steps: [
      'Alterne entre Wi-Fi e cabo para ver se algum deles funciona melhor.',
      'Reinicie modem/roteador novamente e aguarde 2 minutos antes de conectar.',
      'Confirme com outra pessoa da equipe se a rede esta ok para ela.',
    ],
  },
  acesso: {
    title: 'Mais alguns passos de acesso:',
    steps: [
      'Verifique se Caps Lock ou Num Lock estao ligados ao digitar a senha.',
      'Tente redefinir a senha pelo portal oficial e aguarde 5 minutos.',
      'Caso use MFA, confirme se o app/token esta sincronizado com o horario do celular.',
    ],
  },
  infra: {
    title: 'Antes de acionar o analista revise:',
    steps: [
      'Valide se outros servicos dependentes estao respondendo normalmente.',
      'Se possuir permissao, reinicie o servico especifico e observe os logs basicos.',
      'Anote o horario exato e qualquer codigo de erro apresentado.',
    ],
  },
  outros: {
    title: 'Vamos registrar mais alguns detalhes rapidos:',
    steps: [
      'Relembre o que mudou antes do problema (instalacao, atualizacao, queda de energia).',
      'Veja se acontece com outra pessoa ou dispositivo.',
      'Separe prints e horarios aproximados para anexarmos no chamado.',
    ],
  },
  default: {
    title: 'Revise estes pontos antes de escalarmos:',
    steps: [
      'Reinicie o equipamento ou servico afetado e aguarde 1 minuto antes de testar.',
      'Teste com outro cabo, navegador ou usuario para comparar.',
      'Separe prints ou mensagens de erro para enviar ao analista.',
    ],
  },
};

type TriagePrompt = {
  id: string;
  question: string;
  type: 'choice' | 'text';
  options?: string[];
  placeholder?: string;
};

type TriageFlow = {
  issues: string[];
  prompts: TriagePrompt[];
};

const TRIAGE_FLOWS: Record<TriageCategoryId, TriageFlow> = {
  hardware: {
    issues: [
      'Computador nao liga',
      'Equipamento lento ou travando',
      'Periferico (mouse/teclado/impressora) com falha',
      'Outro em hardware',
    ],
    prompts: [
      {
        id: 'hardware-equipamento',
        question: 'Qual equipamento voce esta usando?',
        type: 'choice',
        options: ['Notebook corporativo', 'Desktop', 'Impressora', 'Outro dispositivo'],
      },
      {
        id: 'hardware-erro',
        question: 'Aparece algum erro ou luz de alerta? Se sim, descreva.',
        type: 'text',
        placeholder: 'Ex.: Tela preta, bip, codigo de erro',
      },
      {
        id: 'hardware-acao',
        question: 'O que acontece quando voce liga ou tenta usar o equipamento?',
        type: 'text',
        placeholder: 'Ex.: Desliga sozinho, fica travado, nao responde...',
      },
    ],
  },
  software: {
    issues: [
      'Aplicativo nao abre',
      'Sistema lento ou travando',
      'Erro em funcionalidade especifica',
      'Outro em software',
    ],
    prompts: [
      {
        id: 'software-sistema',
        question: 'Qual sistema ou aplicativo esta com problema?',
        type: 'text',
        placeholder: 'Ex.: ERP, e-mail, navegador...',
      },
      {
        id: 'software-erro',
        question: 'Aparece alguma mensagem de erro? Digite exatamente o que ve na tela.',
        type: 'text',
        placeholder: 'Mensagem apresentada',
      },
      {
        id: 'software-acao',
        question: 'O que acontece quando voce tenta usar o recurso?',
        type: 'text',
        placeholder: 'Ex.: Fecha sozinho, fica carregando, nao salva...',
      },
    ],
  },
  rede: {
    issues: ['Sem internet', 'VPN nao conecta', 'Wi-Fi lento/caindo', 'Outro em rede'],
    prompts: [
      {
        id: 'rede-medio',
        question: 'Como voce esta conectado?',
        type: 'choice',
        options: ['Wi-Fi corporativo', 'Cabo de rede', '4G/Hotspot', 'Nao sei'],
      },
      {
        id: 'rede-impacto',
        question: 'Quantas pessoas sao impactadas?',
        type: 'choice',
        options: ['Somente eu', 'Minha equipe', 'Unidade inteira', 'Nao sei informar'],
      },
      {
        id: 'rede-comportamento',
        question: 'O que acontece quando tenta navegar ou conectar? Informe qualquer codigo.',
        type: 'text',
        placeholder: 'Ex.: Sem acesso a sites, VPN desconecta, sinal fraco...',
      },
    ],
  },
  acesso: {
    issues: ['Esqueci/minha senha venceu', 'Usuario bloqueado', 'Problema com MFA', 'Sem permissao'],
    prompts: [
      {
        id: 'acesso-sistema',
        question: 'Qual sistema voce tenta acessar?',
        type: 'text',
        placeholder: 'Ex.: E-mail, ERP, VPN...',
      },
      {
        id: 'acesso-erro',
        question: 'Qual mensagem aparece ao tentar fazer login?',
        type: 'text',
        placeholder: 'Mensagem ou codigo exibido',
      },
      {
        id: 'acesso-impacto',
        question: 'Esse bloqueio impede alguma atividade urgente? Conte rapidamente.',
        type: 'text',
      },
    ],
  },
  infra: {
    issues: ['Servidor fora do ar', 'Banco de dados lento', 'Backup falhou', 'Outro em infraestrutura'],
    prompts: [
      {
        id: 'infra-servico',
        question: 'Qual servico/servidor esta impactado?',
        type: 'text',
        placeholder: 'Nome ou endereco do servico',
      },
      {
        id: 'infra-impacto',
        question: 'Qual o impacto percebido pelos usuarios ou sistemas?',
        type: 'text',
        placeholder: 'Sem acesso, lentidao, integracao parada...',
      },
      {
        id: 'infra-inicio',
        question: 'Quando o problema comecou e algo mudou antes disso?',
        type: 'text',
        placeholder: 'Ex.: desde ontem 14h, apos atualizacao...',
      },
    ],
  },
  outros: {
    issues: ['Duvida geral', 'Solicitacao de melhoria', 'Suporte presencial', 'Outro assunto'],
    prompts: [
      {
        id: 'outros-contexto',
        question: 'Resuma o contexto do que precisa ou do incidente.',
        type: 'text',
      },
      {
        id: 'outros-impacto',
        question: 'Existe algum impacto ou urgencia associada? Descreva.',
        type: 'text',
      },
    ],
  },
};

const formatPromptText = (prompt: TriagePrompt) => {
  if (prompt.type === 'choice' && prompt.options?.length) {
    return `${prompt.question}\nEscolha uma das opcoes abaixo.`;
  }
  return prompt.question;
};

const buildTriageSummaryLines = (flow: TriageFlow | null, issue: string | null, answers: Record<string, string>) => {
  if (!issue) return [] as string[];
  const lines: string[] = [`Problema informado: ${issue}`];
  (flow?.prompts ?? []).forEach((prompt) => {
    const answer = answers[prompt.id];
    if (answer) {
      lines.push(`${prompt.question}: ${answer}`);
    }
  });
  return lines;
};

const followUpMessageFor = (category: TriageCategoryId | null) => {
  const guide = FOLLOWUP_GUIDE[category ?? 'default'];
  const steps = guide.steps.map((step, index) => `${index + 1}. ${step}`).join('\n');
  return `${guide.title}\n${steps}`;
};
const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
const newMessageId = () => `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

export default function ChatbotScreen() {
  const params = useLocalSearchParams<{ context?: string }>();

  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'w1',
      sender: 'bot',
      text:
        'Bem-vindo ao chat da HelpLine! Este canal faz a triagem inicial. Suas informacoes serao tratadas conforme a LGPD (Lei 13.709/2018). Ao continuar, voce concorda com o uso dos dados para atendimento tecnico.',
    },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [accepted, setAccepted] = useState(false);
  const [pendingFbForId, setPendingFbForId] = useState<string | null>(null);
  const [escalated, setEscalated] = useState(false);
  const [lastUserText, setLastUserText] = useState('');
  const [triageCategory, setTriageCategory] = useState<TriageCategoryId | null>(null);
  const [playbookSent, setPlaybookSent] = useState(false);
  const [keyboardVisible, setKeyboardVisible] = useState(false);
  const [inputFocused, setInputFocused] = useState(false);
  const [triageIssue, setTriageIssue] = useState<string | null>(null);
  const [triageAnswers, setTriageAnswers] = useState<Record<string, string>>({});
  const [triageStepIndex, setTriageStepIndex] = useState(0);
  const [triageComplete, setTriageComplete] = useState(false);
  const [showContextDetails, setShowContextDetails] = useState(false);

  const chatScrollRef = useRef<ScrollView>(null);

  useEffect(() => {
    chatScrollRef.current?.scrollToEnd({ animated: true });
  }, [messages]);

  useEffect(() => {
    const ctx = (params?.context || '').toString().trim();
    if (!ctx) return;
    const seeded: Message = { id: newMessageId(), sender: 'user', text: ctx };
    setMessages((prev) => [...prev, seeded]);
    setAccepted(true);
    setInput('');
    setTimeout(() => handleProcess(ctx, seeded.id), 10);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const defaultQuickReplies = useMemo(
    () => ['Rede fora do ar', 'Senha ou acesso', 'Sistema travando', 'Ajuda com hardware'],
    [],
  );

  const triageOptions = useMemo(() => TRIAGE_CATEGORIES, []);

  const selectedCategory = useMemo(
    () => triageOptions.find((cat) => cat.id === triageCategory) || null,
    [triageCategory, triageOptions],
  );

  const triageFlow = useMemo(() => (triageCategory ? TRIAGE_FLOWS[triageCategory] : null), [triageCategory]);

  const currentPrompt = useMemo(() => {
    if (!triageFlow || !triageIssue) return null;
    return triageFlow.prompts[triageStepIndex] ?? null;
  }, [triageFlow, triageIssue, triageStepIndex]);

  const triageSummaryLines = useMemo(
    () => buildTriageSummaryLines(triageFlow, triageIssue, triageAnswers),
    [triageFlow, triageIssue, triageAnswers],
  );

  const quickReplies = useMemo(
    () => (triageCategory && triageComplete ? defaultQuickReplies : []),
    [defaultQuickReplies, triageCategory, triageComplete],
  );

  const inputPlaceholder = useMemo(() => {
    if (!accepted) return 'Confirme a LGPD para iniciar o atendimento';
    if (!triageCategory) return 'Selecione uma categoria para continuar';
    if (!triageIssue) return 'Escolha um problema listado acima';
    if (currentPrompt && !triageComplete) {
      return currentPrompt.placeholder ?? currentPrompt.question;
    }
    return 'Digite sua mensagem...';
  }, [accepted, triageCategory, triageIssue, currentPrompt, triageComplete]);

  const showHeroBanner = !accepted || !triageCategory;

  useEffect(() => {
    const show = Keyboard.addListener('keyboardDidShow', () => setKeyboardVisible(true));
    const hide = Keyboard.addListener('keyboardDidHide', () => setKeyboardVisible(false));
    return () => {
      show.remove();
      hide.remove();
    };
  }, []);

  useEffect(() => {
    if (!keyboardVisible) return;
    const timer = setTimeout(() => {
      chatScrollRef.current?.scrollToEnd({ animated: true });
    }, 60);
    return () => clearTimeout(timer);
  }, [keyboardVisible]);

  useEffect(() => {
    if (!triageIssue) {
      setShowContextDetails(false);
    }
  }, [triageIssue]);

  const handleContainerPress = (event: GestureResponderEvent) => {
    if (inputFocused) return;
    Keyboard.dismiss();
  };

  const TypingIndicator = () => {
    const dotOne = useRef(new Animated.Value(0.2)).current;
    const dotTwo = useRef(new Animated.Value(0.2)).current;
    const dotThree = useRef(new Animated.Value(0.2)).current;

    useEffect(() => {
      const loops = [dotOne, dotTwo, dotThree].map((dot, index) =>
        Animated.loop(
          Animated.sequence([
            Animated.delay(index * 140),
            Animated.timing(dot, { toValue: 1, duration: 240, useNativeDriver: true }),
            Animated.timing(dot, { toValue: 0.2, duration: 240, useNativeDriver: true }),
          ]),
        ),
      );
      loops.forEach((loop) => loop.start());
      return () => loops.forEach((loop) => loop.stop());
    }, [dotOne, dotTwo, dotThree]);

    return (
      <View style={styles.typingBubble}>
        <View style={styles.typingSpinner}>
          <ActivityIndicator size="small" color="#6B21A8" />
        </View>
        <Text style={styles.typingLabel}>Chat esta digitando</Text>
        <View style={styles.typingDots}>
          {[dotOne, dotTwo, dotThree].map((dot, index) => (
            <Animated.View key={index} style={[styles.typingDot, { opacity: dot }]} />
          ))}
        </View>
      </View>
    );
  };

  const promptIssueSelection = (flow: TriageFlow, customText?: string) => {
    if (!flow.issues.length) return;
    const issueMessage: Message = {
      id: newMessageId(),
      sender: 'bot',
      text: customText ?? 'Qual opcao representa melhor o problema? Toque para selecionar e seguir com algumas perguntas.',
      meta: { kind: 'issue-options', options: flow.issues },
    };
    setMessages((prev) => [...prev, issueMessage]);
  };

  const askPrompt = (prompt: TriagePrompt) => {
    const promptMessage: Message = {
      id: newMessageId(),
      sender: 'bot',
      text: formatPromptText(prompt),
    };
    if (prompt.type === 'choice' && prompt.options?.length) {
      promptMessage.meta = { kind: 'prompt-choice', promptId: prompt.id, options: prompt.options };
    }
    setMessages((prev) => [...prev, promptMessage]);
  };

  const finalizeStructuredTriage = (flow: TriageFlow | null, answersSnapshot: Record<string, string>, issueOverride?: string) => {
    if (!triageCategory) return;
    const issue = issueOverride ?? triageIssue;
    if (!issue || triageComplete || !selectedCategory) return;
    setTriageComplete(true);
    setPlaybookSent(true);
    const guidanceText = followUpMessageFor(triageCategory);
    const closingId = newMessageId();
    const closingText = 'Caso precise complementar com prints ou passos realizados, escreva aqui. Se precisar de ajuda humana, toque em "Falar com um analista".';
    setMessages((prev) => [
      ...prev,
      { id: newMessageId(), sender: 'bot', text: guidanceText },
      { id: closingId, sender: 'bot', text: closingText },
    ]);
    setPendingFbForId(closingId);
  };

  const handlePromptChoiceSelect = (promptId: string, option: string) => {
    if (!triageCategory || !triageIssue || triageComplete) return;
    if (!currentPrompt || currentPrompt.id !== promptId) return;
    const flow = TRIAGE_FLOWS[triageCategory];
    const promptExists = flow.prompts.some((p) => p.id === promptId);
    if (!promptExists) return;
    const ack: Message = { id: newMessageId(), sender: 'user', text: option };
    setMessages((prev) => [...prev, ack]);
    handlePromptAnswer(option);
  };

  const restartTriageFlow = () => {
    if (!triageCategory) return;
    const flow = TRIAGE_FLOWS[triageCategory];
    setTriageIssue(null);
    setTriageAnswers({});
    setTriageStepIndex(0);
    setTriageComplete(false);
    setPendingFbForId(null);
    setPlaybookSent(false);
    promptIssueSelection(flow, 'Sem problemas, escolha novamente a opcao que melhor representa a situacao:');
    setShowContextDetails(false);
  };

  function handleResetCategory() {
    if (!triageCategory) return;
    setTriageCategory(null);
    setTriageIssue(null);
    setTriageAnswers({});
    setTriageStepIndex(0);
    setTriageComplete(false);
    setPendingFbForId(null);
    setPlaybookSent(false);
    setShowContextDetails(false);
    setMessages((prev) => [
      ...prev,
      { id: newMessageId(), sender: 'bot', text: 'Tudo certo! Escolha uma nova categoria para continuarmos.' },
    ]);
  }

  const handleOptionSelect = (meta: MessageMeta, option: string) => {
    if (meta.kind === 'issue-options') {
      handleIssueSelect(option);
      return;
    }
    if (meta.kind === 'prompt-choice') {
      handlePromptChoiceSelect(meta.promptId, option);
    }
  };

  function handleIssueSelect(issue: string) {
    if (!triageCategory) return;
    const flow = TRIAGE_FLOWS[triageCategory];
    setTriageIssue(issue);
    setTriageAnswers({});
    setTriageStepIndex(0);
    setTriageComplete(false);
    setPendingFbForId(null);
    setPlaybookSent(false);
    const ack: Message = { id: newMessageId(), sender: 'user', text: 'Problema selecionado: ' + issue };
    const botIntro: Message = {
      id: newMessageId(),
      sender: 'bot',
      text: flow.prompts.length
        ? 'Entendido. Vou fazer algumas perguntas rapidas para coletar informacoes essenciais:'
        : 'Entendido. Vou registrar esse problema e ja envio orientacoes basicas.',
    };
    setMessages((prev) => [...prev, ack, botIntro]);
    if (flow.prompts.length) {
      askPrompt(flow.prompts[0]);
    } else {
      finalizeStructuredTriage(flow, {}, issue);
    }
  }

  function handlePromptAnswer(answer: string) {
    if (!triageCategory || !triageIssue) return;
    const flow = TRIAGE_FLOWS[triageCategory];
    const prompt = flow.prompts[triageStepIndex];
    if (!prompt) return;
    const nextIndex = triageStepIndex + 1;
    const nextPrompt = flow.prompts[nextIndex];
    setTriageAnswers((prev) => {
      const updated = { ...prev, [prompt.id]: answer };
      if (!nextPrompt) {
        finalizeStructuredTriage(flow, updated);
      }
      return updated;
    });
    setTriageStepIndex(nextIndex);
    if (nextPrompt) {
      askPrompt(nextPrompt);
    }
  }

  const classify = (t: string) => {
    if (selectedCategory) return selectedCategory.ticketName;
    const s = t.toLowerCase();
    if (s.includes('impressora') || s.includes('monitor') || s.includes('teclado')) return 'Hardware';
    if (s.includes('wi-fi') || s.includes('rede') || s.includes('vpn')) return 'Rede';
    if (s.includes('windows') || s.includes('linux') || s.includes('sistema operacional')) return 'Sistema Operacional';
    if (s.includes('senha') || s.includes('acesso') || s.includes('login')) return 'Acesso/Security';
    if (s.includes('sistema') || s.includes('aplicativo') || s.includes('software')) return 'Software';
    return 'Outros';
  };

  const levelFor = (cat: string) =>
    cat === 'Hardware' || cat === 'Rede' ? 'N2' : cat === 'Software' || cat === 'Sistema Operacional' ? 'N3' : 'N1';

  async function handleProcess(userText: string, originId: string) {
    setLastUserText(userText);

    if (!playbookSent && selectedCategory) {
      const guidanceText = followUpMessageFor(selectedCategory.id);
      const guidance: Message = { id: newMessageId(), sender: 'bot', text: guidanceText };
      setPlaybookSent(true);
      setPendingFbForId(guidance.id);
      setMessages((prev) => [...prev, guidance]);
      return;
    }

    setLoading(true);
    setIsTyping(true);
    const startedAt = Date.now();
    try {
      const conversation = [...messages, { id: originId, sender: 'user', text: userText }];
      if (selectedCategory) {
        conversation.unshift({ id: 'context', sender: 'system', text: 'Categoria selecionada pelo usuario: ' + selectedCategory.label });
      }
      if (triageSummaryLines.length) {
        conversation.unshift({
          id: 'triage',
          sender: 'system',
          text: 'Resumo estruturado:\n' + triageSummaryLines.map((line) => `- ${line}`).join('\n'),
        });
      }
      const ans = await enviarParaChatGPT(
        conversation.map((m) => ({
          role: m.sender === 'user' ? 'user' : m.sender === 'system' ? 'system' : 'assistant',
          content: m.text,
        })),
      );
      const bot: Message = { id: newMessageId(), sender: 'bot', text: ans || 'Certo! Me conte um pouco mais...' };
      const elapsed = Date.now() - startedAt;
      const simulated = Math.max(700, Math.min(2200, bot.text.length * 18));
      if (elapsed < simulated) await sleep(simulated - elapsed);
      setPendingFbForId(bot.id);
      setMessages((prev) => [...prev, bot]);
    } catch {
      setMessages((prev) => [
        ...prev,
        { id: newMessageId(), sender: 'bot', text: 'Falha momentanea. Tente novamente em instantes.' },
      ]);
    } finally {
      setLoading(false);
      setTimeout(() => setIsTyping(false), 150);
    }
  }

  async function handleSend() {
    const t = input.trim();
    if (!t || loading || !accepted || !triageCategory) return;
    const m: Message = { id: newMessageId(), sender: 'user', text: t };
    setMessages((prev) => [...prev, m]);
    setInput('');

    if (!triageIssue) {
      setMessages((prev) => [
        ...prev,
        { id: newMessageId(), sender: 'bot', text: 'Selecione um dos problemas listados acima para continuar a triagem.' },
      ]);
      return;
    }

    if (currentPrompt && !triageComplete) {
      handlePromptAnswer(t);
      return;
    }

    await handleProcess(t, m.id);
  }

  function handleAccept() {
    if (accepted) return;
    setAccepted(true);
    const confirm: Message = {
      id: newMessageId(),
      sender: 'user',
      text: 'Concordo com os termos de tratamento de dados (LGPD) para suporte tecnico.',
    };
    setMessages((prev) => [...prev, confirm]);
  }

  function handleCategorySelect(categoryId: TriageCategoryId) {
    const choice = triageOptions.find((c) => c.id === categoryId);
    if (!choice) return;
    setTriageCategory(categoryId);
    setPlaybookSent(false);
    setPendingFbForId(null);
    setTriageIssue(null);
    setTriageAnswers({});
    setTriageStepIndex(0);
    setTriageComplete(false);
    setShowContextDetails(false);
    const userAck: Message = {
      id: newMessageId(),
      sender: 'user',
      text: 'Categoria escolhida: ' + choice.label,
    };
    const botAck: Message = {
      id: newMessageId(),
      sender: 'bot',
      text: 'Perfeito, vamos tratar ' + choice.label + '. Escolha abaixo o tipo de problema e responda as perguntas rapidas para direcionarmos melhor.',
    };
    setMessages((prev) => [...prev, userAck, botAck]);
    const flow = TRIAGE_FLOWS[categoryId];
    promptIssueSelection(flow);
  }

  async function escalate() {
    if (escalated) return;
    setLoading(true);
    try {
      const categoria = classify(lastUserText);
      const nivel = levelFor(categoria);
      const categoryId: Record<string, number> = {
        Hardware: 1,
        Software: 2,
        Rede: 3,
        'Sistema Operacional': 4,
        'Acesso/Security': 5,
        Outros: 6,
      };
      const levelId: Record<string, number> = { N1: 1, N2: 2, N3: 3 };
      const priorityId: Record<string, number> = { Baixa: 1, Media: 2, Alta: 3, Critica: 4 };

      const me = await getJson<{ userId: string; name: string; email: string; roles: string[] }>('/auth/me');
      const requesterId = me.userId;
      const title = (lastUserText || 'Solicitacao de suporte').slice(0, 120);
      const history = messages.map((m) => m.sender + ': ' + m.text).join('\n').slice(0, 8000);
      const description = 'Resumo da conversa com o bot:\n' + history;

      const created: any = await postJson('/tickets', {
        requesterId,
        title,
        description,
        categoryId: categoryId[categoria] ?? 6,
        levelId: levelId[nivel] ?? 1,
        priorityId: priorityId.Alta,
        assigneeId: null,
        initialStatusId: null,
        origin: 'mobile',
      });
      const newTicketId = created.ticketId ?? created.TicketId;
      const protocol = created.protocol ?? created.Protocol;
      setEscalated(true);

      try {
        if (lastUserText) {
          await postJson(`/tickets/${newTicketId}/messages`, {
            senderType: 'user',
            senderUserId: requesterId,
            content: lastUserText,
          });
        }
        await postJson(`/tickets/${newTicketId}/messages`, {
          senderType: 'sistema',
          senderUserId: null,
          content: 'Encaminhado. Categoria: ' + categoria + '. Protocolo: ' + protocol + '.',
        });
        await postJson(`/tickets/${newTicketId}/messages`, {
          senderType: 'sistema',
          senderUserId: null,
          content: 'Historico:\n' + history,
        });
      } catch {
        // ignore optional sync issues
      }

      setMessages((prev) => [
        ...prev,
        {
          id: newMessageId(),
          sender: 'system',
          text: 'Chamado encaminhado. Categoria: ' + categoria + '. Protocolo: ' + protocol + '. Aguarde atendimento aqui.',
        },
      ]);
    } catch {
      const pseudo = 'HL-' + Date.now();
      setEscalated(true);
      setMessages((prev) => [
        ...prev,
        { id: newMessageId(), sender: 'system', text: 'Chamado encaminhado. Protocolo provisorio: ' + pseudo + '.' },
      ]);
    } finally {
      setLoading(false);
    }
  }

  function handleEscalationRequest() {
    setPendingFbForId(null);
    escalate();
  }

  const renderMessageContent = (item: Message) => {
    const baseTextStyle = [styles.messageText, item.sender === 'user' ? styles.userText : styles.botText];
    if (item.meta?.kind === 'issue-options') {
      return (
        <View style={styles.optionWrapper}>
          <Text style={[styles.messageText, styles.botText]}>{item.text}</Text>
          <View style={styles.optionList}>
            {item.meta.options.map((option) => {
              const selected = triageIssue === option;
              return (
                <TouchableOpacity
                  key={option}
                  style={[styles.optionButton, selected && styles.optionButtonSelected]}
                  onPress={() => handleOptionSelect(item.meta as MessageMeta, option)}
                  accessibilityRole="button"
                >
                  <Text style={[styles.optionLabel, selected && styles.optionLabelSelected]}>{option}</Text>
                  <Text style={styles.optionHint}>{selected ? 'Selecionado' : 'Toque para selecionar'}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>
      );
    }

    if (item.meta?.kind === 'prompt-choice') {
      const answered = triageAnswers[item.meta.promptId];
      const isCurrent = currentPrompt?.id === item.meta.promptId && !triageComplete;
      return (
        <View style={styles.optionWrapper}>
          <Text style={[styles.messageText, styles.botText]}>{item.text}</Text>
          <View style={styles.optionList}>
            {item.meta.options.map((option) => {
              const selected = answered === option;
              const disabled = !!answered || !isCurrent;
              return (
                <TouchableOpacity
                  key={option}
                  style={[
                    styles.optionButton,
                    selected && styles.optionButtonSelected,
                    disabled && styles.optionButtonDisabled,
                  ]}
                  disabled={disabled}
                  onPress={() => handleOptionSelect(item.meta as MessageMeta, option)}
                  accessibilityRole="button"
                >
                  <Text style={[styles.optionLabel, selected && styles.optionLabelSelected]}>{option}</Text>
                  <Text style={styles.optionHint}>
                    {selected ? 'Resposta registrada' : disabled ? 'Aguarde a proxima pergunta' : 'Toque para responder'}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>
      );
    }

    if (item.sender !== 'bot') {
      return <Text style={baseTextStyle}>{item.text}</Text>;
    }
    const lines = item.text
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean);
    if (lines.length <= 1) {
      return <Text style={[styles.messageText, styles.botText]}>{item.text}</Text>;
    }
    return (
      <View style={styles.botList}>
        {lines.map((line, index) => (
          <View key={`${item.id}-${index}`} style={styles.botListItem}>
            <Text style={styles.botBullet}>-</Text>
            <Text style={[styles.messageText, styles.botText]}>{line}</Text>
          </View>
        ))}
      </View>
    );
  };

  const renderMessage = (item: Message) => (
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
      {renderMessageContent(item)}

      {pendingFbForId === item.id && !escalated && (
        <View style={styles.feedbackRow}>
          <TouchableOpacity style={[styles.fbBtn, styles.fbNo]} onPress={handleEscalationRequest}>
            <Text style={styles.fbText}>Falar com um analista</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );

  return (
    <Pressable onPress={handleContainerPress} style={styles.dismissArea} accessible={false}>
      <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
        <AppHeader style={styles.header} />
        <KeyboardAvoidingView
          style={styles.container}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 24 : 0}
        >
          {showHeroBanner && (
            <View style={styles.heroSection}>
              <View style={styles.botBanner}>
                <Text style={styles.botBannerLabel}>Chat - Atendimento virtual</Text>
                <Text style={styles.botBannerTitle}>Tudo pronto para ajudar</Text>
                <Text style={styles.botBannerSubtitle}>Respondo em segundos e encaminho para analistas quando preciso.</Text>
              </View>
            </View>
          )}

          {accepted && !triageCategory && (
            <View style={styles.instructions}>
              <Text style={styles.instructionsText}>
                Obrigado! Escolha uma categoria abaixo para direcionar a triagem e depois conte os detalhes.
              </Text>
            </View>
          )}

          {accepted && triageCategory && selectedCategory && (
            <View style={styles.contextCard}>
              <View style={styles.contextRow}>
                <View style={styles.contextColumn}>
                  <Text style={styles.contextLabel}>Categoria</Text>
                  <Text style={styles.contextValue}>{selectedCategory.label}</Text>
                </View>
                {triageIssue ? (
                  <View style={styles.contextColumn}>
                    <Text style={styles.contextLabel}>Problema</Text>
                    <Text style={styles.contextValue} numberOfLines={1}>
                      {triageIssue}
                    </Text>
                  </View>
                ) : null}
              </View>
              {triageIssue ? (
                <TouchableOpacity
                  onPress={() => setShowContextDetails((prev) => !prev)}
                  style={styles.contextToggle}
                  accessibilityRole="button"
                >
                  <Text style={styles.contextToggleText}>
                    {showContextDetails ? 'Ocultar detalhes' : 'Ver detalhes'}
                  </Text>
                </TouchableOpacity>
              ) : null}
              {triageIssue && showContextDetails && (
                <View style={styles.contextDetails}>
                  {triageSummaryLines.map((line, index) => (
                    <Text key={`${line}-${index}`} style={styles.contextDetailText}>
                      {line}
                    </Text>
                  ))}
                </View>
              )}
              <Text style={styles.contextPrompt}>
                {triageIssue
                  ? !triageComplete && currentPrompt
                    ? 'Pergunta atual: ' + currentPrompt.question
                    : 'Triagem concluida. Continue comigo aqui no chat.'
                  : 'Selecione um problema abaixo para direcionar os passos.'}
              </Text>
              <View style={styles.contextActions}>
                {triageIssue ? (
                  <TouchableOpacity style={styles.contextActionBtn} onPress={restartTriageFlow} accessibilityRole="button">
                    <Text style={styles.contextActionText}>Trocar problema</Text>
                  </TouchableOpacity>
                ) : null}
                <TouchableOpacity
                  style={[styles.contextActionBtn, styles.contextActionSecondary]}
                  onPress={handleResetCategory}
                  accessibilityRole="button"
                >
                  <Text style={[styles.contextActionText, styles.contextActionTextSecondary]}>Trocar categoria</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}

          {accepted && !triageCategory && (
            <View style={styles.triageBox}>
              <Text style={styles.triageTitle}>Escolha o tipo de problema:</Text>
              <ScrollView style={styles.triageList} contentContainerStyle={styles.triageListContent} nestedScrollEnabled>
                {triageOptions.map((option, index) => (
                  <TouchableOpacity
                    key={option.id}
                    style={[styles.categoryCard, triageCategory === option.id && styles.categoryCardSelected]}
                    onPress={() => handleCategorySelect(option.id)}
                  >
                    <View style={styles.categoryBadge}>
                      <Text style={styles.categoryBadgeText}>{index + 1}</Text>
                    </View>
                    <View style={styles.categoryTexts}>
                      <Text style={styles.categoryLabel}>{option.label}</Text>
                      <Text style={styles.categoryDescription}>{option.description}</Text>
                    </View>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          )}

          <ScrollView
            ref={chatScrollRef}
            style={styles.chatList}
            contentContainerStyle={styles.chat}
            keyboardShouldPersistTaps="always"
            keyboardDismissMode="interactive"
            showsVerticalScrollIndicator={false}
          >
            {messages.map((item) => (
              <React.Fragment key={item.id}>{renderMessage(item)}</React.Fragment>
            ))}
            {isTyping && !escalated ? <TypingIndicator /> : null}
          </ScrollView>

          {!accepted && (
            <View style={styles.lgpdBox}>
              <Text style={styles.lgpdText}>
                Para continuar, confirme que aceita o uso dos dados conforme a LGPD (Lei 13.709/2018).
              </Text>
              <TouchableOpacity style={styles.lgpdButton} onPress={handleAccept} accessibilityRole="button">
                <Text style={styles.lgpdButtonText}>Aceitar e continuar</Text>
              </TouchableOpacity>
            </View>
          )}

          {!escalated && accepted && triageCategory && !keyboardVisible && !pendingFbForId && quickReplies.length > 0 && (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={styles.quickRow}
              contentContainerStyle={styles.quickContent}
            >
              {quickReplies.map((q) => (
                <TouchableOpacity key={q} style={styles.quickChip} onPress={() => setInput(q)}>
                  <Text style={styles.quickText}>{q}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          )}

          <View style={styles.inputRow}>
            <TextInput
              style={styles.input}
              placeholder={inputPlaceholder}
              placeholderTextColor="#9CA3AF"
              value={input}
              onChangeText={setInput}
              editable={!loading && accepted && !!triageCategory}
              returnKeyType="send"
              blurOnSubmit={false}
              onSubmitEditing={handleSend}
              onFocus={() => setInputFocused(true)}
              onBlur={() => setInputFocused(false)}
            />
            <TouchableOpacity
              style={[styles.sendBtn, (!accepted || !triageCategory) && styles.sendBtnDisabled]}
              onPress={handleSend}
              disabled={loading || !accepted || !triageCategory}
              accessibilityRole="button"
              accessibilityLabel="Enviar mensagem"
            >
              <Text style={styles.sendText}>{loading ? '...' : 'Enviar'}</Text>
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  dismissArea: { flex: 1 },
  safeArea: { flex: 1, backgroundColor: colors.bg },
  header: { paddingBottom: 0 },
  container: { flex: 1, backgroundColor: colors.bg, padding: 16 },
  heroSection: { marginBottom: 12 },
  botBanner: { backgroundColor: '#1D0E6F', borderRadius: 16, paddingHorizontal: 16, paddingVertical: 14 },
  botBannerLabel: { color: '#E0E7FF', fontSize: 12, fontWeight: '700' },
  botBannerTitle: { color: '#F59E0B', fontSize: 22, fontWeight: '700', marginTop: 2 },
  botBannerSubtitle: { color: '#E0E7FF', fontSize: 13, marginTop: 4 },
  lgpdBox: { backgroundColor: '#E5E7EB', borderRadius: 12, padding: 14, marginBottom: 12 },
  lgpdText: { color: colors.text, fontSize: 14, marginBottom: 8 },
  lgpdButton: { backgroundColor: '#1D0E6F', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20 },
  lgpdButtonText: { color: '#FFFFFF', fontWeight: '600' },
  instructions: { backgroundColor: '#EEF2FF', borderRadius: 10, padding: 12, marginBottom: 12 },
  instructionsText: { color: '#312E81', fontSize: 14 },
  contextCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    marginBottom: 12,
    gap: 10,
  },
  contextRow: { flexDirection: 'row', gap: 16 },
  contextColumn: { flex: 1 },
  contextLabel: { fontSize: 12, fontWeight: '600', color: '#6B7280', textTransform: 'uppercase' },
  contextValue: { fontSize: 15, fontWeight: '700', color: colors.text, marginTop: 2 },
  contextPrompt: { color: '#4338CA', fontSize: 13 },
  contextActions: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  contextActionBtn: {
    backgroundColor: '#4338CA',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
  },
  contextActionText: { color: '#fff', fontSize: 12, fontWeight: '600' },
  contextActionSecondary: { backgroundColor: '#E0E7FF' },
  contextActionTextSecondary: { color: '#3730A3' },
  contextToggle: { alignSelf: 'flex-start' },
  contextToggleText: { color: '#4338CA', fontWeight: '600', fontSize: 12 },
  contextDetails: { gap: 6 },
  contextDetailText: { color: '#312E81', fontSize: 13 },
  triageBox: {
    backgroundColor: '#F8FAFC',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 10,
    marginBottom: 16,
  },
  triageTitle: { color: colors.text, fontWeight: '700', fontSize: 14 },
  triageList: { maxHeight: 320 },
  triageListContent: { gap: 10, paddingBottom: 4 },
  optionWrapper: { gap: 10 },
  optionList: { gap: 8 },
  optionButton: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 12,
    backgroundColor: colors.white,
  },
  optionButtonSelected: { borderColor: colors.primary, backgroundColor: '#EEF2FF' },
  optionButtonDisabled: { opacity: 0.6 },
  optionLabel: { fontWeight: '600', color: colors.text, fontSize: 15 },
  optionLabelSelected: { color: colors.primary },
  optionHint: { color: '#6B7280', fontSize: 12, marginTop: 2 },
  categoryCard: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 12,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 12,
  },
  categoryCardSelected: { borderColor: colors.info, backgroundColor: '#EFF6FF' },
  categoryBadge: { width: 28, height: 28, borderRadius: 14, backgroundColor: '#E0E7FF', alignItems: 'center', justifyContent: 'center' },
  categoryBadgeText: { color: '#312E81', fontWeight: '700' },
  categoryTexts: { flex: 1 },
  categoryLabel: { color: colors.text, fontWeight: '700' },
  categoryDescription: { color: colors.textMuted, fontSize: 12, marginTop: 2 },
  chatList: { flex: 1 },
  chat: { paddingBottom: 16, paddingTop: 4, flexGrow: 1 },
  message: { padding: 12, borderRadius: 8, marginBottom: 10, maxWidth: '80%' },
  userMessage: { backgroundColor: colors.info, alignSelf: 'flex-end' },
  botMessage: { backgroundColor: '#E5E7EB', alignSelf: 'flex-start' },
  analystMessage: { backgroundColor: '#D1FAE5', alignSelf: 'flex-start', borderWidth: 1, borderColor: '#34D399' },
  systemMessage: { backgroundColor: '#F3F4F6', alignSelf: 'center', borderWidth: 1, borderColor: colors.border },
  messageText: { fontSize: 16 },
  userText: { color: colors.white },
  botText: { color: colors.text },
  inputRow: {
    flexDirection: 'row',
    padding: 12,
    borderTopWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.white,
    alignItems: 'center',
    gap: 8,
  },
  input: { flex: 1, backgroundColor: '#F9FAFB', padding: 10, borderRadius: 8, borderWidth: 1, borderColor: colors.border },
  sendBtn: {
    backgroundColor: colors.accent,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    justifyContent: 'center',
  },
  sendBtnDisabled: { opacity: 0.5 },
  sendText: { color: colors.white, fontWeight: 'bold' },
  feedbackRow: { flexDirection: 'row', marginTop: 8 },
  fbBtn: { paddingVertical: 8, paddingHorizontal: 12, borderRadius: 6, marginRight: 8 },
  fbOk: { backgroundColor: colors.accent },
  fbNo: { backgroundColor: '#F87171' },
  fbText: { color: colors.white, fontWeight: '600' },
  typingBubble: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E0E7FF',
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 8,
    alignSelf: 'flex-start',
    gap: 8,
    marginBottom: 8,
  },
  typingSpinner: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  typingLabel: { color: '#312E81', fontWeight: '600', fontSize: 12 },
  typingDots: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  typingDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#4C1D95' },
  quickRow: { marginBottom: 6, maxHeight: 44 },
  quickContent: { paddingRight: 12, alignItems: 'center' },
  quickChip: {
    backgroundColor: colors.white,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: 14,
    paddingVertical: 4,
    paddingHorizontal: 10,
    marginRight: 8,
  },
  quickText: { color: colors.text, fontSize: 12 },
  botList: { gap: 4 },
  botListItem: { flexDirection: 'row', alignItems: 'flex-start', gap: 6 },
  botBullet: { color: colors.textMuted, fontSize: 12, lineHeight: 18 },
});




