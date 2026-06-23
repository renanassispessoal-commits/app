import axios from "axios";
import { Platform } from "react-native";
import * as SecureStore from "expo-secure-store";
import AsyncStorage from "@react-native-async-storage/async-storage";

const BASE_URL = process.env.EXPO_PUBLIC_BACKEND_URL;

const TOKEN_KEY = "lm_host_token";
const USER_KEY = "lm_user";
const PARTICIPANT_KEY = "lm_participant";

export async function saveToken(token: string) {
  if (Platform.OS === "web") {
    await AsyncStorage.setItem(TOKEN_KEY, token);
  } else {
    await SecureStore.setItemAsync(TOKEN_KEY, token);
  }
}

export async function getToken(): Promise<string | null> {
  if (Platform.OS === "web") {
    return AsyncStorage.getItem(TOKEN_KEY);
  } else {
    return SecureStore.getItemAsync(TOKEN_KEY);
  }
}

export async function deleteToken() {
  if (Platform.OS === "web") {
    await AsyncStorage.removeItem(TOKEN_KEY);
  } else {
    await SecureStore.deleteItemAsync(TOKEN_KEY);
  }
}

// User (party-goer) persistent profile
export async function saveUser(u: any) {
  await AsyncStorage.setItem(USER_KEY, JSON.stringify(u));
}

export async function getUser(): Promise<any | null> {
  const raw = await AsyncStorage.getItem(USER_KEY);
  return raw ? JSON.parse(raw) : null;
}

export async function clearUser() {
  await AsyncStorage.removeItem(USER_KEY);
  await AsyncStorage.removeItem(PARTICIPANT_KEY);
}

// Per-room participant
export async function saveParticipant(p: any) {
  await AsyncStorage.setItem(PARTICIPANT_KEY, JSON.stringify(p));
}

export async function getParticipant(): Promise<any | null> {
  const raw = await AsyncStorage.getItem(PARTICIPANT_KEY);
  return raw ? JSON.parse(raw) : null;
}

export const api = axios.create({
  baseURL: `${BASE_URL}/api`,
  timeout: 25000,
});

api.interceptors.request.use(async (config) => {
  const token = await getToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});
