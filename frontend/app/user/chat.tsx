import { Ionicons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  FlatList,
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { api } from "@/src/api/client";
import { colors, radius, spacing } from "@/src/theme";

type Msg = {
  id: string;
  sender_id: string;
  text: string;
  created_at: string;
};

export default function Chat() {
  const { matchId, participantId, roomId, otherName, otherPhoto, expiresAt } =
    useLocalSearchParams<{
      matchId: string;
      participantId: string;
      roomId: string;
      otherName: string;
      otherPhoto: string;
      expiresAt: string;
    }>();
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState<number>(() => {
    if (!expiresAt) return 5 * 60;
    const exp = new Date(expiresAt).getTime();
    return Math.max(0, Math.floor((exp - Date.now()) / 1000));
  });
  const listRef = useRef<FlatList<Msg>>(null);
  const expiredHandledRef = useRef(false);

  const load = useCallback(async () => {
    try {
      const res = await api.get(`/matches/${matchId}/messages`);
      setMsgs(res.data);
    } catch (e: any) {
      if (e?.response?.status === 410) {
        // Match expired on the server
        handleExpired();
      }
    }
  }, [matchId]);

  const handleExpired = useCallback(() => {
    if (expiredHandledRef.current) return;
    expiredHandledRef.current = true;
    setMsgs([]);
    router.replace({
      pathname: "/user/deck",
      params: { roomId, participantId, expired: "1" },
    });
  }, [roomId, participantId]);

  useEffect(() => {
    load();
    const id = setInterval(load, 4000);
    return () => clearInterval(id);
  }, [load]);

  // Countdown timer
  useEffect(() => {
    if (secondsLeft <= 0) {
      handleExpired();
      return;
    }
    const t = setInterval(() => {
      setSecondsLeft((s) => {
        const next = s - 1;
        if (next <= 0) {
          clearInterval(t);
          handleExpired();
          return 0;
        }
        return next;
      });
    }, 1000);
    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 100);
  }, [msgs.length]);

  const send = async () => {
    const t = text.trim();
    if (!t || secondsLeft <= 0) return;
    setText("");
    setSending(true);
    try {
      const res = await api.post(`/matches/${matchId}/messages`, {
        participant_id: participantId,
        text: t,
      });
      setMsgs((m) => [...m, res.data]);
    } catch (e: any) {
      if (e?.response?.status === 410) handleExpired();
    } finally {
      setSending(false);
    }
  };

  const timer = useMemo(() => {
    const m = Math.floor(secondsLeft / 60);
    const s = secondsLeft % 60;
    return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  }, [secondsLeft]);

  const danger = secondsLeft <= 60;

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
          <View style={styles.headerCenter}>
            <Image source={{ uri: otherPhoto }} style={styles.headerAvatar} />
            <Text style={styles.headerName} numberOfLines={1}>
              {otherName}
            </Text>
          </View>
          <View
            testID="match-timer"
            style={[
              styles.timerPill,
              danger && { borderColor: colors.error, backgroundColor: "rgba(225,29,72,0.15)" },
            ]}
          >
            <Ionicons
              name="hourglass"
              size={14}
              color={danger ? colors.error : colors.brand}
            />
            <Text
              style={[
                styles.timerTxt,
                { color: danger ? colors.error : colors.brand },
              ]}
            >
              {timer}
            </Text>
          </View>
        </View>
        <View style={styles.banner}>
          <Ionicons name="flash" size={12} color={colors.brand} />
          <Text style={styles.bannerTxt}>
            Vocês têm 5 minutos para se encontrar no rolê. Depois, o match
            some.
          </Text>
        </View>
      </SafeAreaView>
      <FlatList
        ref={listRef}
        data={msgs}
        keyExtractor={(m) => m.id}
        contentContainerStyle={{ padding: spacing.lg, gap: spacing.sm }}
        renderItem={({ item }) => {
          const mine = item.sender_id === participantId;
          return (
            <View
              style={[
                styles.bubble,
                mine ? styles.bubbleMine : styles.bubbleOther,
              ]}
            >
              <Text
                style={[
                  styles.bubbleText,
                  mine && { color: colors.onBrandPrimary },
                ]}
              >
                {item.text}
              </Text>
            </View>
          );
        }}
      />
      <View style={styles.inputRow}>
        <TextInput
          testID="chat-input"
          value={text}
          onChangeText={setText}
          placeholder={secondsLeft > 0 ? "Mensagem..." : "Tempo esgotado"}
          placeholderTextColor={colors.onSurfaceTertiary}
          style={styles.input}
          multiline
          maxLength={500}
          editable={secondsLeft > 0}
        />
        <Pressable
          testID="chat-send"
          onPress={send}
          disabled={!text.trim() || sending || secondsLeft <= 0}
          style={[
            styles.sendBtn,
            (!text.trim() || sending || secondsLeft <= 0) && { opacity: 0.5 },
          ]}
        >
          <Ionicons name="send" size={20} color="#fff" />
        </Pressable>
      </View>
    </KeyboardAvoidingView>
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
    paddingVertical: spacing.sm,
    gap: spacing.sm,
  },
  iconBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.surfaceSecondary,
    alignItems: "center",
    justifyContent: "center",
  },
  headerCenter: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  headerAvatar: { width: 36, height: 36, borderRadius: 18 },
  headerName: { color: colors.onSurface, fontWeight: "600", fontSize: 15, flex: 1 },
  timerPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.brand,
    backgroundColor: "rgba(199,125,255,0.12)",
  },
  timerTxt: { fontSize: 14, fontWeight: "700", letterSpacing: 1 },
  banner: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.sm,
  },
  bannerTxt: { color: colors.onSurfaceTertiary, fontSize: 12, flex: 1 },
  bubble: {
    maxWidth: "80%",
    padding: spacing.md,
    borderRadius: radius.md,
  },
  bubbleMine: {
    backgroundColor: colors.brandPrimary,
    alignSelf: "flex-end",
    borderBottomRightRadius: 4,
  },
  bubbleOther: {
    backgroundColor: colors.surfaceSecondary,
    alignSelf: "flex-start",
    borderBottomLeftRadius: 4,
  },
  bubbleText: { color: colors.onSurface, fontSize: 15 },
  inputRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: spacing.sm,
    padding: spacing.md,
    backgroundColor: colors.surfaceSecondary,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  input: {
    flex: 1,
    backgroundColor: colors.surfaceTertiary,
    color: colors.onSurface,
    paddingHorizontal: spacing.lg,
    paddingVertical: 12,
    borderRadius: radius.pill,
    fontSize: 15,
    maxHeight: 100,
  },
  sendBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.brandPrimary,
    alignItems: "center",
    justifyContent: "center",
  },
});
