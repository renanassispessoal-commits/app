import { Ionicons } from "@expo/vector-icons";
import { router, useLocalSearchParams, useFocusEffect } from "expo-router";
import { useCallback, useState } from "react";
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import QRCode from "react-native-qrcode-svg";
import { SafeAreaView } from "react-native-safe-area-context";
import { api } from "@/src/api/client";
import { colors, radius, spacing } from "@/src/theme";

type Room = {
  id: string;
  code: string;
  name: string;
  description: string;
  active: boolean;
};

type Stats = {
  participants: number;
  swipes: number;
  likes: number;
  matches: number;
  reports_open: number;
};

type Report = {
  id: string;
  reason: string;
  description: string;
  status: string;
  created_at: string;
  reporter?: { name: string };
  reported?: { name: string };
};

const REASON_LABEL: Record<string, string> = {
  abuse: "Abuso/Assédio",
  harassment: "Xingamentos",
  spam: "Spam",
  other: "Outro",
};

export default function HostRoom() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [room, setRoom] = useState<Room | null>(null);
  const [stats, setStats] = useState<Stats | null>(null);
  const [reports, setReports] = useState<Report[]>([]);
  const [tab, setTab] = useState<"qr" | "reports">("qr");

  const load = useCallback(async () => {
    try {
      const [rRes, sRes, repRes] = await Promise.all([
        api.get(`/rooms/${id}`),
        api.get(`/rooms/${id}/stats`),
        api.get(`/rooms/${id}/reports`),
      ]);
      setRoom(rRes.data);
      setStats(sRes.data);
      setReports(repRes.data);
    } catch (e) {
      console.warn(e);
    }
  }, [id]);

  useFocusEffect(
    useCallback(() => {
      load();
      const i = setInterval(load, 8000);
      return () => clearInterval(i);
    }, [load])
  );

  const closeRoom = async () => {
    try {
      await api.post(`/rooms/${id}/close`);
      load();
    } catch (e) {
      console.warn(e);
    }
  };

  const resolveReport = async (rid: string) => {
    try {
      await api.put(`/reports/${rid}/resolve`);
      load();
    } catch (e) {
      console.warn(e);
    }
  };

  if (!room) {
    return (
      <View style={[styles.root, { alignItems: "center", justifyContent: "center" }]}>
        <Text style={{ color: colors.onSurfaceTertiary }}>Carregando...</Text>
      </View>
    );
  }

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
          <Text style={styles.headerTitle} numberOfLines={1}>{room.name}</Text>
          <View style={{ width: 40 }} />
        </View>

        <View style={styles.tabRow}>
          <Pressable
            testID="tab-qr"
            onPress={() => setTab("qr")}
            style={[styles.tab, tab === "qr" && styles.tabActive]}
          >
            <Text style={[styles.tabTxt, tab === "qr" && styles.tabTxtActive]}>
              QR & Stats
            </Text>
          </Pressable>
          <Pressable
            testID="tab-reports"
            onPress={() => setTab("reports")}
            style={[styles.tab, tab === "reports" && styles.tabActive]}
          >
            <Text style={[styles.tabTxt, tab === "reports" && styles.tabTxtActive]}>
              Denúncias{" "}
              {stats && stats.reports_open > 0 ? `(${stats.reports_open})` : ""}
            </Text>
          </Pressable>
        </View>
      </SafeAreaView>

      <ScrollView contentContainerStyle={{ padding: spacing.lg, paddingBottom: 100 }}>
        {tab === "qr" ? (
          <>
            <View style={styles.qrCard}>
              <View style={styles.qrBox}>
                <QRCode
                  value={room.code}
                  size={220}
                  color={colors.surface}
                  backgroundColor="#fff"
                />
              </View>
              <Text style={styles.codeLabel}>CÓDIGO DA SALA</Text>
              <Text testID="room-code" style={styles.codeBig}>{room.code}</Text>
              <Text style={styles.qrHint}>
                Mostre este QR Code para os convidados entrarem na sala.
              </Text>
            </View>

            <Text style={styles.sectionLabel}>Estatísticas em tempo real</Text>
            <View style={styles.statsGrid}>
              <View style={styles.statCard}>
                <Text style={styles.statValue}>{stats?.participants ?? 0}</Text>
                <Text style={styles.statLabel}>Pessoas</Text>
              </View>
              <View style={styles.statCard}>
                <Text style={styles.statValue}>{stats?.matches ?? 0}</Text>
                <Text style={styles.statLabel}>Matches</Text>
              </View>
              <View style={styles.statCard}>
                <Text style={styles.statValue}>{stats?.likes ?? 0}</Text>
                <Text style={styles.statLabel}>Curtidas</Text>
              </View>
              <View style={styles.statCard}>
                <Text style={styles.statValue}>{stats?.swipes ?? 0}</Text>
                <Text style={styles.statLabel}>Swipes</Text>
              </View>
            </View>

            {room.active && (
              <Pressable
                testID="close-room-btn"
                onPress={closeRoom}
                style={styles.closeBtn}
              >
                <Ionicons name="lock-closed" size={18} color={colors.error} />
                <Text style={styles.closeBtnTxt}>Encerrar sala</Text>
              </Pressable>
            )}
          </>
        ) : (
          <>
            {reports.length === 0 ? (
              <View style={styles.empty}>
                <Ionicons name="shield-checkmark" size={48} color={colors.brand} />
                <Text style={styles.emptyTitle}>Sem denúncias</Text>
                <Text style={styles.emptySub}>
                  Tudo tranquilo na sua sala.
                </Text>
              </View>
            ) : (
              reports.map((r) => (
                <View key={r.id} style={styles.reportCard}>
                  <View style={styles.reportHead}>
                    <View
                      style={[
                        styles.reasonTag,
                        {
                          backgroundColor:
                            r.status === "open"
                              ? "rgba(225,29,72,0.15)"
                              : colors.surfaceTertiary,
                        },
                      ]}
                    >
                      <Text
                        style={[
                          styles.reasonTagTxt,
                          {
                            color:
                              r.status === "open" ? colors.error : colors.onSurfaceTertiary,
                          },
                        ]}
                      >
                        {REASON_LABEL[r.reason] || r.reason}
                      </Text>
                    </View>
                    <Text style={styles.reportStatus}>
                      {r.status === "open" ? "Aberta" : "Resolvida"}
                    </Text>
                  </View>
                  <Text style={styles.reportLine}>
                    <Text style={styles.reportBold}>{r.reporter?.name || "—"}</Text> denunciou{" "}
                    <Text style={styles.reportBold}>{r.reported?.name || "—"}</Text>
                  </Text>
                  {r.description ? (
                    <Text style={styles.reportDesc}>{r.description}</Text>
                  ) : null}
                  {r.status === "open" && (
                    <Pressable
                      testID={`resolve-${r.id}`}
                      onPress={() => resolveReport(r.id)}
                      style={styles.resolveBtn}
                    >
                      <Text style={styles.resolveBtnTxt}>
                        Marcar como resolvida
                      </Text>
                    </Pressable>
                  )}
                </View>
              ))
            )}
          </>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.surface },
  headerSafe: {
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
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
  headerTitle: { color: colors.onSurface, fontSize: 16, fontWeight: "600", flex: 1, textAlign: "center" },
  tabRow: {
    flexDirection: "row",
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.sm,
    gap: spacing.sm,
  },
  tab: {
    paddingHorizontal: spacing.lg,
    paddingVertical: 10,
    borderRadius: radius.pill,
    backgroundColor: colors.surfaceSecondary,
  },
  tabActive: { backgroundColor: colors.brandPrimary },
  tabTxt: { color: colors.onSurfaceTertiary, fontSize: 13, fontWeight: "500" },
  tabTxtActive: { color: "#fff", fontWeight: "700" },
  qrCard: {
    backgroundColor: colors.surfaceSecondary,
    padding: spacing.xl,
    borderRadius: radius.lg,
    alignItems: "center",
    gap: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  qrBox: { padding: spacing.md, backgroundColor: "#fff", borderRadius: radius.md },
  codeLabel: { color: colors.onSurfaceTertiary, fontSize: 11, letterSpacing: 2 },
  codeBig: {
    color: colors.brand,
    fontSize: 42,
    fontWeight: "700",
    letterSpacing: 6,
  },
  qrHint: {
    color: colors.onSurfaceTertiary,
    fontSize: 13,
    textAlign: "center",
    maxWidth: 280,
  },
  sectionLabel: {
    color: colors.onSurfaceTertiary,
    fontSize: 11,
    letterSpacing: 2,
    textTransform: "uppercase",
    marginTop: spacing.xl,
    marginBottom: spacing.md,
  },
  statsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
  },
  statCard: {
    flexBasis: "48%",
    flexGrow: 1,
    backgroundColor: colors.surfaceSecondary,
    padding: spacing.lg,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  statValue: { color: colors.brand, fontSize: 30, fontWeight: "700" },
  statLabel: {
    color: colors.onSurfaceTertiary,
    fontSize: 12,
    letterSpacing: 1,
    textTransform: "uppercase",
    marginTop: 4,
  },
  closeBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.sm,
    paddingVertical: 16,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.error,
    marginTop: spacing.xl,
  },
  closeBtnTxt: { color: colors.error, fontWeight: "600" },
  empty: { alignItems: "center", gap: spacing.md, marginTop: spacing.xxxl },
  emptyTitle: { color: colors.onSurface, fontSize: 20, fontWeight: "600" },
  emptySub: { color: colors.onSurfaceTertiary, fontSize: 14 },
  reportCard: {
    backgroundColor: colors.surfaceSecondary,
    borderRadius: radius.md,
    padding: spacing.lg,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
    gap: spacing.sm,
  },
  reportHead: { flexDirection: "row", justifyContent: "space-between" },
  reasonTag: {
    paddingHorizontal: spacing.md,
    paddingVertical: 4,
    borderRadius: radius.pill,
  },
  reasonTagTxt: { fontSize: 11, fontWeight: "700" },
  reportStatus: { color: colors.onSurfaceTertiary, fontSize: 12 },
  reportLine: { color: colors.onSurface, fontSize: 14 },
  reportBold: { fontWeight: "700" },
  reportDesc: {
    color: colors.onSurfaceSecondary,
    fontSize: 13,
    fontStyle: "italic",
  },
  resolveBtn: {
    marginTop: spacing.sm,
    backgroundColor: colors.brandTertiary,
    paddingVertical: 10,
    borderRadius: radius.pill,
    alignItems: "center",
  },
  resolveBtnTxt: { color: colors.brandSecondary, fontWeight: "600" },
});
