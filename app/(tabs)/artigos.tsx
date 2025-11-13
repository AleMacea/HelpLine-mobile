import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, TextInput, FlatList, TouchableOpacity, Modal, ScrollView } from 'react-native';
import { getFaq, getPopularFaq, FaqArticle } from '@/src/services/faq';
import { postJson } from '@/src/services/api';
import { colors } from '@/src/theme';
import { useRouter } from 'expo-router';

export default function ArtigosScreen() {
  const router = useRouter();
  const [all, setAll] = useState<FaqArticle[]>([]);
  const [q, setQ] = useState('');
  const [cat, setCat] = useState<string | null>(null);
  const [selected, setSelected] = useState<FaqArticle | null>(null);
  const [popular, setPopular] = useState<FaqArticle[]>([]);

  const categories = useMemo(() => {
    const set = new Set(all.map(a => a.category));
    return Array.from(set);
  }, [all]);

  useEffect(() => {
    (async () => {
      setAll(await getFaq());
      setPopular(await getPopularFaq());
    })();
  }, []);

  const items = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return all.filter(a =>
      (!cat || a.category === cat) &&
      (!needle || a.title.toLowerCase().includes(needle) || a.content.toLowerCase().includes(needle) || (a.tags||[]).some(t => t.toLowerCase().includes(needle)))
    );
  }, [all, q, cat]);

  const openChatWith = (context: string) => {
    setSelected(null);
    router.replace({ pathname: '/(tabs)/chatbot', params: { context } });
  };

  const renderItem = ({ item }: { item: FaqArticle }) => (
    <TouchableOpacity style={styles.card} onPress={() => setSelected(item)} accessibilityRole="button" accessibilityLabel={`Abrir artigo ${item.title}`}>
      <Text style={styles.cardTitle}>{item.title}</Text>
      <Text style={styles.cardMeta}>{item.category}{item.lastUpdated ? ` • ${item.lastUpdated.slice(0,10)}` : ''}</Text>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <Text style={styles.header}>Artigos e FAQ</Text>
      {popular.length > 0 && (
        <View style={{ marginBottom: 12 }}>
          <Text style={styles.sectionTitle}>Mais úteis</Text>
          <FlatList
            data={popular}
            keyExtractor={(i) => i.id + '-pop'}
            horizontal
            showsHorizontalScrollIndicator={false}
            renderItem={({ item }) => (
              <TouchableOpacity style={styles.popCard} onPress={() => setSelected(item)}>
                <Text numberOfLines={2} style={styles.cardTitle}>{item.title}</Text>
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
        value={q}
        onChangeText={setQ}
        returnKeyType="search"
      />

      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 12 }}>
        <TouchableOpacity style={[styles.pill, !cat && styles.pillActive]} onPress={() => setCat(null)}>
          <Text style={styles.pillText}>Tudo</Text>
        </TouchableOpacity>
        {categories.map(c => (
          <TouchableOpacity key={c} style={[styles.pill, cat===c && styles.pillActive]} onPress={() => setCat(c)}>
            <Text style={styles.pillText}>{c}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <FlatList
        data={items}
        keyExtractor={(i) => i.id}
        renderItem={renderItem}
        contentContainerStyle={{ paddingBottom: 16 }}
      />

      <Modal transparent animationType="slide" visible={!!selected} onRequestClose={() => setSelected(null)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <ScrollView>
              <Text style={styles.modalTitle}>{selected?.title}</Text>
              <Text style={styles.modalMeta}>{selected?.category}</Text>
              <Text style={styles.modalContent}>{selected?.content}</Text>
            </ScrollView>
            <View style={styles.modalButtons}>
              <TouchableOpacity style={[styles.btn, { backgroundColor: colors.accent }]} onPress={async () => { try { if(selected) await postJson(`/faq/${selected.id}/feedback`, { helpful: true }); } catch {} finally { setSelected(null); } }}>
                <Text style={styles.btnText}>Ajudou</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.btn, { backgroundColor: colors.primary }]} onPress={async () => { const ctx = `Li o artigo: ${selected?.title}. Não resolveu meu problema.`; try { if (selected) await postJson(`/faq/${selected.id}/feedback`, { helpful: false }); } catch {} finally { openChatWith(ctx); } }}>
                <Text style={styles.btnText}>Não resolveu</Text>
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
  header: { fontSize: 24, fontWeight: 'bold', color: colors.primary, marginBottom: 12, textAlign: 'center' },
  sectionTitle: { fontSize: 14, fontWeight: '700', color: colors.textMuted, marginBottom: 8 },
  search: { backgroundColor: colors.white, borderColor: colors.border, borderWidth: 1, borderRadius: 8, padding: 10, marginBottom: 12 },
  pill: { backgroundColor: '#F3F4F6', paddingHorizontal: 14, paddingVertical: 8, borderRadius: 999, marginRight: 8, borderWidth: 1, borderColor: '#D1D5DB' },
  pillActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  pillText: { color: '#111827', fontWeight: '600' },
  card: { backgroundColor: colors.card, borderColor: colors.border, borderWidth: 1, borderRadius: 10, padding: 14, marginBottom: 10 },
  popCard: { backgroundColor: colors.card, borderColor: colors.border, borderWidth: 1, borderRadius: 10, padding: 12, width: 220, marginRight: 10 },
  cardTitle: { fontSize: 16, fontWeight: '600', color: colors.text },
  cardMeta: { fontSize: 12, color: colors.textMuted, marginTop: 4 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center' },
  modalContainer: { backgroundColor: colors.card, margin: 16, padding: 16, borderRadius: 12, borderColor: colors.border, borderWidth: 1, maxHeight: '80%' },
  modalTitle: { fontSize: 18, fontWeight: '700', color: colors.text },
  modalMeta: { fontSize: 12, color: colors.textMuted, marginBottom: 8 },
  modalContent: { fontSize: 14, color: colors.text },
  modalButtons: { flexDirection: 'row', gap: 8, marginTop: 12 },
  btn: { flex: 1, alignItems: 'center', padding: 12, borderRadius: 8 },
  btnText: { color: colors.white, fontWeight: 'bold' },
});
