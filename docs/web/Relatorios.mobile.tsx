// Arquivo guardado a partir do app mobile para reaproveitar no Web Admin.
// Esta tela NÃO é mais usada no mobile; use-a como referência no painel web.
import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, FlatList, TextInput, Share, ScrollView, ActivityIndicator } from 'react-native';
// Substitua por seus helpers de API no projeto web
// import { getJson } from '@/services/api';

type ReportRow = {
  Dia: string;
  Status: string;
  Categoria: string;
  Nivel: string;
  Prioridade: string;
  Qtde: number;
};

const statusOptions = ['Aberto', 'Em andamento', 'Resolvido', 'Fechado'];
const categoriaOptions = ['Hardware', 'Software', 'Rede', 'Sistema Operacional', 'Acesso/Security', 'Outros'];
const nivelOptions = ['N1', 'N2', 'N3'];

export default function RelatoriosWebPlaceholder() {
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [statusSel, setStatusSel] = useState<string[]>([]);
  const [categoriaSel, setCategoriaSel] = useState<string[]>([]);
  const [nivelSel, setNivelSel] = useState<string[]>([]);
  const [items, setItems] = useState<ReportRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const query = useMemo(() => {
    const p = new URLSearchParams();
    if (from) p.set('from', from);
    if (to) p.set('to', to);
    if (statusSel[0]) p.set('status', statusSel[0]);
    if (categoriaSel[0]) p.set('categoria', categoriaSel[0]);
    if (nivelSel[0]) p.set('nivel', nivelSel[0]);
    return p.toString();
  }, [from, to, statusSel, categoriaSel, nivelSel]);

  async function carregar() {
    setLoading(true);
    setError(null);
    try {
      // Trocar por chamada real no web
      // const data = await getJson<ReportRow[]>(`/reports${query ? `?${query}` : ''}`);
      const data: ReportRow[] = [];
      setItems(data);
    } catch (e: any) {
      const msg: string = e?.message || '';
      if (msg.includes('403')) setError('Sem permissão para Relatórios.');
      else setError(msg || 'Falha ao carregar relatórios');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    const hoje = new Date();
    const y = hoje.getFullYear();
    const m = String(hoje.getMonth() + 1).padStart(2, '0');
    const d = String(hoje.getDate()).padStart(2, '0');
    setFrom(`${y}-${m}-${d}`);
    setTo(`${y}-${m}-${d}`);
  }, []);

  const toggle = (v: string, lista: string[], setLista: (l: string[]) => void) => {
    if (lista.includes(v)) setLista([]);
    else setLista([v]);
  };

  const gerarCSV = () => {
    const headers = ['Dia', 'Status', 'Categoria', 'Nivel', 'Prioridade', 'Qtde'];
    const rows = items.map((r) => [
      (r.Dia || '').toString().slice(0, 10),
      r.Status,
      r.Categoria,
      r.Nivel,
      r.Prioridade,
      String(r.Qtde),
    ]);
    const csv = [headers.join(';'), ...rows.map((r) => r.map((x) => String(x).replaceAll(';', ',')).join(';'))].join('\n');
    return csv;
  };

  const compartilharCSV = async () => {
    try { await Share.share({ message: gerarCSV(), title: 'relatorio-chamados.csv' }); } catch {}
  };

  const renderItem = ({ item }: { item: ReportRow }) => (
    <View style={styles.card}>
      <Text style={styles.protocolo}>Dia: {String(item.Dia).slice(0, 10)}</Text>
      <Text style={styles.meta}>Status: {item.Status}</Text>
      <Text style={styles.meta}>Categoria: {item.Categoria} • Nível: {item.Nivel}</Text>
      <Text style={styles.meta}>Prioridade: {item.Prioridade}</Text>
      <Text style={styles.meta}>Qtde: {item.Qtde}</Text>
    </View>
  );

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 16 }}>
      <Text style={styles.header}>Relatórios de Chamados (Web)</Text>

      <View style={styles.filters}>
        <Text style={styles.label}>De (YYYY-MM-DD)</Text>
        <TextInput style={styles.input} placeholder="YYYY-MM-DD" />
        <Text style={styles.label}>Até (YYYY-MM-DD)</Text>
        <TextInput style={styles.input} placeholder="YYYY-MM-DD" />

        <View style={{ flexDirection: 'row', gap: 8, marginBottom: 8 }}>
          <TouchableOpacity style={styles.quickBtn} onPress={() => { /* implementar no web */ }}>
            <Text style={styles.quickTxt}>Hoje</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.quickBtn} onPress={() => { /* implementar no web */ }}>
            <Text style={styles.quickTxt}>7 dias</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.quickBtn} onPress={() => { /* implementar no web */ }}>
            <Text style={styles.quickTxt}>30 dias</Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.label}>Status</Text>
        <View style={styles.pillsRow}>
          {statusOptions.map((s) => (
            <TouchableOpacity key={s} style={[styles.pill]}>
              <Text style={styles.pillText}>{s}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={styles.label}>Categoria</Text>
        <View style={styles.pillsRow}>
          {categoriaOptions.map((c) => (
            <TouchableOpacity key={c} style={[styles.pill]}>
              <Text style={styles.pillText}>{c}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={styles.label}>Nível</Text>
        <View style={styles.pillsRow}>
          {nivelOptions.map((n) => (
            <TouchableOpacity key={n} style={[styles.pill]}>
              <Text style={styles.pillText}>{n}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <View style={{ flexDirection: 'row', gap: 8, marginTop: 8 }}>
          <TouchableOpacity style={styles.botao} onPress={carregar}><Text style={styles.botaoTxt}>Buscar</Text></TouchableOpacity>
          <TouchableOpacity style={[styles.botao, { backgroundColor: '#10B981' }]} onPress={compartilharCSV}><Text style={styles.botaoTxt}>Exportar CSV</Text></TouchableOpacity>
        </View>
      </View>

      {loading && (
        <View style={styles.loadingBox}>
          <ActivityIndicator size="small" />
          <Text style={styles.meta}>Carregando...</Text>
        </View>
      )}
      {!!error && (
        <View style={styles.loadingBox}>
          <Text style={[styles.meta, { color: '#DC2626' }]}>{error}</Text>
        </View>
      )}

      <FlatList
        data={items}
        keyExtractor={(_, idx) => String(idx)}
        renderItem={renderItem}
        contentContainerStyle={{ paddingBottom: 16 }}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16 },
  header: { fontSize: 24, fontWeight: 'bold', marginBottom: 16, textAlign: 'center' },
  filters: { gap: 8, marginBottom: 12 },
  label: { fontSize: 14 },
  input: { backgroundColor: '#fff', borderColor: '#E5E7EB', borderWidth: 1, borderRadius: 8, padding: 8 },
  quickBtn: { backgroundColor: '#E5E7EB', paddingVertical: 6, paddingHorizontal: 10, borderRadius: 8 },
  quickTxt: { color: '#111827' },
  pillsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  pill: { backgroundColor: '#E5E7EB', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 16 },
  pillText: { color: '#111827' },
  botao: { backgroundColor: '#2B0A6B', padding: 10, borderRadius: 8, alignItems: 'center', flex: 1 },
  botaoTxt: { color: '#fff', fontWeight: 'bold', textAlign: 'center' },
  loadingBox: { paddingVertical: 10, alignItems: 'center' },
  card: { backgroundColor: '#fff', padding: 16, borderRadius: 8, marginBottom: 12, borderWidth: 1, borderColor: '#E5E7EB' },
  protocolo: { fontSize: 14, fontWeight: 'bold', color: '#2563EB', marginBottom: 4 },
  meta: { fontSize: 14, color: '#6B7280' },
});

