import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, FlatList, Modal, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';

import { colors } from '@/src/theme';
import { AppHeader } from '@/src/components/AppHeader';
import { getJson } from '@/src/services/api';

type TicketItem = {
  Id: string;
  Protocol: string;
  Title: string;
  Description?: string | null;
  CreatedAt: string;
  Status: string;
  Categoria: string;
  Nivel: string;
  Prioridade: string;
};

type TicketListResponse = {
  total: number;
  page: number;
  pageSize: number;
  items: any[];
};

type Profile = {
  roles?: string[];
};

const statusOptions = ['Aberto', 'Em andamento', 'Resolvido', 'Fechado'];
const categoriaOptions = ['Hardware', 'Software', 'Rede', 'Sistema Operacional', 'Acesso/Security', 'Outros'];
const nivelOptions = ['N1', 'N2', 'N3'];

const normalizeTicket = (raw: any): TicketItem => ({
  Id: raw?.Id ?? raw?.id ?? '',
  Protocol: raw?.Protocol ?? raw?.protocol ?? '—',
  Title: raw?.Title ?? raw?.title ?? '(Sem título)',
  Description: raw?.Description ?? raw?.description ?? null,
  CreatedAt: raw?.CreatedAt ?? raw?.createdAt ?? '',
  Status: raw?.Status ?? raw?.status ?? '—',
  Categoria: raw?.Categoria ?? raw?.categoria ?? '—',
  Nivel: raw?.Nivel ?? raw?.nivel ?? '—',
  Prioridade: raw?.Prioridade ?? raw?.prioridade ?? '—',
});

export default function ChamadosScreen() {
  const [modalVisible, setModalVisible] = useState(false);
  const [statusSelecionados, setStatusSelecionados] = useState<string[]>([]);
  const [categoriaSelecionados, setCategoriaSelecionados] = useState<string[]>([]);
  const [nivelSelecionados, setNivelSelecionados] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [page] = useState(1);
  const [pageSize] = useState(20);
  const [items, setItems] = useState<TicketItem[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [preferMine, setPreferMine] = useState<boolean | null>(null);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const profile = await getJson<Profile>('/auth/me');
        const roles = profile?.roles || [];
        const isAnalyst = roles.some((role) => role && role.toLowerCase() !== 'user');
        if (alive) setPreferMine(!isAnalyst);
      } catch {
        if (alive) setPreferMine(true);
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  const query = useMemo(() => {
    const p = new URLSearchParams();
    p.set('page', String(page));
    p.set('pageSize', String(pageSize));
    if (statusSelecionados[0]) p.set('status', statusSelecionados[0]);
    if (categoriaSelecionados[0]) p.set('categoria', categoriaSelecionados[0]);
    if (nivelSelecionados[0]) p.set('nivel', nivelSelecionados[0]);
    return p.toString();
  }, [page, pageSize, statusSelecionados, categoriaSelecionados, nivelSelecionados]);

  const carregar = useCallback(async () => {
    if (preferMine === null) return;
    setLoading(true);
    setError(null);
    const endpoint = preferMine ? '/tickets/mine' : '/tickets';
    try {
      const data = await getJson<TicketListResponse>(`${endpoint}?${query}`);
      const normalized = (data.items ?? []).map(normalizeTicket);
      setItems(normalized);
    } catch (err: any) {
      const status = err?.status;
      if (!preferMine && status === 403) {
        setPreferMine(true);
        setLoading(false);
        return;
      }
      setError(err?.userMessage || err?.message || 'Falha ao carregar os chamados');
    } finally {
      setLoading(false);
    }
  }, [preferMine, query]);

  useEffect(() => {
    if (preferMine !== null) {
      carregar();
    }
  }, [carregar, preferMine]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await carregar();
    setRefreshing(false);
  }, [carregar]);

  const toggleItem = (item: string, list: string[], setList: (v: string[]) => void) => {
    if (list.includes(item)) setList(list.filter((i) => i !== item));
    else setList([...list, item]);
  };

  const limparFiltros = () => {
    setStatusSelecionados([]);
    setCategoriaSelecionados([]);
    setNivelSelecionados([]);
  };

  const getPrioridadeCor = (prioridade: string) => {
    switch (prioridade) {
      case 'Critica':
      case 'Alta':
        return '#DC2626';
      case 'Media':
        return '#FBBF24';
      case 'Baixa':
        return '#10B981';
      default:
        return '#6B7280';
    }
  };

  const renderItem = ({ item }: { item: TicketItem }) => {
    const createdLabel = item.CreatedAt ? new Date(item.CreatedAt).toLocaleString() : '—';
    return (
      <TouchableOpacity style={styles.card}>
        <Text style={styles.protocolo}>Protocolo: {item.Protocol}</Text>
        <Text style={styles.titulo}>{item.Title}</Text>
        <Text style={styles.meta}>Criado em: {createdLabel}</Text>
        <Text style={styles.meta}>Categoria: {item.Categoria} | Nivel: {item.Nivel}</Text>
        <Text style={styles.meta}>Status: {item.Status}</Text>
        <View style={styles.prioridadeContainer}>
          <Text style={styles.meta}>Prioridade: {item.Prioridade}</Text>
          <View style={[styles.bolinha, { backgroundColor: getPrioridadeCor(item.Prioridade) }]} />
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
      <AppHeader style={styles.appHeader} />
      <View style={styles.container}>
        <View style={styles.banner}>
          <View>
            <Text style={styles.screenTitle}>Painel de chamados</Text>
            <Text style={styles.screenSubtitle}>Acompanhe atualizacoes em tempo real</Text>
          </View>
          <Ionicons name="stats-chart" size={28} color={colors.warning} />
        </View>

        <View style={styles.actionsRow}>
          <TouchableOpacity style={styles.filtroBotao} onPress={() => setModalVisible(true)}>
            <Text style={styles.filtroBotaoTexto}>Filtrar</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.filtroBotao, { backgroundColor: colors.accent }]} onPress={carregar}>
            <Text style={styles.filtroBotaoTexto}>Atualizar</Text>
          </TouchableOpacity>
        </View>

        {loading && (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="small" color="#2563EB" />
            <Text style={styles.loadingText}>Carregando...</Text>
          </View>
        )}
        {!!error && (
          <View style={styles.loadingContainer}>
            <Text style={[styles.loadingText, { color: '#DC2626' }]}>{error}</Text>
          </View>
        )}

        <FlatList
          data={items}
          keyExtractor={(item) => item.Id}
          renderItem={renderItem}
          refreshing={refreshing}
          onRefresh={onRefresh}
          ListEmptyComponent={
            !loading && !error ? (
              <View style={{ paddingVertical: 24, alignItems: 'center' }}>
                <Text style={{ color: colors.textMuted }}>
                  {preferMine === null ? 'Carregando seus chamados...' : 'Nenhum chamado encontrado.'}
                </Text>
              </View>
            ) : null
          }
          contentContainerStyle={{ paddingBottom: 16, flexGrow: 1 }}
        />

        <Modal animationType="slide" transparent visible={modalVisible} onRequestClose={() => setModalVisible(false)}>
          <View style={styles.modalOverlay}>
            <View style={styles.modalContainer}>
              <TouchableOpacity style={styles.modalClose} onPress={() => setModalVisible(false)} accessibilityLabel="Fechar filtros">
                <Ionicons name="close" size={18} color={colors.primary} />
              </TouchableOpacity>
              <ScrollView>
                <Text style={styles.modalTitulo}>Filtros</Text>
                <Text style={styles.modalLabel}>Status</Text>
                {statusOptions.map((s) => (
                  <TouchableOpacity key={s} onPress={() => toggleItem(s, statusSelecionados, setStatusSelecionados)}>
                    <Text style={statusSelecionados.includes(s) ? styles.selecionado : styles.opcao}>{s}</Text>
                  </TouchableOpacity>
                ))}

                <Text style={styles.modalLabel}>Categoria</Text>
                {categoriaOptions.map((c) => (
                  <TouchableOpacity key={c} onPress={() => toggleItem(c, categoriaSelecionados, setCategoriaSelecionados)}>
                    <Text style={categoriaSelecionados.includes(c) ? styles.selecionado : styles.opcao}>{c}</Text>
                  </TouchableOpacity>
                ))}

                <Text style={styles.modalLabel}>Nivel</Text>
                {nivelOptions.map((n) => (
                  <TouchableOpacity key={n} onPress={() => toggleItem(n, nivelSelecionados, setNivelSelecionados)}>
                    <Text style={nivelSelecionados.includes(n) ? styles.selecionado : styles.opcao}>{n}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>

              <View style={styles.modalButtons}>
                <TouchableOpacity style={styles.limparBotao} onPress={limparFiltros}>
                  <Text style={styles.limparTexto}>Limpar filtros</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.aplicarBotao} onPress={() => setModalVisible(false)}>
                  <Text style={styles.aplicarTexto}>Aplicar filtros</Text>
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
  container: { flex: 1, backgroundColor: colors.bg, padding: 16 },
  banner: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#1D0E6F', padding: 16, borderRadius: 18, marginBottom: 16 },
  screenTitle: { fontSize: 20, fontWeight: '700', color: '#FFFFFF' },
  screenSubtitle: { fontSize: 13, color: '#E0E7FF', marginTop: 4 },
  actionsRow: { flexDirection: 'row', gap: 8, marginBottom: 12 },
  card: { backgroundColor: colors.card, padding: 16, borderRadius: 12, marginBottom: 12, borderWidth: 1, borderColor: colors.border },
  protocolo: { fontSize: 14, fontWeight: 'bold', color: colors.info, marginBottom: 4 },
  titulo: { fontSize: 16, fontWeight: '600', marginBottom: 4, color: colors.text },
  meta: { fontSize: 14, color: colors.textMuted },
  prioridadeContainer: { flexDirection: 'row', alignItems: 'center', marginTop: 4 },
  bolinha: { width: 10, height: 10, borderRadius: 5, marginLeft: 8 },
  filtroBotao: { flex: 1, backgroundColor: colors.primary, padding: 12, borderRadius: 10, alignItems: 'center' },
  filtroBotaoTexto: { color: colors.white, fontWeight: 'bold' },
  loadingContainer: { paddingVertical: 12, alignItems: 'center' },
  loadingText: { fontSize: 14, color: colors.textMuted, marginTop: 6, textAlign: 'center' },
  modalOverlay: { flex: 1, justifyContent: 'center', backgroundColor: 'rgba(0,0,0,0.5)' },
  modalContainer: { backgroundColor: colors.card, margin: 20, padding: 20, borderRadius: 16, maxHeight: '80%', borderWidth: 1, borderColor: colors.border },
  modalClose: { alignSelf: 'flex-end', width: 32, height: 32, borderRadius: 16, backgroundColor: '#EEF2FF', alignItems: 'center', justifyContent: 'center' },
  modalTitulo: { fontSize: 20, fontWeight: 'bold', marginBottom: 12, textAlign: 'center' },
  modalLabel: { fontSize: 16, fontWeight: '600', marginTop: 12, marginBottom: 4 },
  opcao: { fontSize: 14, paddingVertical: 6, color: '#374151', paddingLeft: 8 },
  selecionado: { fontSize: 14, paddingVertical: 6, color: colors.primary, fontWeight: 'bold', paddingLeft: 8 },
  modalButtons: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 16 },
  aplicarBotao: { backgroundColor: colors.accent, padding: 12, borderRadius: 8, flex: 1, marginLeft: 8, alignItems: 'center' },
  aplicarTexto: { color: colors.white, fontWeight: 'bold' },
  limparBotao: { backgroundColor: '#F87171', padding: 12, borderRadius: 8, flex: 1, alignItems: 'center' },
  limparTexto: { color: colors.white, fontWeight: 'bold' },
});
