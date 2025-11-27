import React, { useEffect, useMemo, useState } from "react";
import { ActivityIndicator, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Ionicons from "@expo/vector-icons/Ionicons";
import { useRouter } from "expo-router";

import { AppHeader } from "@/src/components/AppHeader";
import { getMe, MeResponse } from "@/src/services/auth";
import { colors } from "@/src/theme";

type CardInfo = {
  title: string;
  description: string;
  color: string;
  route: string;
  icon: keyof typeof Ionicons.glyphMap;
};

const managerCards: CardInfo[] = [
  {
    title: "Chamados",
    description: "Visualize e organize todos os chamados da empresa.",
    color: "#2563EB",
    route: "/tabs/chamados",
    icon: "ticket-outline",
  },
  {
    title: "Base de conhecimento",
    description: "Cadastre ou revise artigos importantes para o time.",
    color: "#16A34A",
    route: "/tabs/artigos",
    icon: "book-outline",
  },
];

const userCards: CardInfo[] = [
  {
    title: "Chat",
    description: "Converse com nosso assistente virtual.",
    color: "#2563EB",
    route: "/tabs/chatbot",
    icon: "chatbubble-ellipses-outline",
  },
  {
    title: "Artigos uteis",
    description: "Consulte artigos para resolver problemas comuns.",
    color: "#16A34A",
    route: "/tabs/artigos",
    icon: "book-outline",
  },
  {
    title: "Meus chamados",
    description: "Acompanhe o status dos seus tickets.",
    color: "#7C3AED",
    route: "/tabs/chamados",
    icon: "list-outline",
  },
];

export default function HomeScreen() {
  const router = useRouter();
  const [profile, setProfile] = useState<MeResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchProfile = async () => {
    setError(null);
    setLoading(true);
    try {
      const data = await getMe();
      setProfile(data);
    } catch (err: any) {
      setError(err?.userMessage || err?.message || "Nao foi possivel carregar seu perfil.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProfile();
  }, []);

  const isManager = profile?.roles?.some((role) => role && ["Analyst", "Admin"].includes(role)) ?? false;
  const cards = useMemo(() => (isManager ? managerCards : userCards), [isManager]);
  const firstName = profile?.name?.split(" ")[0] || "Usuario";

  const goTo = (route: string) => router.push(route as any);

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
      <AppHeader style={styles.appHeader} />
      <ScrollView style={styles.scroll} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.welcomeBox}>
          <Text style={styles.heading}>Ola, {firstName}</Text>
          <Text style={styles.subheading}>Escolha uma opção para começar.</Text>
        </View>

        {loading && (
          <View style={styles.center}>
            <ActivityIndicator color={colors.primary} />
          </View>
        )}

        {error && (
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>{error}</Text>
            <TouchableOpacity style={styles.retryButton} onPress={fetchProfile}>
              <Text style={styles.retryText}>Tentar novamente</Text>
            </TouchableOpacity>
          </View>
        )}

        {!loading && !error && (
          <View style={styles.cardStack}>
            {cards.map((card) => (
              <TouchableOpacity key={card.title} style={[styles.card, { borderColor: card.color }]} onPress={() => goTo(card.route)}>
                <View style={[styles.iconWrapper, { backgroundColor: `${card.color}1A` }]}> 
                  <Ionicons name={card.icon} size={22} color={card.color} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.cardTitle, { color: card.color }]}>{card.title}</Text>
                  <Text style={styles.cardDesc}>{card.description}</Text>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#F3F4F6' },
  appHeader: { paddingBottom: 0 },
  scroll: { flex: 1 },
  content: { paddingHorizontal: 16, paddingBottom: 32 },
  welcomeBox: { backgroundColor: '#E5E7EB', borderRadius: 16, padding: 18, marginBottom: 16 },
  heading: { fontSize: 24, fontWeight: '700', color: colors.primary, marginBottom: 4 },
  subheading: { fontSize: 14, color: colors.textMuted },
  center: { paddingVertical: 40 },
  errorBox: { backgroundColor: '#FEE2E2', borderRadius: 12, padding: 16, borderColor: '#FCA5A5', borderWidth: 1, marginBottom: 16 },
  errorText: { color: '#B91C1C', textAlign: 'center', marginBottom: 8 },
  retryButton: { alignSelf: 'center', backgroundColor: '#B91C1C', paddingHorizontal: 18, paddingVertical: 8, borderRadius: 8 },
  retryText: { color: '#fff', fontWeight: '600' },
  cardStack: { gap: 12 },
  card: { flexDirection: 'row', backgroundColor: colors.white, borderRadius: 14, padding: 16, borderWidth: 1.5, alignItems: 'center', shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 6, shadowOffset: { width: 0, height: 2 }, elevation: 2 },
  iconWrapper: { width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginRight: 14 },
  cardTitle: { fontSize: 17, fontWeight: '600', marginBottom: 4 },
  cardDesc: { fontSize: 13, color: colors.textMuted },
});

