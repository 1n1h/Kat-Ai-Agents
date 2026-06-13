import Constants from "expo-constants";

const extra = (Constants.expoConfig?.extra ?? {}) as { apiBase?: string };

/**
 * Backend base URL. Order: EXPO_PUBLIC_API_BASE env → app.json extra.apiBase →
 * the deployed Vercel app. For local-server testing on a device, set
 * EXPO_PUBLIC_API_BASE to your machine's LAN URL, e.g. http://192.168.1.50:3000
 */
export const API_BASE = (
  process.env.EXPO_PUBLIC_API_BASE ||
  extra.apiBase ||
  "https://kat-ai-agents.vercel.app"
).replace(/\/$/, "");
