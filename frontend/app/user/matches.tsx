import { Ionicons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import { useCallback, useEffect, useState } from "react";
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
import { colors, radius, spacing } from "@/src/theme";

type Match = {
  match_id: string;
  other: { id: string; name: string; photo: string; age: number };
  last_message?: { text: string; created_at: string; sender_id: string } | null;
  created_at: string;
};

export default function Matches() {
  const { roomId, participantId } = useLocalSearchParams<{
    roomId: string;
    participantId: string;
  }>();
  const [matches, setMatches] = useState<Match[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const res = await api.get(`/rooms/${roomId}/matches`, {
        params: { participant_id: participantId },
      });
      setMatches(res.data);
    } catch (e) {
      console.warn(e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [roomId, participantId]);

  useEffect(() => {
    load();
  }, [load]);

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
          <Text style={styles.title}>Conversas</Text>
          <View style={{ width: 40 }} />
        </View>
      </SafeAreaView>
      <FlatList
        data={matches}
        keyExtractor={(m) => m.match_id}
        contentContainerStyle={{ padding: spacing.lg, paddingBottom: 80 }}
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
              <Ionicons name="wine" size={48} color={colors.brand} />
              <Text style={styles.emptyTitle}>Sem matches ainda</Text>
              <Text style={styles.emptySub}>
                Volte para o deck e continue curtindo!
              </Text>
            </View>
          ) : null
        }
        renderItem={({ item }) => (
          <Pressable
            testID={`match-${item.match_id}`}
            onPress={() =>
              router.push({
                pathname: "/user/chat",
                params: {
                  matchId: item.match_id,
                  participantId,
                  otherName: item.other.name,
                  otherPhoto: item.other.photo,
                },
              })
            }
            style={styles.row}
          >
            <Image source={{ uri: item.other.photo }} style={styles.avatar} />
            <View style={{ flex: 1 }}>
              <Text style={styles.name}>{item.other.name}</Text>
              <Text style={styles.preview} numberOfLines={1}>
                {item.last_message?.text || "Diga oi! 👋"}
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={colors.onSurfaceTertiary} />
          </Pressable>
        )}
      />
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
  title: { color: colors.onSurface, fontSize: 20, fontWeight: "600" },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    backgroundColor: colors.surfaceSecondary,
    padding: spacing.md,
    borderRadius: radius.md,
    marginBottom: spacing.sm,
  },
  avatar: { width: 56, height: 56, borderRadius: 28 },
  name: { color: colors.onSurface, fontSize: 16, fontWeight: "600" },
  preview: { color: colors.onSurfaceTertiary, fontSize: 13, marginTop: 2 },
  empty: { alignItems: "center", gap: spacing.md, marginTop: spacing.xxxl },
  emptyTitle: { color: colors.onSurface, fontSize: 20, fontWeight: "600" },
  emptySub: { color: colors.onSurfaceTertiary, fontSize: 14 },
});
