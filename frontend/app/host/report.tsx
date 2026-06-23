import { Ionicons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  FlatList,
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { api } from "@/src/api/client";
import { colors, radius, spacing } from "@/src/theme";

const REASON_LABEL: Record<string, string> = {
  abuse: "Abuso/Assédio",
  harassment: "Xingamentos",
  spam: "Spam",
  other: "Outro",
};

const ACTIONS = [
  { key: "timeout_1d", label: "Timeout 24h", icon: "time" as const },
  { key: "timeout_30d", label: "Timeout 30 dias", icon: "alarm" as const },
  { key: "ban", label: "Banir para sempre", icon: "ban" as const },
];

export default function ReportDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [report, setReport] = useState<any>(null);
  const [msgs, setMsgs] = useState<any[]>([]);
  const [text, setText] = useState("");
  const [acting, setActing] = useState(false);
  const listRef = useRef<FlatList<any>>(null);

  const load = useCallback(async () => {
    try {
      const [r, m] = await Promise.all([
        api.get(`/reports/${id}`),
        api.get(`/reports/${id}/messages`),
      ]);
      setReport(r.data);
      setMsgs(m.data);
    } catch (e) {
      console.warn(e);
    }
  }, [id]);

  useEffect(() => {
    load();
    const i = setInterval(load, 5000);
    return () => clearInterval(i);
  }, [load]);

  const send = async () => {
    const t = text.trim();
    if (!t) return;
    setText("");
    try {
      const res = await api.post(`/reports/${id}/messages`, { text: t });
      setMsgs((m) => [...m, res.data]);
      setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 80);
    } catch (e) {
      console.warn(e);
    }
  };

  const takeAction = async (action: string) => {
    setActing(true);
    try {
      await api.post(`/reports/${id}/action`, { action });
      await load();
    } catch (e) {
      console.warn(e);
    } finally {
      setActing(false);
    }
  };

  if (!report) {
    return (
      <View style={[styles.root, { alignItems: "center", justifyContent: "center" }]}>
        <Text style={{ color: colors.onSurfaceTertiary }}>Carregando...</Text>
      </View>
    );
  }

  const ban = report.existing_ban;

  return (
    <KeyboardAvoidingView
      style={styles.root}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <SafeAreaView edges={["top"]} style={styles.headerSafe}>
        <View style={styles.headerRow}>
          <Pressable
            testID="back-btn"
            onPress={() => router.back()}
            style={styles.iconBtn}
          >
            <Ionicons name="chevron-back" size={22} color={colors.onSurface} />
          </Pressable>
          <Text style={styles.headerTitle}>Detalhe da denúncia</Text>
          <View style={{ width: 40 }} />
        </View>
      </SafeAreaView>

      <ScrollView contentContainerStyle={{ padding: spacing.lg, gap: spacing.lg, paddingBottom: 60 }}>
        <View style={styles.reasonTag}>
          <Ionicons name="warning" size={14} color={colors.error} />
          <Text style={styles.reasonTxt}>
            {REASON_LABEL[report.reason] || report.reason}
          </Text>
          <Text style={styles.statusTxt}>
            {report.status === "open" ? "ABERTA" : "RESOLVIDA"}
          </Text>
        </View>

        <View style={styles.profileRow}>
          <ProfileCard
            label="DENUNCIANTE"
            participant={report.reporter}
            tint={colors.brand}
          />
          <Ionicons
            name="arrow-forward"
            size={18}
            color={colors.onSurfaceTertiary}
          />
          <ProfileCard
            label="DENUNCIADO"
            participant={report.reported}
            tint={colors.error}
          />
        </View>

        {report.description ? (
          <View style={styles.descBox}>
            <Text style={styles.descLabel}>RELATO</Text>
            <Text style={styles.descTxt}>{report.description}</Text>
          </View>
        ) : null}

        {ban && (
          <View style={styles.banBox} testID="ban-status">
            <Ionicons name="lock-closed" size={20} color={colors.error} />
            <View style={{ flex: 1 }}>
              <Text style={styles.banTitle}>
                {ban.type === "ban"
                  ? "Banido para sempre"
                  : ban.type === "timeout_30d"
                  ? "Timeout 30 dias"
                  : "Timeout 24h"}
              </Text>
              {ban.expires_at && (
                <Text style={styles.banSub}>
                  Expira em {new Date(ban.expires_at).toLocaleString("pt-BR")}
                </Text>
              )}
            </View>
          </View>
        )}

        <View>
          <Text style={styles.sectionLabel}>
            CONVERSA COM O DENUNCIANTE
          </Text>
          <View style={styles.chatBox}>
            {msgs.length === 0 ? (
              <Text style={styles.chatEmpty}>
                Mande a primeira mensagem para entender o ocorrido com{" "}
                {report.reporter?.name || "o denunciante"}.
              </Text>
            ) : (
              <FlatList
                ref={listRef}
                data={msgs}
                keyExtractor={(m) => m.id}
                contentContainerStyle={{ gap: 6 }}
                scrollEnabled={false}
                renderItem={({ item }) => {
                  const isHost = item.sender_role === "host";
                  return (
                    <View
                      style={[
                        styles.bubble,
                        isHost ? styles.bubbleHost : styles.bubbleReporter,
                      ]}
                    >
                      <Text
                        style={[
                          styles.bubbleLabel,
                          isHost && { color: "#E0AAFF" },
                        ]}
                      >
                        {isHost ? "ANFITRIÃO" : (report.reporter?.name || "DENUNCIANTE").toUpperCase()}
                      </Text>
                      <Text
                        style={[
                          styles.bubbleTxt,
                          isHost && { color: "#fff" },
                        ]}
                      >
                        {item.text}
                      </Text>
                    </View>
                  );
                }}
              />
            )}
          </View>
          <View style={styles.inputRow}>
            <TextInput
              testID="report-chat-input"
              value={text}
              onChangeText={setText}
              placeholder="Pergunte ao denunciante..."
              placeholderTextColor={colors.onSurfaceTertiary}
              style={styles.input}
              multiline
              maxLength={400}
            />
            <Pressable
              testID="report-chat-send"
              onPress={send}
              disabled={!text.trim()}
              style={[styles.sendBtn, !text.trim() && { opacity: 0.5 }]}
            >
              <Ionicons name="send" size={18} color="#fff" />
            </Pressable>
          </View>
        </View>

        <View>
          <Text style={styles.sectionLabel}>AÇÃO CONTRA O DENUNCIADO</Text>
          <View style={styles.actionsGrid}>
            {ACTIONS.map((a) => (
              <Pressable
                key={a.key}
                testID={`action-${a.key}`}
                onPress={() => takeAction(a.key)}
                disabled={acting}
                style={[
                  styles.actionBtn,
                  a.key === "ban" && { borderColor: colors.error },
                ]}
              >
                <Ionicons
                  name={a.icon}
                  size={20}
                  color={a.key === "ban" ? colors.error : colors.brand}
                />
                <Text
                  style={[
                    styles.actionTxt,
                    a.key === "ban" && { color: colors.error },
                  ]}
                >
                  {a.label}
                </Text>
              </Pressable>
            ))}
          </View>
          <Text style={styles.actionHelp}>
            A ação bloqueia o usuário de entrar em qualquer sala criada por
            você (vinculada ao seu login).
          </Text>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function ProfileCard({
  label,
  participant,
  tint,
}: {
  label: string;
  participant: any;
  tint: string;
}) {
  if (!participant)
    return (
      <View style={[styles.profileCard, { flex: 1 }]}>
        <Text style={styles.profileEmpty}>—</Text>
      </View>
    );
  return (
    <View style={[styles.profileCard, { flex: 1, borderColor: tint }]}>
      <Text style={[styles.profileLabel, { color: tint }]}>{label}</Text>
      {participant.photo ? (
        <Image source={{ uri: participant.photo }} style={styles.profileImg} />
      ) : (
        <View style={[styles.profileImg, { backgroundColor: colors.surfaceTertiary }]} />
      )}
      <Text style={styles.profileName} numberOfLines={1}>
        {participant.name}, {participant.age}
      </Text>
      {participant.bio ? (
        <Text style={styles.profileBio} numberOfLines={2}>
          {participant.bio}
        </Text>
      ) : null}
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
  headerTitle: { color: colors.onSurface, fontSize: 16, fontWeight: "600" },
  reasonTag: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    backgroundColor: "rgba(225,29,72,0.12)",
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.error,
    alignSelf: "flex-start",
  },
  reasonTxt: { color: colors.error, fontSize: 12, fontWeight: "700", letterSpacing: 1 },
  statusTxt: { color: colors.onSurfaceTertiary, fontSize: 10, letterSpacing: 1, marginLeft: 4 },
  profileRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  profileCard: {
    backgroundColor: colors.surfaceSecondary,
    borderRadius: radius.md,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: "center",
    gap: 6,
  },
  profileLabel: { fontSize: 10, letterSpacing: 1.5, fontWeight: "700" },
  profileImg: { width: 64, height: 64, borderRadius: 32 },
  profileName: { color: colors.onSurface, fontWeight: "600", fontSize: 13 },
  profileBio: {
    color: colors.onSurfaceTertiary,
    fontSize: 11,
    textAlign: "center",
  },
  profileEmpty: { color: colors.onSurfaceTertiary },
  descBox: {
    backgroundColor: colors.surfaceSecondary,
    borderRadius: radius.md,
    padding: spacing.lg,
    borderLeftWidth: 3,
    borderLeftColor: colors.error,
    gap: spacing.xs,
  },
  descLabel: { color: colors.onSurfaceTertiary, fontSize: 10, letterSpacing: 2, fontWeight: "700" },
  descTxt: { color: colors.onSurface, fontSize: 14, fontStyle: "italic", lineHeight: 20 },
  banBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    backgroundColor: "rgba(225,29,72,0.10)",
    padding: spacing.lg,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.error,
  },
  banTitle: { color: colors.error, fontWeight: "700" },
  banSub: { color: colors.onSurfaceTertiary, fontSize: 12, marginTop: 2 },
  sectionLabel: {
    color: colors.onSurfaceTertiary,
    fontSize: 10,
    letterSpacing: 2,
    fontWeight: "700",
    marginBottom: spacing.sm,
  },
  chatBox: {
    backgroundColor: colors.surfaceSecondary,
    borderRadius: radius.md,
    padding: spacing.md,
    minHeight: 80,
    gap: 6,
  },
  chatEmpty: {
    color: colors.onSurfaceTertiary,
    fontSize: 12,
    fontStyle: "italic",
    textAlign: "center",
    padding: spacing.md,
  },
  bubble: {
    padding: spacing.sm,
    borderRadius: radius.sm,
    maxWidth: "85%",
  },
  bubbleHost: {
    backgroundColor: colors.brandPrimary,
    alignSelf: "flex-end",
  },
  bubbleReporter: {
    backgroundColor: colors.surfaceTertiary,
    alignSelf: "flex-start",
  },
  bubbleLabel: { fontSize: 9, letterSpacing: 1, color: colors.brand, marginBottom: 2, fontWeight: "700" },
  bubbleTxt: { color: colors.onSurface, fontSize: 13 },
  inputRow: { flexDirection: "row", gap: spacing.sm, marginTop: spacing.sm },
  input: {
    flex: 1,
    backgroundColor: colors.surfaceSecondary,
    color: colors.onSurface,
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
    borderRadius: radius.pill,
    fontSize: 14,
    maxHeight: 80,
    borderWidth: 1,
    borderColor: colors.border,
  },
  sendBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.brandPrimary,
    alignItems: "center",
    justifyContent: "center",
  },
  actionsGrid: { gap: spacing.sm },
  actionBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    backgroundColor: colors.surfaceSecondary,
    paddingHorizontal: spacing.lg,
    paddingVertical: 14,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.brand,
  },
  actionTxt: { color: colors.brand, fontSize: 14, fontWeight: "600" },
  actionHelp: {
    color: colors.onSurfaceTertiary,
    fontSize: 11,
    textAlign: "center",
    marginTop: spacing.sm,
    lineHeight: 16,
  },
});
