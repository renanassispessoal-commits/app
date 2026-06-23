import { Ionicons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import { useCallback, useEffect, useRef, useState } from "react";
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
  const { matchId, participantId, otherName, otherPhoto } = useLocalSearchParams<{
    matchId: string;
    participantId: string;
    otherName: string;
    otherPhoto: string;
  }>();
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const listRef = useRef<FlatList<Msg>>(null);

  const load = useCallback(async () => {
    try {
      const res = await api.get(`/matches/${matchId}/messages`);
      setMsgs(res.data);
    } catch (e) {
      console.warn(e);
    }
  }, [matchId]);

  useEffect(() => {
    load();
    const id = setInterval(load, 4000); // simple polling
    return () => clearInterval(id);
  }, [load]);

  useEffect(() => {
    setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 100);
  }, [msgs.length]);

  const send = async () => {
    const t = text.trim();
    if (!t) return;
    setText("");
    setSending(true);
    try {
      const res = await api.post(`/matches/${matchId}/messages`, {
        participant_id: participantId,
        text: t,
      });
      setMsgs((m) => [...m, res.data]);
    } catch (e) {
      console.warn(e);
    } finally {
      setSending(false);
    }
  };

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
            <Text style={styles.headerName}>{otherName}</Text>
          </View>
          <View style={{ width: 40 }} />
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
          placeholder="Mensagem..."
          placeholderTextColor={colors.onSurfaceTertiary}
          style={styles.input}
          multiline
          maxLength={500}
        />
        <Pressable
          testID="chat-send"
          onPress={send}
          disabled={!text.trim() || sending}
          style={[
            styles.sendBtn,
            (!text.trim() || sending) && { opacity: 0.5 },
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
  headerSafe: { backgroundColor: colors.surface, borderBottomWidth: 1, borderBottomColor: colors.border },
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
  headerCenter: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  headerAvatar: { width: 36, height: 36, borderRadius: 18 },
  headerName: { color: colors.onSurface, fontWeight: "600", fontSize: 16 },
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
