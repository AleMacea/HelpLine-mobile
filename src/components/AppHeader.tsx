import React from "react";
import { Image, StyleSheet, Text, TouchableOpacity, View, ViewStyle } from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";

import HelplineLogo from "@/assets/images/helpline-logo.png";
import { colors } from "@/src/theme";
import { useDrawer } from "./GlobalDrawer";

type Props = {
  style?: ViewStyle;
};

export function AppHeader({ style }: Props) {
  const { open } = useDrawer();

  return (
    <View style={[styles.header, style]}>
      <View style={styles.brandRow}>
        <Image source={HelplineLogo} style={styles.logo} resizeMode="contain" />
        <Text style={styles.title}>HelpLine</Text>
      </View>
      <TouchableOpacity
        style={styles.menuButton}
        onPress={open}
        accessibilityLabel="Abrir menu"
        accessibilityRole="button"
      >
        <Ionicons name="menu" size={26} color={colors.primary} />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  brandRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  logo: { width: 36, height: 36 },
  title: { fontSize: 20, fontWeight: "700", color: colors.primary },
  menuButton: { padding: 6, borderRadius: 20 },
});
