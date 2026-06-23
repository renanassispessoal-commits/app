import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useState } from "react";
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { api, deleteToken } from "@/src/api/client";
import { colors, radius, spacing } from "@/src/theme";

type Plan = {
  key: "daily" | "monthly" | "yearly";
  label: string;
  tagline: string;
  perks: string[];
  badge?: string;
};

const PLANS: Plan[] = [
  {
    key: "daily",
    label: "Diário",
    tagline: "1 dia de evento",
    perks: ["1 sala ilimitada", "QR Code próprio", "Painel de denúncias"],
  },
  {
    key: "monthly",
    label: "Mensal",
    tagline: "30 dias corridos",
    perks: [
      "Salas ilimitadas no mês",
      "Histórico de estatísticas",
      "Suporte por chat",
    ],
    badge: "Mais escolhido",
  },
  {
    key: "yearly",
    label: "Anual",
    tagline: "365 dias",
    perks: [
      "Tudo do Mensal",
      "2 meses grátis (16% off)",
      "Banner verificado no QR",
    ],
  },
];

export default function HostPlans() {
  const [selected, setSelected] = useState<Plan["key"] | null>("monthly");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const confirm = async () => {
    if (!selected) return;
    setError("");
    setLoading(true);
    try {
      await api.put("/auth/host/plan", { plan: selected });
      router.replace("/host/dashboard");
    } catch (e: any) {
      setError(e?.response?.data?.detail || "Erro ao salvar plano");
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    await deleteToken();
    router.replace("/");
  };

  return (
    <View style={styles.root}>
      <SafeAreaView edges={["top", "bottom"]} style={{ flex: 1 }}>
        <View style={styles.headerRow}>
          <View style={{ width: 40 }} />
          <Text style={styles.headerTitle}>Escolha seu plano</Text>
          <Pressable
            testID="logout-btn"
            onPress={logout}
            style={styles.iconBtn}
          >
            <Ionicons name="log-out-outline" size={20} color={colors.onSurface} />
          </Pressable>
        </View>

        <ScrollView
          contentContainerStyle={{ padding: spacing.lg, paddingBottom: 160 }}
        >
          <Text style={styles.title}>Bem-vindo, anfitrião!</Text>
          <Text style={styles.sub}>
            Selecione um plano para começar a criar salas. Você pode trocar
            quando quiser.
          </Text>

          <View style={styles.grid}>
            {PLANS.map((p) => {
              const active = selected === p.key;
              return (
                <Pressable
                  key={p.key}
                  testID={`plan-${p.key}`}
                  onPress={() => setSelected(p.key)}
                  style={[
                    styles.card,
                    active && styles.cardActive,
                  ]}
                >
                  {p.badge && (
                    <View style={styles.badge}>
                      <Text style={styles.badgeTxt}>{p.badge}</Text>
                    </View>
                  )}
                  <View style={styles.cardTop}>
                    <Text style={styles.planLabel}>{p.label}</Text>
                    <Ionicons
                      name={active ? "radio-button-on" : "radio-button-off"}
                      size={22}
                      color={active ? colors.brand : colors.onSurfaceTertiary}
                    />
                  </View>
                  <Text style={styles.planTag}>{p.tagline}</Text>
                  <View style={styles.priceBox}>
                    <Text style={styles.priceFrom}>R$</Text>
                    <Text style={styles.priceMain}>—</Text>
                    <Text style={styles.priceSuffix}>
                      / {p.key === "daily" ? "dia" : p.key === "monthly" ? "mês" : "ano"}
                    </Text>
                  </View>
                  <View style={styles.perks}>
                    {p.perks.map((perk) => (
                      <View key={perk} style={styles.perkRow}>
                        <Ionicons
                          name="checkmark-circle"
                          size={16}
                          color={colors.brand}
                        />
                        <Text style={styles.perkTxt}>{perk}</Text>
                      </View>
                    ))}
                  </View>
                </Pressable>
              );
            })}
          </View>

          {error ? (
            <Text testID="error-text" style={styles.err}>
              {error}
            </Text>
          ) : null}
        </ScrollView>

        <View style={styles.footer}>
          <Pressable
            testID="confirm-plan-btn"
            onPress={confirm}
            disabled={!selected || loading}
            style={[
              styles.cta,
              (!selected || loading) && { opacity: 0.5 },
            ]}
          >
            <Text style={styles.ctaTxt}>
              {loading ? "Salvando..." : `Continuar com ${selected ? PLANS.find((p) => p.key === selected)?.label : "..."}`}
            </Text>
          </Pressable>
          <Text style={styles.foot}>
            Valores serão exibidos antes da cobrança. Cancele a qualquer momento.
          </Text>
        </View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.surface },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
  },
  iconBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.surfaceSecondary,
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: { color: colors.onSurface, fontSize: 16, fontWeight: "600" },
  title: {
    color: colors.onSurface,
    fontSize: 30,
    fontWeight: "300",
    letterSpacing: -0.5,
  },
  sub: {
    color: colors.onSurfaceTertiary,
    fontSize: 14,
    lineHeight: 20,
    marginTop: spacing.sm,
    marginBottom: spacing.xl,
    maxWidth: 320,
  },
  grid: { gap: spacing.md },
  card: {
    backgroundColor: colors.surfaceSecondary,
    borderRadius: radius.lg,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
    gap: spacing.sm,
  },
  cardActive: {
    borderColor: colors.brand,
    backgroundColor: "rgba(199,125,255,0.10)",
  },
  badge: {
    position: "absolute",
    top: -10,
    right: spacing.lg,
    backgroundColor: colors.brand,
    paddingHorizontal: spacing.md,
    paddingVertical: 4,
    borderRadius: radius.pill,
  },
  badgeTxt: { color: "#022", fontSize: 10, fontWeight: "700", letterSpacing: 1 },
  cardTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  planLabel: { color: colors.onSurface, fontSize: 22, fontWeight: "600" },
  planTag: { color: colors.onSurfaceTertiary, fontSize: 13 },
  priceBox: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 4,
    marginTop: spacing.sm,
  },
  priceFrom: {
    color: colors.onSurfaceTertiary,
    fontSize: 14,
    marginBottom: 8,
  },
  priceMain: { color: colors.brand, fontSize: 36, fontWeight: "300", lineHeight: 38 },
  priceSuffix: {
    color: colors.onSurfaceTertiary,
    fontSize: 13,
    marginBottom: 6,
  },
  perks: { gap: 6, marginTop: spacing.sm },
  perkRow: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  perkTxt: { color: colors.onSurfaceSecondary, fontSize: 13, flex: 1 },
  err: { color: colors.error, marginTop: spacing.md, fontSize: 13 },
  footer: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    padding: spacing.lg,
    gap: spacing.sm,
  },
  cta: {
    backgroundColor: colors.brandPrimary,
    paddingVertical: 18,
    borderRadius: radius.pill,
    alignItems: "center",
  },
  ctaTxt: { color: "#fff", fontWeight: "700", fontSize: 16 },
  foot: {
    color: colors.onSurfaceTertiary,
    fontSize: 11,
    textAlign: "center",
  },
});
