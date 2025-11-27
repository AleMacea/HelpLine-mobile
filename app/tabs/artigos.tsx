import { AppHeader } from '@/src/components/AppHeader';
import { postJson } from '@/src/services/api';
import { FaqArticle, getFaq, getPopularFaq } from '@/src/services/faq';
import { colors } from '@/src/theme';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useRouter } from 'expo-router';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { FlatList, Modal, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const formatDate = (value?: string) => {
  if (!value) return '';
  try {
    return new Date(value).toLocaleDateString('pt-BR');
  } catch {
    return value.slice(0, 10);
  }
};

const fallbackContentByCategory: Record<string, string> = {
  Rede:
    'Passos rápidos para voltar a navegar:\n' +
    '1) Confirme se o Wi-Fi ou cabo estão conectados e desative o modo avião.\n' +
    '2) Reinicie o roteador (se for home office) e o próprio dispositivo.\n' +
    '3) Esqueça a rede corporativa e reconecte com o usuário correto.\n' +
    '4) Desative VPN temporariamente e teste outra rede para comparação.\n' +
    '5) Se continuar sem internet, anote SSID, mensagem de erro e horário e abra um chamado.',
  Acesso:
    'Dicas para recuperar acesso:\n' +
    '1) Tente redefinir a senha pelo Ctrl+Alt+Del (Windows) conectado na rede ou VPN.\n' +
    '2) Siga a política: mínimo 8 caracteres com maiúsculas, minúsculas, número e símbolo.\n' +
    '3) Após alterar, bloqueie e desbloqueie a sessão para replicar no domínio.\n' +
    '4) Se a conta estiver bloqueada, aguarde 15 minutos e tente novamente.\n' +
    '5) Persistindo, registre um chamado com print do erro e horário da tentativa.',
  Software:
    'Para resolver lentidão ou travamentos:\n' +
    '1) Reinicie o equipamento e feche apps pesados no Gerenciador de Tarefas.\n' +
    '2) Verifique uso de CPU, memória e disco; encerre processos que estejam em 100%.\n' +
    '3) Desative inicialização de apps não essenciais e limpe arquivos temporários.\n' +
    '4) Conclua atualizações pendentes do Windows/antivírus e reinicie novamente.\n' +
    '5) Ainda lento? Anote hora, app afetado e prints e abra um chamado.',
  Hardware:
    'Checklist de impressão:\n' +
    '1) Verifique cabos, energia e se há papel/tinta.\n' +
    '2) Veja se a fila de impressão está pausada e limpe trabalhos travados.\n' +
    '3) Imprima uma página de teste; se falhar, reinstale ou atualize o driver.\n' +
    '4) Teste a mesma impressora em outro computador ou outra impressora no seu.\n' +
    '5) Para suporte, informe modelo, IP (se houver) e a mensagem de erro exibida.',
};

const buildArticleContent = (article?: FaqArticle | null) => {
  if (!article) return '';
  const base = article.content?.trim();
  if (base) return base;
  return fallbackContentByCategory[article.category] || 'Estamos atualizando este artigo. Envie detalhes do erro para que possamos ajudar.';
};

export default function ArtigosScreen() {
  const router = useRouter();
  const listRef = useRef<FlatList<FaqArticle>>(null);
  const [all, setAll] = useState<FaqArticle[]>([]);
  const [popular, setPopular] = useState<FaqArticle[]>([]);
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState<string | null>(null);
  const [selected, setSelected] = useState<FaqArticle | null>(null);

  const categories = useMemo(() => {
    const uniq = new Set(all.map((article) => article.category).filter(Boolean));
    return Array.from(uniq);
  }, [all]);

  const listKey = `${category || 'all'}-${(query || '').trim()}`;

  const chipItems = useMemo(
    () => [
      { label: 'Tudo', value: 'Tudo' },
      ...categories.map((cat) => ({ label: cat, value: cat })),
    ],
    [categories]
  );

  useEffect(() => {
    (async () => {
      setAll(await getFaq());
      setPopular(await getPopularFaq());
    })();
  }, []);

  const items = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return all.filter((article) => {
      const matchesCategory = !category || article.category === category;
      const contentText = buildArticleContent(article).toLowerCase();
      const matchesText =
        !needle ||
        article.title.toLowerCase().includes(needle) ||
        contentText.includes(needle) ||
        (article.tags || []).some((tag) => tag.toLowerCase().includes(needle));
      return matchesCategory && matchesText;
    });
  }, [all, query, category]);

  const handleCategoryPress = (value: string) => {
    setCategory(value === 'Tudo' ? null : value);
    setTimeout(() => {
      listRef.current?.scrollToOffset({ offset: 0, animated: false });
    }, 16);
  };

  const openChatWith = (context: string) => {
    setSelected(null);
    router.replace({ pathname: '/tabs/chatbot', params: { context } });
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      listRef.current?.scrollToOffset({ offset: 0, animated: false });
    }, 10);
    return () => clearTimeout(timer);
  }, [category, query]);

  const renderItem = ({ item }: { item: FaqArticle }) => (
    <TouchableOpacity style={styles.card} onPress={() => setSelected(item)} accessibilityRole="button">
      <Text style={styles.cardTitle}>{item.title}</Text>
      <Text style={styles.cardMeta}>
        {item.category}
        {item.lastUpdated ? ` - ${formatDate(item.lastUpdated)}` : ''}
      </Text>
    </TouchableOpacity>
  );

  const articleContent = buildArticleContent(selected);

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
      <AppHeader style={styles.appHeader} />
      <View style={styles.container}>
        <Text style={styles.screenTitle}>Artigos e FAQ</Text>

        {popular.length > 0 && (
          <View style={styles.popularSection}>
            <Text style={styles.sectionTitle}>Mais úteis</Text>
            <FlatList
              data={popular}
              keyExtractor={(item) => item.id + '-pop'}
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ paddingRight: 8 }}
              renderItem={({ item }) => (
                <TouchableOpacity style={styles.popCard} onPress={() => setSelected(item)}>
                  <Text style={styles.popTitle} numberOfLines={2}>{item.title}</Text>
                  <Text style={styles.cardMeta}>{item.category}</Text>
                </TouchableOpacity>
              )}
            />
          </View>
        )}

        <TextInput
          style={styles.search}
          placeholder="Busque por palavra-chave"
          placeholderTextColor={colors.textMuted}
          value={query}
          onChangeText={setQuery}
          returnKeyType="search"
        />

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.pillRow}
          style={{ flexGrow: 0 }}
        >
          {chipItems.map((item, index) => {
            const isActive = (category === null && item.value === 'Tudo') || item.value === category;
            return (
              <TouchableOpacity
                key={`${item.label}-${index}`}
                style={[
                  styles.pill,
                  isActive && styles.pillActive,
                  { marginRight: 10 },
                ]}
                onPress={() => handleCategoryPress(item.value)}
              >
                <Text style={[styles.pillText, isActive && styles.pillTextActive]}>{item.label}</Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        <View style={{ flex: 1 }}>
          <FlatList
            ref={listRef}
            key={listKey}
            data={items}
            keyExtractor={(item) => item.id}
            renderItem={renderItem}
            contentContainerStyle={styles.listContent}
            ListEmptyComponent={<Text style={styles.empty}>Nenhum artigo encontrado.</Text>}
          />
        </View>

        <Modal transparent animationType="slide" visible={!!selected} onRequestClose={() => setSelected(null)}>
          <View style={styles.modalOverlay}>
            <View style={styles.modalContainer}>
              <TouchableOpacity style={styles.modalClose} onPress={() => setSelected(null)} accessibilityLabel="Fechar artigo">
                <Ionicons name="close" size={18} color={colors.primary} />
              </TouchableOpacity>
              <ScrollView>
                <Text style={styles.modalTitle}>{selected?.title}</Text>
                <Text style={styles.modalMeta}>{selected?.category}</Text>
                <Text style={styles.modalContent}>{articleContent}</Text>
              </ScrollView>
              <View style={styles.modalButtons}>
                <TouchableOpacity
                  style={[styles.btn, { backgroundColor: colors.accent }]}
                  onPress={async () => {
                    try {
                      if (selected) await postJson(`/faq/${selected.id}/feedback`, { helpful: true });
                    } catch { }
                    setSelected(null);
                  }}
                >
                  <Text style={styles.btnText}>Ajudou</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.btn, { backgroundColor: colors.primary }]}
                  onPress={async () => {
                    const ctx = `Li o artigo: ${selected?.title}. Não resolveu meu problema.`;
                    try {
                      if (selected) await postJson(`/faq/${selected.id}/feedback`, { helpful: false });
                    } catch { }
                    openChatWith(ctx);
                  }}
                >
                  <Text style={styles.btnText}>Não resolveu</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.bg },
  appHeader: { paddingBottom: 0 },

  // Container e títulos
  container: {
    flex: 1,
    backgroundColor: colors.bg,
    paddingHorizontal: 16,
    paddingTop: 12,
  },
  screenTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: colors.primary,
    marginBottom: 12,
    textAlign: 'center',
  },

  // Seção "Mais úteis"
  popularSection: { marginBottom: 16 },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.textMuted,
    marginBottom: 8,
  },
  popCard: {
    backgroundColor: colors.card,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    width: 220,
    marginRight: 12,
  },
  popTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 4,
  },

  // Busca
  search: {
    backgroundColor: colors.white,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginBottom: 12,
  },

  // Filtros (pills)
  pillRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 0,
    marginBottom: 4,
    height: 34, // força altura ideal
  },

  pill: {
    backgroundColor: colors.white,
    paddingHorizontal: 12,
    paddingVertical: 3, // reduz a altura real do chip
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.border,
    justifyContent: 'center', // alinha o texto
    height: 30, // deixa retinho
  },

  pillActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },

  pillText: {
    color: colors.text,
    fontWeight: '600',
    fontSize: 13,
    lineHeight: 16, // importantíssimo para evitar altura extra
  },

  pillTextActive: {
    color: colors.white,
  },

  // Lista de artigos
  listContent: {
    paddingTop: 4,
    paddingBottom: 8,
  },
  empty: {
    textAlign: 'center',
    color: colors.textMuted,
    marginTop: 24,
  },
  card: {
    backgroundColor: colors.card,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: 12,
    padding: 14,
    marginBottom: 8,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
  },
  cardMeta: {
    fontSize: 12,
    color: colors.textMuted,
    marginTop: 4,
  },

  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
  },
  modalContainer: {
    backgroundColor: colors.card,
    margin: 16,
    padding: 16,
    borderRadius: 12,
    borderColor: colors.border,
    borderWidth: 1,
    maxHeight: '80%',
  },
  modalClose: {
    alignSelf: 'flex-end',
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#EEF2FF',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
  },
  modalMeta: {
    fontSize: 12,
    color: colors.textMuted,
    marginBottom: 8,
  },
  modalContent: {
    fontSize: 14,
    color: colors.text,
    lineHeight: 20,
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 12,
  },

  // Botões
  btn: {
    flex: 1,
    alignItems: 'center',
    padding: 12,
    borderRadius: 8,
  },
  btnText: {
    color: colors.white,
    fontWeight: 'bold',
  },
});
