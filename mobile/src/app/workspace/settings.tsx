import * as Haptics from "expo-haptics";
import { SymbolView, type SymbolViewProps } from "expo-symbols";
import { Alert, Linking, Pressable, View } from "react-native";
import { TabScaffold } from "@/components/tab-scaffold";
import { ThemedText } from "@/components/themed-text";
import { Radius, Spacing } from "@/constants/theme";
import { useMatters } from "@/hooks/use-matters";
import { useTheme } from "@/hooks/use-theme";
import { API_BASE } from "@/lib/config";

const APPEARANCE = [
  { mode: "light", label: "Light", sf: "sun.max.fill" },
  { mode: "dark", label: "Dark", sf: "moon.fill" },
  { mode: "system", label: "System", sf: "iphone" },
] as const;

export default function Settings() {
  const { palette, mode, setMode } = useTheme();
  const { matters, resetAll } = useMatters();
  const chatCount = matters.reduce((n, m) => n + m.messages.length, 0);

  const sectionLabel = {
    marginBottom: Spacing.sm,
    marginTop: Spacing.xl,
  } as const;

  const card = {
    borderRadius: Radius.lg,
    backgroundColor: palette.card,
    borderWidth: 1,
    borderColor: palette.divider,
    overflow: "hidden" as const,
  };

  const Row = ({
    sf,
    label,
    value,
    onPress,
    danger,
    last,
  }: {
    sf: SymbolViewProps["name"];
    label: string;
    value?: string;
    onPress?: () => void;
    danger?: boolean;
    last?: boolean;
  }) => {
    const tint = danger ? "#c0392b" : palette.brand;
    const body = (
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          gap: Spacing.md,
          paddingHorizontal: Spacing.md,
          paddingVertical: 14,
          borderBottomWidth: last ? 0 : 1,
          borderBottomColor: palette.divider,
        }}
      >
        <SymbolView name={sf} size={17} tintColor={tint} />
        <ThemedText
          variant="body"
          style={{ flex: 1, color: danger ? "#c0392b" : palette.ink }}
        >
          {label}
        </ThemedText>
        {value ? (
          <ThemedText variant="caption" tone="muted">
            {value}
          </ThemedText>
        ) : null}
        {onPress ? (
          <SymbolView name="chevron.right" size={13} tintColor={palette.inkMuted} />
        ) : null}
      </View>
    );
    if (!onPress) return body;
    return (
      <Pressable
        onPress={() => {
          Haptics.selectionAsync().catch(() => {});
          onPress();
        }}
        android_ripple={{ color: palette.bgRaised }}
      >
        {body}
      </Pressable>
    );
  };

  const clearData = () =>
    Alert.alert(
      "Clear all conversations?",
      "This deletes every case and its chat history on this device. This can't be undone.",
      [
        { text: "Cancel", style: "cancel" },
        { text: "Clear everything", style: "destructive", onPress: resetAll },
      ],
    );

  return (
    <TabScaffold title="Settings">
      {/* Appearance */}
      <ThemedText variant="eyebrow" tone="accent" style={{ marginBottom: Spacing.sm }}>
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
        }}
      >
        {APPEARANCE.map((o) => {
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

      {/* Workspace */}
      <ThemedText variant="eyebrow" tone="accent" style={sectionLabel}>
        Workspace
      </ThemedText>
      <View style={card}>
        <Row sf="briefcase.fill" label="Cases" value={String(matters.length)} />
        <Row
          sf="text.bubble.fill"
          label="Saved messages"
          value={String(chatCount)}
          last
        />
      </View>

      {/* Privacy / device */}
      <ThemedText variant="eyebrow" tone="accent" style={sectionLabel}>
        Permissions
      </ThemedText>
      <View style={card}>
        <Row
          sf="mic.fill"
          label="Microphone, camera & photos"
          onPress={() => void Linking.openSettings()}
          last
        />
      </View>
      <ThemedText
        variant="caption"
        tone="muted"
        style={{ marginTop: Spacing.xs, paddingHorizontal: Spacing.xs }}
      >
        Dictation and document scanning use these. Manage them in iOS Settings.
      </ThemedText>

      {/* Backend */}
      <ThemedText variant="eyebrow" tone="accent" style={sectionLabel}>
        Backend
      </ThemedText>
      <View style={card}>
        <Row sf="bolt.horizontal.fill" label="Connected to" />
        <View style={{ paddingHorizontal: Spacing.md, paddingBottom: Spacing.md }}>
          <ThemedText variant="mono" style={{ fontSize: 13 }}>
            {API_BASE.replace(/^https?:\/\//, "")}
          </ThemedText>
        </View>
      </View>

      {/* Data */}
      <ThemedText variant="eyebrow" tone="accent" style={sectionLabel}>
        Data
      </ThemedText>
      <View style={card}>
        <Row sf="trash.fill" label="Clear all conversations" onPress={clearData} danger last />
      </View>

      {/* About */}
      <ThemedText variant="eyebrow" tone="accent" style={sectionLabel}>
        About
      </ThemedText>
      <View style={card}>
        <Row sf="info.circle.fill" label="Version" value="0.1.0" />
        <Row
          sf="questionmark.circle.fill"
          label="Help & feedback"
          onPress={() =>
            void Linking.openURL("https://kat-ai-agents.vercel.app")
          }
          last
        />
      </View>

      <ThemedText
        variant="caption"
        tone="muted"
        style={{ textAlign: "center", marginTop: Spacing.xxl }}
      >
        Lex & Co. · AI for attorneys
      </ThemedText>
    </TabScaffold>
  );
}
