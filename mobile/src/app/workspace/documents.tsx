import * as Haptics from "expo-haptics";
import { SymbolView } from "expo-symbols";
import { useState } from "react";
import { ActivityIndicator, Alert, Pressable, View } from "react-native";
import { EmptyCard, TabScaffold } from "@/components/tab-scaffold";
import { ThemedText } from "@/components/themed-text";
import { Radius, Spacing } from "@/constants/theme";
import { useMatters } from "@/hooks/use-matters";
import { useTheme } from "@/hooks/use-theme";
import { shareDocument } from "@/lib/api";

interface DocItem {
  name: string;
  content: string;
  matter: string;
}

export default function Documents() {
  const { palette } = useTheme();
  const { matters } = useMatters();
  const [busy, setBusy] = useState<string | null>(null);

  const docs: DocItem[] = matters.flatMap((m) =>
    m.messages.flatMap((msg) =>
      (msg.docs ?? []).map((d) => ({
        name: d.name,
        content: d.content,
        matter: m.name,
      })),
    ),
  );

  const share = (doc: DocItem) => {
    Haptics.selectionAsync().catch(() => {});
    Alert.alert(doc.name, "Save or share this document as…", [
      { text: "PDF", onPress: () => run(doc, "pdf") },
      { text: "Word (.docx)", onPress: () => run(doc, "docx") },
      { text: "Markdown", onPress: () => run(doc, "md") },
      { text: "Cancel", style: "cancel" },
    ]);
  };

  const run = async (doc: DocItem, to: "pdf" | "docx" | "md") => {
    setBusy(doc.name + to);
    try {
      await shareDocument(doc.name, doc.content, to);
    } catch (e) {
      Alert.alert("Couldn't export", e instanceof Error ? e.message : "Try again.");
    } finally {
      setBusy(null);
    }
  };

  return (
    <TabScaffold
      title="Documents"
      subtitle="Drafts the assistant produced, ready to export."
    >
      {docs.length === 0 ? (
        <EmptyCard
          icon={
            <SymbolView name="doc.text.fill" size={30} tintColor={palette.brand} />
          }
          heading="No documents yet"
          body="Ask the assistant to draft a letter, memo, or agreement and it'll appear here, ready to download as PDF or Word."
        />
      ) : (
        <View style={{ gap: Spacing.sm }}>
          {docs.map((doc, i) => {
            const working = busy?.startsWith(doc.name);
            return (
              <Pressable
                key={`${doc.name}-${i}`}
                onPress={() => share(doc)}
                disabled={!!busy}
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  gap: Spacing.md,
                  borderRadius: Radius.lg,
                  backgroundColor: palette.card,
                  borderWidth: 1,
                  borderColor: palette.divider,
                  padding: Spacing.md,
                }}
              >
                <View
                  style={{
                    width: 40,
                    height: 40,
                    borderRadius: 10,
                    alignItems: "center",
                    justifyContent: "center",
                    backgroundColor: palette.brandSoft,
                  }}
                >
                  <SymbolView name="doc.fill" size={18} tintColor={palette.brand} />
                </View>
                <View style={{ flex: 1 }}>
                  <ThemedText variant="body" style={{ fontWeight: "600" }} numberOfLines={1}>
                    {doc.name}
                  </ThemedText>
                  <ThemedText variant="caption" tone="muted" numberOfLines={1}>
                    {doc.matter}
                  </ThemedText>
                </View>
                {working ? (
                  <ActivityIndicator color={palette.brand} />
                ) : (
                  <SymbolView
                    name="square.and.arrow.up"
                    size={18}
                    tintColor={palette.inkMuted}
                  />
                )}
              </Pressable>
            );
          })}
        </View>
      )}
    </TabScaffold>
  );
}
