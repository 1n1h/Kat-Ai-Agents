import { router } from "expo-router";
import * as Haptics from "expo-haptics";
import { SymbolView } from "expo-symbols";
import { useState } from "react";
import { Pressable, TextInput, View } from "react-native";
import { PillButton } from "@/components/pill-button";
import { TabScaffold } from "@/components/tab-scaffold";
import { ThemedText } from "@/components/themed-text";
import { Radius, Spacing } from "@/constants/theme";
import { useMatters } from "@/hooks/use-matters";
import { useTheme } from "@/hooks/use-theme";

export default function Cases() {
  const { palette } = useTheme();
  const { matters, activeId, setActive, createMatter, deleteMatter } =
    useMatters();
  const [name, setName] = useState("");

  const open = (id: string) => {
    Haptics.selectionAsync().catch(() => {});
    setActive(id);
    router.navigate("/workspace");
  };
  const add = () => {
    if (!name.trim()) return;
    createMatter(name);
    setName("");
    router.navigate("/workspace");
  };

  return (
    <TabScaffold
      title="Cases"
      subtitle="Each matter keeps its own conversations, isolated."
    >
      <View style={{ flexDirection: "row", gap: Spacing.sm, marginBottom: Spacing.lg }}>
        <TextInput
          value={name}
          onChangeText={setName}
          placeholder="New case name…"
          placeholderTextColor={palette.inkMuted}
          onSubmitEditing={add}
          style={{
            flex: 1,
            height: 44,
            borderRadius: Radius.lg,
            borderWidth: 1,
            borderColor: palette.divider,
            backgroundColor: palette.bgRaised,
            color: palette.ink,
            paddingHorizontal: Spacing.md,
            fontSize: 15,
          }}
        />
        <PillButton label="Add" variant="primary" size="md" onPress={add} />
      </View>

      <View style={{ gap: Spacing.sm }}>
        {matters.map((m) => {
          const isActive = m.id === activeId;
          return (
            <Pressable
              key={m.id}
              onPress={() => open(m.id)}
              style={({ pressed }) => [
                {
                  flexDirection: "row",
                  alignItems: "center",
                  gap: Spacing.md,
                  borderRadius: Radius.lg,
                  padding: Spacing.md,
                  backgroundColor: palette.card,
                  borderWidth: 1.5,
                  borderColor: isActive ? palette.brand : palette.divider,
                },
                pressed && { backgroundColor: palette.bgRaised },
              ]}
            >
              <View
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: 20,
                  alignItems: "center",
                  justifyContent: "center",
                  backgroundColor: palette.brandSoft,
                }}
              >
                <SymbolView name="briefcase.fill" size={16} tintColor={palette.brand} />
              </View>
              <View style={{ flex: 1 }}>
                <ThemedText variant="body" style={{ fontWeight: "600" }} numberOfLines={1}>
                  {m.name}
                </ThemedText>
                <ThemedText variant="caption" tone="muted">
                  {m.messages.length} message{m.messages.length === 1 ? "" : "s"}
                  {isActive ? " · active" : ""}
                </ThemedText>
              </View>
              {matters.length > 1 && (
                <Pressable
                  hitSlop={10}
                  onPress={() => {
                    Haptics.selectionAsync().catch(() => {});
                    deleteMatter(m.id);
                  }}
                >
                  <SymbolView name="trash" size={15} tintColor={palette.inkMuted} />
                </Pressable>
              )}
            </Pressable>
          );
        })}
      </View>
    </TabScaffold>
  );
}
