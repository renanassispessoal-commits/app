import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useCallback, useState } from "react";
import { useFocusEffect } from "expo-router";
import {
  FlatList,
  Image,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { api } from "@/src/api/client";
import { maskCpf } from "@/src/utils/cpf";
import { colors, radius, spacing } from "@/src/theme";

const TYPE_LABEL: Record<string, string> = {
  ban: "Banido para sempre",
  timeout_30d: "Timeout 30 dias",
  timeout_1d: "Timeout 24h",
};

type Ban = {
  id: string;
  user_id: string;
  type: string;
  expires_at: string | null;
  active: boolean;
  created_at: string;
  user?: { name: string; cpf: string; photo: string; birthdate: string };
};

export default function BlockedList() {
  const [bans, setBans] = useState<Ban[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const res = await api.get("/hosts/me/bans");
      setBans(res.data);
    } catch (e) {
      console.warn(e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const liftBan = async (ban: Ban) => {
    try {
      await api.delete(`/hosts/me/bans/${ban.id}`);
      load();
    } catch (e) {
      console.warn(e);
    }
  };

  return (
    <View style={styles.root}>
      <SafeAreaView edges={["top"]} style={styles.headerSafe}>
        <View style={styles.headerRow}>
          <Pressable
            testID="back-btn"
            onPress={() => router.back()}
            style={styles.iconBtn}
          >
            <Ionicons name="chevron-back" size={22} color={colors.onSurface} />
          </Pressable>
          <Text style={styles.headerTitle}>Bloqueados</Text>
          <View style={{ width: 40 }} />
        </View>
        <Text style={styles.subtitle}>
          CPFs que nunca mais poderão entrar nas suas salas.
        </Text>
      </SafeAreaView>

      <FlatList
        data={bans}
        keyExtractor={(b) => b.id}
        contentContainerStyle={{ padding: spacing.lg, paddingBottom: 60 }}
        refreshControl={
          <RefreshControl
            tintColor={colors.brand}
            refreshing={refreshing}
            onRefresh={() => {
              setRefreshing(true);
              load();
            }}
          />
        }
        ListEmptyComponent={
          !loading ? (
            <View style={styles.empty}>
              <Ionicons name="shield-checkmark" size={48} color={colors.brand} />
              <Text style={styles.emptyTitle}>Nenhum bloqueio</Text>
              <Text style={styles.emptySub}>
                Quando você bloquear alguém numa denúncia, o CPF aparecerá aqui
                para sempre.
              </Text>
            </View>
          ) : null
        }
        renderItem={({ item }) => (
          <View
            testID={`ban-${item.id}`}
            style={[
              styles.card,
              !item.active && { opacity: 0.55 },
              item.type === "ban" && { borderColor: colors.error },
            ]}
          >
            {item.user?.photo ? (
              <Image
                source={{ uri: item.user.photo }}
                style={styles.avatar}
              />
            ) : (
              <View style={[styles.avatar, { backgroundColor: colors.surfaceTertiary }]} />
            )}
            <View style={{ flex: 1, gap: 2 }}>
              <View style={styles.row}>
                <Text style={styles.name}>{item.user?.name || "—"}</Text>
                <View
                  style={[
                    styles.pill,
                    item.type === "ban"
                      ? { backgroundColor: "rgba(225,29,72,0.15)", borderColor: colors.error }
                      : { backgroundColor: "rgba(199,125,255,0.15)", borderColor: colors.brand },
                  ]}
                >
                  <Text
                    style={[
                      styles.pillTxt,
                      { color: item.type === "ban" ? colors.error : colors.brand },
                    ]}
                  >
                    {TYPE_LABEL[item.type] || item.type}
                  </Text>
                </View>
              </View>
              <Text style={styles.cpf} testID={`cpf-${item.id}`}>
                CPF {item.user?.cpf ? maskCpf(item.user.cpf) : "—"}
              </Text>
              {item.expires_at ? (
                <Text style={styles.expires}>
                  {item.active ? "Expira em " : "Expirou em "}
                  {new Date(item.expires_at).toLocaleString("pt-BR")}
                </Text>
              ) : (
                <Text style={[styles.expires, { color: colors.error }]}>
                  Sem expiração — permanente
                </Text>
              )}
              <Pressable
                testID={`lift-${item.id}`}
                onPress={() => liftBan(item)}
                style={styles.liftBtn}
              >
                <Ionicons name="lock-open" size={14} color={colors.brand} />
                <Text style={styles.liftTxt}>Remover bloqueio</Text>
              </Pressable>
            </View>
          </View>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.surface },
  headerSafe: {
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    paddingBottom: spacing.md,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: 4,
  },
  iconBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.surfaceSecondary,
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: { color: colors.onSurface, fontSize: 20, fontWeight: "600" },
  subtitle: {
    color: colors.onSurfaceTertiary,
    fontSize: 13,
    paddingHorizontal: spacing.lg,
  },
  card: {
    flexDirection: "row",
    gap: spacing.md,
    padding: spacing.md,
    backgroundColor: colors.surfaceSecondary,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: spacing.sm,
  },
  avatar: { width: 56, height: 56, borderRadius: 28 },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: spacing.sm,
  },
  name: {
    color: colors.onSurface,
    fontSize: 16,
    fontWeight: "600",
    flexShrink: 1,
  },
  pill: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    borderRadius: radius.pill,
    borderWidth: 1,
  },
  pillTxt: { fontSize: 10, fontWeight: "700", letterSpacing: 0.5 },
  cpf: {
    color: colors.brand,
    fontSize: 13,
    letterSpacing: 1,
    marginTop: 2,
    fontWeight: "600",
  },
  expires: { color: colors.onSurfaceTertiary, fontSize: 11, marginTop: 2 },
  liftBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    alignSelf: "flex-start",
    paddingVertical: 6,
    marginTop: 4,
  },
  liftTxt: {
    color: colors.brand,
    fontSize: 12,
    fontWeight: "600",
    textDecorationLine: "underline",
  },
  empty: {
    alignItems: "center",
    gap: spacing.md,
    marginTop: spacing.xxxl,
    paddingHorizontal: spacing.xl,
  },
  emptyTitle: { color: colors.onSurface, fontSize: 20, fontWeight: "600" },
  emptySub: {
    color: colors.onSurfaceTertiary,
    fontSize: 14,
    textAlign: "center",
    lineHeight: 20,
  },
});
