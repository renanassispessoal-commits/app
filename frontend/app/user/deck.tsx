import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { LinearGradient } from "expo-linear-gradient";
import { router, useLocalSearchParams } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import {
  Image,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  useWindowDimensions,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { api } from "@/src/api/client";
import { colors, radius, spacing } from "@/src/theme";

type Participant = {
  id: string;
  name: string;
  age: number;
  bio: string;
  interests: string[];
  photo: string;
};

const REASONS = [
  { key: "abuse", label: "Abuso / Assédio" },
  { key: "harassment", label: "Xingamentos" },
  { key: "spam", label: "Spam / Fake" },
  { key: "other", label: "Outro" },
];

export default function Deck() {
  const { roomId, participantId } = useLocalSearchParams<{
    roomId: string;
    participantId: string;
  }>();
  const { width } = useWindowDimensions();
  const [deck, setDeck] = useState<Participant[]>([]);
  const [loading, setLoading] = useState(true);
  const [reportModal, setReportModal] = useState<Participant | null>(null);
  const [reportReason, setReportReason] = useState("abuse");
  const [reportDesc, setReportDesc] = useState("");

  const fetchDeck = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get(`/rooms/${roomId}/deck`, {
        params: { participant_id: participantId },
      });
      setDeck(res.data);
    } catch (e) {
      console.warn(e);
    } finally {
      setLoading(false);
    }
  }, [roomId, participantId]);

  useEffect(() => {
    fetchDeck();
  }, [fetchDeck]);

  const swipe = async (target: Participant, liked: boolean) => {
    try {
      Haptics.impactAsync(
        liked
          ? Haptics.ImpactFeedbackStyle.Medium
          : Haptics.ImpactFeedbackStyle.Light
      );
    } catch {}
    setDeck((d) => d.filter((p) => p.id !== target.id));
    try {
      const res = await api.post("/swipes", {
        room_id: roomId,
        participant_id: participantId,
        target_id: target.id,
        liked,
      });
      if (res.data.quota_exceeded) {
        router.push("/user/paywall");
        return;
      }
      if (res.data.is_match && res.data.match) {
        try {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        } catch {}
        router.push({
          pathname: "/user/chat",
          params: {
            matchId: res.data.match.id,
            participantId,
            roomId,
            otherName: target.name,
            otherPhoto: target.photo,
            expiresAt: res.data.match.expires_at,
          },
        });
      }
    } catch (e) {
      console.warn(e);
    }
  };

  const submitReport = async () => {
    if (!reportModal) return;
    try {
      await api.post("/reports", {
        room_id: roomId,
        reporter_id: participantId,
        reported_id: reportModal.id,
        reason: reportReason,
        description: reportDesc,
      });
    } catch (e) {
      console.warn(e);
    }
    setReportModal(null);
    setReportDesc("");
    setReportReason("abuse");
  };

  const current = deck[0];

  return (
    <View style={styles.root}>
      <SafeAreaView edges={["top"]} style={styles.headerSafe}>
        <View style={styles.headerRow}>
          <Pressable
            testID="back-btn"
            onPress={() => router.replace("/")}
            style={styles.iconBtn}
          >
            <Ionicons name="chevron-back" size={22} color={colors.onSurface} />
          </Pressable>
          <Text style={styles.brandTitle}>Te Achei</Text>
          <Pressable
            testID="matches-btn"
            onPress={() =>
              router.push({
                pathname: "/user/matches",
                params: { roomId, participantId },
              })
            }
            style={styles.iconBtn}
          >
            <Ionicons name="chatbubbles" size={22} color={colors.brand} />
          </Pressable>
        </View>
      </SafeAreaView>

      <View style={styles.deckWrap}>
        {loading ? (
          <Text style={styles.empty}>Carregando...</Text>
        ) : !current ? (
          <View style={styles.emptyBlock}>
            <Ionicons name="sparkles" size={48} color={colors.brand} />
            <Text style={styles.emptyTitle}>Fim por aqui!</Text>
            <Text style={styles.emptySub}>
              Você viu todos da sala. Volte mais tarde para conferir
              novidades.
            </Text>
            <Pressable
              testID="refresh-btn"
              onPress={fetchDeck}
              style={styles.refreshBtn}
            >
              <Text style={styles.refreshTxt}>Atualizar</Text>
            </Pressable>
          </View>
        ) : (
          <View style={[styles.card, { width: width - spacing.xl * 2 }]}>
            <Image source={{ uri: current.photo }} style={styles.cardImg} />
            <LinearGradient
              colors={["transparent", "rgba(10,0,16,0.95)"]}
              locations={[0.5, 1]}
              style={StyleSheet.absoluteFillObject}
            />
            <Pressable
              testID="report-btn"
              onPress={() => setReportModal(current)}
              style={styles.reportBtn}
              hitSlop={8}
            >
              <Ionicons name="warning" size={18} color={colors.error} />
            </Pressable>
            <View style={styles.cardMeta}>
              <Text style={styles.cardName}>
                {current.name}, {current.age}
              </Text>
              {current.bio ? (
                <Text style={styles.cardBio} numberOfLines={3}>
                  {current.bio}
                </Text>
              ) : null}
              {current.interests?.length > 0 && (
                <View style={styles.interestRow}>
                  {current.interests.slice(0, 4).map((i) => (
                    <View key={i} style={styles.tag}>
                      <Text style={styles.tagTxt}>{i}</Text>
                    </View>
                  ))}
                </View>
              )}
            </View>
          </View>
        )}
      </View>

      {current && !loading && (
        <View style={styles.actionRow}>
          <View style={styles.actionCol}>
            <Pressable
              testID="pass-btn"
              onPress={() => swipe(current, false)}
              style={[styles.actionBtn, styles.passBtn]}
            >
              <Ionicons name="close" size={36} color={colors.error} />
            </Pressable>
            <Text style={styles.actionLabel}>NÃO VI</Text>
          </View>
          <View style={styles.actionCol}>
            <Pressable
              testID="like-btn"
              onPress={() => swipe(current, true)}
              style={[styles.actionBtn, styles.likeBtn]}
            >
              <Ionicons name="eye" size={34} color={colors.brand} />
            </Pressable>
            <Text style={[styles.actionLabel, { color: colors.brand }]}>TE VI</Text>
          </View>
        </View>
      )}

      {/* Report Modal */}
      <Modal
        transparent
        visible={!!reportModal}
        animationType="slide"
        onRequestClose={() => setReportModal(null)}
      >
        <View style={styles.reportOverlay}>
          <View style={styles.reportSheet}>
            <View style={styles.reportHandle} />
            <Text style={styles.reportTitle}>
              Denunciar {reportModal?.name}
            </Text>
            <Text style={styles.reportSubtitle}>
              Sua denúncia é enviada ao anfitrião da sala.
            </Text>
            <ScrollView style={{ maxHeight: 300 }}>
              {REASONS.map((r) => (
                <Pressable
                  key={r.key}
                  testID={`reason-${r.key}`}
                  onPress={() => setReportReason(r.key)}
                  style={[
                    styles.reasonRow,
                    reportReason === r.key && styles.reasonRowActive,
                  ]}
                >
                  <Ionicons
                    name={
                      reportReason === r.key
                        ? "radio-button-on"
                        : "radio-button-off"
                    }
                    size={20}
                    color={
                      reportReason === r.key
                        ? colors.brand
                        : colors.onSurfaceTertiary
                    }
                  />
                  <Text style={styles.reasonText}>{r.label}</Text>
                </Pressable>
              ))}
              <TextInput
                testID="report-desc"
                value={reportDesc}
                onChangeText={setReportDesc}
                placeholder="Descreva (opcional)..."
                placeholderTextColor={colors.onSurfaceTertiary}
                multiline
                style={styles.reportInput}
              />
            </ScrollView>
            <View style={{ flexDirection: "row", gap: spacing.sm }}>
              <Pressable
                testID="report-cancel"
                onPress={() => setReportModal(null)}
                style={[
                  styles.reportBtnCta,
                  { backgroundColor: colors.surfaceTertiary, flex: 1 },
                ]}
              >
                <Text style={styles.reportBtnTxt}>Cancelar</Text>
              </Pressable>
              <Pressable
                testID="report-submit"
                onPress={submitReport}
                style={[
                  styles.reportBtnCta,
                  { backgroundColor: colors.error, flex: 1 },
                ]}
              >
                <Text style={styles.reportBtnTxt}>Enviar denúncia</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.surface },
  headerSafe: { backgroundColor: colors.surface },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
  },
  iconBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.surfaceSecondary,
    alignItems: "center",
    justifyContent: "center",
  },
  brandTitle: { color: colors.onSurface, fontSize: 16, fontWeight: "600" },
  deckWrap: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: spacing.xl,
  },
  empty: { color: colors.onSurfaceTertiary, fontSize: 16 },
  emptyBlock: {
    alignItems: "center",
    gap: spacing.md,
    paddingHorizontal: spacing.xl,
  },
  emptyTitle: { color: colors.onSurface, fontSize: 22, fontWeight: "600" },
  emptySub: {
    color: colors.onSurfaceTertiary,
    textAlign: "center",
    fontSize: 14,
    lineHeight: 20,
    maxWidth: 280,
  },
  refreshBtn: {
    marginTop: spacing.md,
    backgroundColor: colors.brandPrimary,
    paddingHorizontal: spacing.xl,
    paddingVertical: 14,
    borderRadius: radius.pill,
  },
  refreshTxt: { color: "#fff", fontWeight: "600" },
  card: {
    aspectRatio: 3 / 4,
    borderRadius: radius.lg,
    overflow: "hidden",
    backgroundColor: colors.surfaceSecondary,
  },
  cardImg: { width: "100%", height: "100%" },
  reportBtn: {
    position: "absolute",
    top: spacing.md,
    right: spacing.md,
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: "rgba(10,0,16,0.6)",
    alignItems: "center",
    justifyContent: "center",
  },
  cardMeta: {
    position: "absolute",
    left: spacing.lg,
    right: spacing.lg,
    bottom: spacing.lg,
    gap: spacing.sm,
  },
  cardName: { color: colors.onSurface, fontSize: 28, fontWeight: "600" },
  cardBio: { color: colors.onSurfaceSecondary, fontSize: 14, lineHeight: 20 },
  interestRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    marginTop: 4,
  },
  tag: {
    backgroundColor: "rgba(199,125,255,0.18)",
    borderColor: colors.brand,
    borderWidth: 1,
    borderRadius: radius.pill,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  tagTxt: { color: colors.brand, fontSize: 11, fontWeight: "600" },
  actionRow: {
    flexDirection: "row",
    justifyContent: "center",
    gap: spacing.xxl,
    paddingBottom: spacing.xl,
    paddingTop: spacing.md,
  },
  actionCol: { alignItems: "center", gap: spacing.sm },
  actionBtn: {
    width: 76,
    height: 76,
    borderRadius: 38,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1.5,
  },
  actionLabel: {
    color: colors.onSurfaceTertiary,
    fontSize: 11,
    letterSpacing: 2,
    fontWeight: "700",
  },
  passBtn: {
    backgroundColor: colors.surfaceSecondary,
    borderColor: colors.error,
  },
  likeBtn: {
    backgroundColor: colors.surfaceSecondary,
    borderColor: colors.brand,
  },
  reportOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.7)",
    justifyContent: "flex-end",
  },
  reportSheet: {
    backgroundColor: colors.surfaceSecondary,
    padding: spacing.lg,
    paddingBottom: spacing.xxl,
    borderTopLeftRadius: radius.lg,
    borderTopRightRadius: radius.lg,
    gap: spacing.md,
  },
  reportHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.borderStrong,
    alignSelf: "center",
  },
  reportTitle: { color: colors.onSurface, fontSize: 20, fontWeight: "600" },
  reportSubtitle: { color: colors.onSurfaceTertiary, fontSize: 13 },
  reasonRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    paddingVertical: 14,
    paddingHorizontal: spacing.md,
    borderRadius: radius.md,
  },
  reasonRowActive: { backgroundColor: colors.surfaceTertiary },
  reasonText: { color: colors.onSurface, fontSize: 15 },
  reportInput: {
    backgroundColor: colors.surfaceTertiary,
    color: colors.onSurface,
    padding: spacing.md,
    borderRadius: radius.md,
    marginTop: spacing.md,
    minHeight: 80,
    textAlignVertical: "top",
  },
  reportBtnCta: {
    paddingVertical: 14,
    borderRadius: radius.pill,
    alignItems: "center",
  },
  reportBtnTxt: { color: "#fff", fontWeight: "600" },
});
