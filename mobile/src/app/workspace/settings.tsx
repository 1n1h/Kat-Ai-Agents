import * as Haptics from "expo-haptics";
import { SymbolView } from "expo-symbols";
import { Pressable, View } from "react-native";
import { TabScaffold } from "@/components/tab-scaffold";
import { ThemedText } from "@/components/themed-text";
import { Radius, Spacing } from "@/constants/theme";
import { useTheme } from "@/hooks/use-theme";
import { API_BASE } from "@/lib/config";

const OPTIONS = [
  { mode: "light", label: "Light", sf: "sun.max.fill" },
  { mode: "dark", label: "Dark", sf: "moon.fill" },
  { mode: "system", label: "System", sf: "iphone" },
] as const;

export default function Settings() {
  const { palette, mode, setMode } = useTheme();
  return (
    <TabScaffold title="Settings">
      <ThemedText
        variant="eyebrow"
        tone="accent"
        style={{ marginBottom: Spacing.sm }}
      >
        Appearance
      </ThemedText>
      <View
        style={{
          flexDirection: "row",
          padding: 4,
          borderRadius: Radius.pill,
          backgroundColor: palette.bgRaised,
          borderWidth: 1,
          borderColor: palette.divider,
          marginBottom: Spacing.xl,
        }}
      >
        {OPTIONS.map((o) => {
          const sel = mode === o.mode;
          return (
            <Pressable
              key={o.mode}
              onPress={() => {
                Haptics.selectionAsync().catch(() => {});
                setMode(o.mode);
              }}
              style={{
                flex: 1,
                flexDirection: "row",
                gap: 6,
                alignItems: "center",
                justifyContent: "center",
                paddingVertical: 10,
                borderRadius: Radius.pill,
                backgroundColor: sel ? palette.ink : "transparent",
              }}
            >
              <SymbolView
                name={o.sf}
                size={14}
                tintColor={sel ? palette.inkInverse : palette.inkMuted}
              />
              <ThemedText
                variant="caption"
                style={{
                  color: sel ? palette.inkInverse : palette.inkSoft,
                  fontWeight: "600",
                }}
              >
                {o.label}
              </ThemedText>
            </Pressable>
          );
        })}
      </View>

      <ThemedText
        variant="eyebrow"
        tone="accent"
        style={{ marginBottom: Spacing.sm }}
      >
        Backend
      </ThemedText>
      <View
        style={{
          borderRadius: Radius.lg,
          backgroundColor: palette.card,
          borderWidth: 1,
          borderColor: palette.divider,
          padding: Spacing.md,
          gap: 4,
        }}
      >
        <ThemedText variant="caption" tone="muted">
          Connected to
        </ThemedText>
        <ThemedText variant="mono" style={{ fontSize: 13 }}>
          {API_BASE.replace(/^https?:\/\//, "")}
        </ThemedText>
      </View>

      <ThemedText
        variant="caption"
        tone="muted"
        style={{ textAlign: "center", marginTop: Spacing.xxl }}
      >
        Lex & Co. · v0.1.0
      </ThemedText>
    </TabScaffold>
  );
}
