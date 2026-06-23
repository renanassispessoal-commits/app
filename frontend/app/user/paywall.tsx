import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useEffect, useState } from "react";
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { api, getUser, saveUser } from "@/src/api/client";
import { colors, radius, spacing } from "@/src/theme";

export default function Paywall() {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    (async () => {
      const u = await getUser();
      setUser(u);
    })();
  }, []);

  const unlock = async () => {
    if (!user?.id) return;
    setError("");
    setLoading(true);
    try {
      const res = await api.post(`/users/${user.id}/unlock-pack`);
      const updated = { ...user, ...res.data };
      await saveUser(updated);
      setUser(updated);
      setSuccess(true);
    } catch (e: any) {
      setError(e?.response?.data?.detail || "Erro ao liberar pack");
    } finally {
      setLoading(false);
    }
  };

  const remaining = user
    ? Math.max(0, (user.matches_quota || 0) - (user.matches_used || 0))
    : 0;

  return (
    <View style={styles.root}>
      <SafeAreaView style={{ flex: 1 }} edges={["top", "bottom"]}>
        <View style={styles.headerRow}>
          <Pressable
            testID="back-btn"
            onPress={() => router.back()}
            style={styles.iconBtn}
          >
            <Ionicons name="chevron-back" size={22} color={colors.onSurface} />
          </Pressable>
          <Text style={styles.headerTitle}>Liberar matchs</Text>
          <View style={{ width: 40 }} />
        </View>

        <ScrollView contentContainerStyle={styles.content}>
          {success ? (
            <View style={styles.successBox}>
              <Ionicons
                name="checkmark-circle"
                size={64}
                color={colors.brand}
              />
              <Text style={styles.title}>20 matchs liberados!</Text>
              <Text style={styles.sub}>
                Você ainda tem {remaining} matchs disponíveis. Bom rolê!
              </Text>
              <Pressable
                testID="back-to-deck"
                onPress={() => router.back()}
                style={styles.cta}
              >
                <Text style={styles.ctaTxt}>Voltar para o rolê</Text>
              </Pressable>
            </View>
          ) : (
            <>
              <View style={styles.hero}>
                <View style={styles.lockCircle}>
                  <Ionicons name="sparkles" size={36} color={colors.brand} />
                </View>
                <Text style={styles.title}>
                  Você acabou{"\n"}com os matchs.
                </Text>
                <Text style={styles.sub}>
                  Seus 5 matchs grátis foram usados. Libere mais 20 matchs
                  agora e continue no rolê.
                </Text>
              </View>

              <View style={styles.packCard} testID="pack-card">
                <View style={styles.packTop}>
                  <Text style={styles.packLabel}>PACK MATCHS</Text>
                  <View style={styles.badge}>
                    <Text style={styles.badgeTxt}>+20</Text>
                  </View>
                </View>
                <View style={styles.priceRow}>
                  <Text style={styles.priceCurrency}>R$</Text>
                  <Text style={styles.price}>40</Text>
                  <Text style={styles.priceFraction}>,00</Text>
                </View>
                <View style={styles.perks}>
                  <Perk text="20 novos matchs" />
                  <Perk text="Curtidas continuam ilimitadas" />
                  <Perk text="Pode comprar de novo após usar" />
                </View>
              </View>

              {error ? (
                <Text testID="error-text" style={styles.err}>
                  {error}
                </Text>
              ) : null}

              <Text style={styles.mocked}>
                💡 Pagamento simulado nesta versão. Em produção, integraremos
                Stripe/PIX antes de cobrar.
              </Text>
            </>
          )}
        </ScrollView>

        {!success && (
          <View style={styles.footer}>
            <Pressable
              testID="unlock-btn"
              onPress={unlock}
              disabled={loading}
              style={[styles.cta, loading && { opacity: 0.5 }]}
            >
              <Text style={styles.ctaTxt}>
                {loading ? "Liberando..." : "Liberar 20 matchs por R$ 40"}
              </Text>
            </Pressable>
          </View>
        )}
      </SafeAreaView>
    </View>
  );
}

function Perk({ text }: { text: string }) {
  return (
    <View style={styles.perkRow}>
      <Ionicons name="checkmark-circle" size={18} color={colors.brand} />
      <Text style={styles.perkTxt}>{text}</Text>
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
    paddingVertical: spacing.md,
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
  content: {
    padding: spacing.lg,
    gap: spacing.xl,
    paddingBottom: 120,
  },
  hero: { alignItems: "center", gap: spacing.md, marginTop: spacing.xl },
  lockCircle: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: "rgba(199,125,255,0.15)",
    borderWidth: 1,
    borderColor: colors.brand,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing.md,
  },
  title: {
    color: colors.onSurface,
    fontSize: 32,
    fontWeight: "300",
    textAlign: "center",
    letterSpacing: -0.5,
    lineHeight: 36,
  },
  sub: {
    color: colors.onSurfaceTertiary,
    fontSize: 14,
    lineHeight: 20,
    textAlign: "center",
    maxWidth: 320,
  },
  packCard: {
    backgroundColor: colors.surfaceSecondary,
    borderRadius: radius.lg,
    padding: spacing.xl,
    borderWidth: 1,
    borderColor: colors.brand,
    gap: spacing.md,
  },
  packTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  packLabel: {
    color: colors.onSurfaceTertiary,
    fontSize: 11,
    letterSpacing: 2,
    fontWeight: "700",
  },
  badge: {
    backgroundColor: colors.brand,
    paddingHorizontal: spacing.md,
    paddingVertical: 4,
    borderRadius: radius.pill,
  },
  badgeTxt: { color: "#10001A", fontSize: 12, fontWeight: "800" },
  priceRow: {
    flexDirection: "row",
    alignItems: "flex-end",
  },
  priceCurrency: {
    color: colors.onSurface,
    fontSize: 22,
    marginBottom: 16,
    marginRight: 4,
  },
  price: {
    color: colors.brand,
    fontSize: 88,
    fontWeight: "300",
    lineHeight: 88,
    letterSpacing: -2,
  },
  priceFraction: {
    color: colors.onSurfaceTertiary,
    fontSize: 22,
    marginBottom: 16,
  },
  perks: { gap: spacing.sm },
  perkRow: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  perkTxt: { color: colors.onSurfaceSecondary, fontSize: 14 },
  err: { color: colors.error, fontSize: 13 },
  mocked: {
    color: colors.onSurfaceTertiary,
    fontSize: 11,
    textAlign: "center",
    lineHeight: 16,
    fontStyle: "italic",
  },
  footer: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    padding: spacing.lg,
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  cta: {
    backgroundColor: colors.brandPrimary,
    paddingVertical: 18,
    borderRadius: radius.pill,
    alignItems: "center",
    borderWidth: 1,
    borderColor: colors.brand,
  },
  ctaTxt: { color: "#fff", fontWeight: "700", fontSize: 16 },
  successBox: {
    alignItems: "center",
    gap: spacing.md,
    marginTop: spacing.xxxl,
  },
});
