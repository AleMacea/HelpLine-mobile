import React, { useEffect, useMemo, useState, useCallback } from 'react';
import { View, Text, FlatList, StyleSheet, TouchableOpacity, Modal, ScrollView, ActivityIndicator } from 'react-native';
import { colors } from '@/src/theme';
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
  items: TicketItem[];
};

const statusOptions = ['Aberto', 'Em andamento', 'Resolvido', 'Fechado'];
const categoriaOptions = ['Hardware', 'Software', 'Rede', 'Sistema Operacional', 'Acesso/Security', 'Outros'];
const nivelOptions = ['N1', 'N2', 'N3'];

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

  const query = useMemo(() => {
    const p = new URLSearchParams();
    p.set('page', String(page));
    p.set('pageSize', String(pageSize));
    if (statusSelecionados[0]) p.set('status', statusSelecionados[0]);
    if (categoriaSelecionados[0]) p.set('categoria', categoriaSelecionados[0]);
    if (nivelSelecionados[0]) p.set('nivel', nivelSelecionados[0]);
    return p.toString();
  }, [page, pageSize, statusSelecionados, categoriaSelecionados, nivelSelecionados]);

  async function carregar() {
    setLoading(true);
    setError(null);
    try {
      // Tenta lista geral (Analyst/Admin)
      const data = await getJson<TicketListResponse>(`/tickets?${query}`);
      setItems(data.items);
    } catch (e: any) {
      // Fallback para usuÃ¡rios comuns
      if (String(e.message || '').startsWith('HTTP 403')) {
        try {
          const dataMine = await getJson<TicketListResponse>(`/tickets/mine?${query}`);
          setItems(dataMine.items);
        } catch (e2: any) {
          setError(e2?.message || 'Falha ao carregar seus chamados');
        }
      } else {
        setError(e?.message || 'Falha ao carregar os chamados');
      }
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    carregar();
  }, [query]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await carregar();
    setRefreshing(false);
  }, [query]);

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
      case 'CrÃ­tica':
      case 'Alta':
        return '#DC2626';
      case 'MÃ©dia':
        return '#FBBF24';
      case 'Baixa':
        return '#10B981';
      default:
        return '#6B7280';
    }
  };

  const renderItem = ({ item }: { item: TicketItem }) => (
    <TouchableOpacity style={styles.card}>
      <Text style={styles.protocolo}>Protocolo: {item.Protocol}</Text>
      <Text style={styles.titulo}>{item.Title}</Text>
      <Text style={styles.meta}>Criado em: {new Date(item.CreatedAt).toLocaleString()}</Text>
      <Text style={styles.meta}>Categoria: {item.Categoria} â€¢ NÃ­vel: {item.Nivel}</Text>
      <Text style={styles.meta}>Status: {item.Status}</Text>
      <View style={styles.prioridadeContainer}>
        <Text style={styles.meta}>Prioridade: {item.Prioridade}</Text>
        <View style={[styles.bolinha, { backgroundColor: getPrioridadeCor(item.Prioridade) }]} />
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <Text style={styles.header}>Painel de Chamados</Text>

      <View style={{ flexDirection: 'row', gap: 8 }}>
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
        ListEmptyComponent={!loading && !error ? (
          <View style={{ paddingVertical: 24, alignItems: 'center' }}>
            <Text style={{ color: colors.textMuted }}>Nenhum chamado encontrado.</Text>
          </View>
        ) : null}
        contentContainerStyle={{ paddingBottom: 16, flexGrow: 1 }}
      />

      <Modal animationType="slide" transparent visible={modalVisible}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <Text style={styles.modalTitulo}>Filtros</Text>
            <ScrollView>
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

              <Text style={styles.modalLabel}>NÃ­vel</Text>
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
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg, padding: 16 },
  header: { fontSize: 24, fontWeight: 'bold', marginBottom: 16, textAlign: 'center', color: colors.primary },
  card: { backgroundColor: colors.card, padding: 16, borderRadius: 8, marginBottom: 12, borderWidth: 1, borderColor: colors.border },
  protocolo: { fontSize: 14, fontWeight: 'bold', color: colors.info, marginBottom: 4 },
  titulo: { fontSize: 16, fontWeight: '600', marginBottom: 4 },
  meta: { fontSize: 14, color: colors.textMuted },
  prioridadeContainer: { flexDirection: 'row', alignItems: 'center', marginTop: 4 },
  bolinha: { width: 10, height: 10, borderRadius: 5, marginLeft: 8 },
  filtroBotao: { backgroundColor: colors.primary, padding: 10, borderRadius: 8, alignItems: 'center', marginBottom: 12 },
  filtroBotaoTexto: { color: colors.white, fontWeight: 'bold' },
  loadingContainer: { paddingVertical: 12, alignItems: 'center' },
  loadingText: { fontSize: 14, color: colors.textMuted, marginTop: 6 },
  modalOverlay: { flex: 1, justifyContent: 'center', backgroundColor: 'rgba(0,0,0,0.5)' },
  modalContainer: { backgroundColor: colors.card, margin: 20, padding: 20, borderRadius: 12, maxHeight: '80%', borderWidth: 1, borderColor: colors.border },
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

