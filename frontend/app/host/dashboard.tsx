import { Ionicons } from "@expo/vector-icons";
import { router, useFocusEffect } from "expo-router";
import { useCallback, useState } from "react";
import {
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { api, deleteToken } from "@/src/api/client";
import { colors, radius, spacing } from "@/src/theme";

type Room = {
  id: string;
  code: string;
  name: string;
  description: string;
  active: boolean;
  created_at: string;
};

export default function Dashboard() {
  const [rooms, setRooms] = useState<Room[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [me, setMe] = useState<{ name: string } | null>(null);

  const load = useCallback(async () => {
    try {
      const [meRes, roomsRes] = await Promise.all([
        api.get("/auth/host/me"),
        api.get("/rooms/host"),
      ]);
      if (!meRes.data?.plan) {
        router.replace("/host/plans");
        return;
      }
      setMe(meRes.data);
      setRooms(roomsRes.data);
    } catch (e: any) {
      if (e?.response?.status === 401) {
        await deleteToken();
        router.replace("/host/login");
      }
    } finally {
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const logout = async () => {
    await deleteToken();
    router.replace("/");
  };

  return (
    <View style={styles.root}>
      <SafeAreaView edges={["top"]} style={styles.headerSafe}>
        <View style={styles.headerRow}>
          <View>
            <Text style={styles.greeting}>Olá,</Text>
            <Text style={styles.name}>{me?.name || "Anfitrião"}</Text>
          </View>
          <Pressable
            testID="logout-btn"
            onPress={logout}
            style={styles.iconBtn}
          >
            <Ionicons name="log-out-outline" size={22} color={colors.onSurface} />
          </Pressable>
        </View>
      </SafeAreaView>

      <FlatList
        data={rooms}
        keyExtractor={(r) => r.id}
        contentContainerStyle={{ padding: spacing.lg, paddingBottom: 120 }}
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
        ListHeaderComponent={
          <Text style={styles.sectionTitle}>Minhas salas</Text>
        }
        ListEmptyComponent={
          <View style={styles.empty}>
            <Ionicons name="qr-code" size={48} color={colors.brand} />
            <Text style={styles.emptyTitle}>Nenhuma sala ainda</Text>
            <Text style={styles.emptySub}>
              Crie sua primeira sala para o rolê. Ela gera um QR Code para os
              convidados entrarem.
            </Text>
          </View>
        }
        renderItem={({ item }) => (
          <Pressable
            testID={`room-${item.id}`}
            onPress={() =>
              router.push({ pathname: "/host/room", params: { id: item.id } })
            }
            style={styles.roomCard}
          >
            <View style={styles.roomCardLeft}>
              <Text style={styles.roomName}>{item.name}</Text>
              <Text style={styles.roomCode}>Código: {item.code}</Text>
              {item.description ? (
                <Text style={styles.roomDesc} numberOfLines={1}>
                  {item.description}
                </Text>
              ) : null}
            </View>
            <View
              style={[
                styles.statusPill,
                {
                  backgroundColor: item.active
                    ? "rgba(16,185,129,0.18)"
                    : colors.surfaceTertiary,
                },
              ]}
            >
              <Text
                style={[
                  styles.statusTxt,
                  { color: item.active ? colors.brand : colors.onSurfaceTertiary },
                ]}
              >
                {item.active ? "Ativa" : "Encerrada"}
              </Text>
            </View>
          </Pressable>
        )}
      />

      <View style={styles.fabWrap}>
        <Pressable
          testID="create-room-fab"
          onPress={() => router.push("/host/create-room")}
          style={styles.fab}
        >
          <Ionicons name="add" size={22} color="#fff" />
          <Text style={styles.fabTxt}>Nova sala</Text>
        </Pressable>
      </View>
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
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
  },
  greeting: { color: colors.onSurfaceTertiary, fontSize: 13 },
  name: { color: colors.onSurface, fontSize: 24, fontWeight: "600" },
  iconBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.surfaceSecondary,
    alignItems: "center",
    justifyContent: "center",
  },
  sectionTitle: {
    color: colors.onSurfaceTertiary,
    fontSize: 11,
    letterSpacing: 2,
    textTransform: "uppercase",
    marginBottom: spacing.md,
  },
  roomCard: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: colors.surfaceSecondary,
    padding: spacing.lg,
    borderRadius: radius.md,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  roomCardLeft: { flex: 1, gap: 2 },
  roomName: { color: colors.onSurface, fontSize: 17, fontWeight: "600" },
  roomCode: {
    color: colors.brand,
    fontSize: 12,
    letterSpacing: 1,
    marginTop: 2,
  },
  roomDesc: { color: colors.onSurfaceTertiary, fontSize: 13, marginTop: 4 },
  statusPill: {
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
    borderRadius: radius.pill,
  },
  statusTxt: { fontSize: 11, fontWeight: "600" },
  empty: {
    alignItems: "center",
    gap: spacing.md,
    marginTop: spacing.xxxl,
    paddingHorizontal: spacing.xl,
  },
  emptyTitle: { color: colors.onSurface, fontSize: 22, fontWeight: "600" },
  emptySub: {
    color: colors.onSurfaceTertiary,
    fontSize: 14,
    lineHeight: 20,
    textAlign: "center",
  },
  fabWrap: {
    position: "absolute",
    bottom: spacing.xl,
    left: 0,
    right: 0,
    alignItems: "center",
  },
  fab: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    backgroundColor: colors.brandPrimary,
    paddingHorizontal: spacing.xl,
    paddingVertical: 14,
    borderRadius: radius.pill,
    shadowColor: colors.brand,
    shadowOpacity: 0.5,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
  },
  fabTxt: { color: "#fff", fontWeight: "700", fontSize: 15 },
});
