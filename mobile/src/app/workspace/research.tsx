import * as Haptics from "expo-haptics";
import { SymbolView } from "expo-symbols";
import { useState } from "react";
import {
  ActivityIndicator,
  Keyboard,
  Linking,
  Pressable,
  TextInput,
  View,
} from "react-native";
import { EmptyCard, TabScaffold } from "@/components/tab-scaffold";
import { ThemedText } from "@/components/themed-text";
import { Radius, Spacing } from "@/constants/theme";
import { useTheme } from "@/hooks/use-theme";
import { searchCaseLaw, type CaseResult } from "@/lib/api";

export default function Research() {
  const { palette } = useTheme();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<CaseResult[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const run = async () => {
    const q = query.trim();
    if (!q || loading) return;
    Keyboard.dismiss();
    Haptics.selectionAsync().catch(() => {});
    setLoading(true);
    setError(null);
    try {
      setResults(await searchCaseLaw(q));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Search failed.");
      setResults(null);
    } finally {
      setLoading(false);
    }
  };

  return (
    <TabScaffold
      title="Research"
      subtitle="Search U.S. case law, grounded in real opinions."
    >
      <View
        style={{
          flexDirection: "row",
          gap: Spacing.sm,
          alignItems: "center",
          borderRadius: Radius.pill,
          borderWidth: 1,
          borderColor: palette.divider,
          backgroundColor: palette.bgRaised,
          paddingHorizontal: Spacing.md,
        }}
      >
        <SymbolView name="magnifyingglass" size={16} tintColor={palette.inkMuted} />
        <TextInput
          value={query}
          onChangeText={setQuery}
          onSubmitEditing={run}
          returnKeyType="search"
          placeholder="e.g. commercial lease breach Florida"
          placeholderTextColor={palette.inkMuted}
          style={{ flex: 1, color: palette.ink, fontSize: 15, paddingVertical: 12 }}
        />
        <Pressable
          onPress={run}
          disabled={!query.trim() || loading}
          style={{
            width: 34,
            height: 34,
            borderRadius: 17,
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: query.trim() && !loading ? palette.brand : palette.bg,
          }}
        >
          {loading ? (
            <ActivityIndicator color={palette.brand} />
          ) : (
            <SymbolView
              name="arrow.right"
              size={15}
              tintColor={query.trim() ? "#FFFFFF" : palette.inkMuted}
            />
          )}
        </Pressable>
      </View>

      <View style={{ marginTop: Spacing.lg, gap: Spacing.sm }}>
        {error ? (
          <EmptyCard heading="Couldn't search" body={error} />
        ) : results === null ? (
          <EmptyCard
            icon={
              <SymbolView
                name="books.vertical.fill"
                size={28}
                tintColor={palette.brand}
              />
            }
            heading="Find authority"
            body="Search party names, a legal issue, or a doctrine. Tap a result to read the full opinion on CourtListener."
          />
        ) : results.length === 0 ? (
          <EmptyCard heading="No opinions found" body="Try different terms." />
        ) : (
          results.map((r, i) => (
            <Pressable
              key={`${r.url}-${i}`}
              onPress={() => r.url && Linking.openURL(r.url)}
              style={{
                borderRadius: Radius.lg,
                backgroundColor: palette.card,
                borderWidth: 1,
                borderColor: palette.divider,
                padding: Spacing.md,
                gap: 4,
              }}
            >
              <ThemedText variant="body" style={{ fontWeight: "700" }} numberOfLines={2}>
                {r.name}
              </ThemedText>
              <ThemedText variant="caption" tone="muted">
                {[r.court, r.date].filter(Boolean).join(" · ")}
                {r.citation ? ` · ${r.citation}` : ""}
              </ThemedText>
              {r.snippet ? (
                <ThemedText
                  variant="caption"
                  tone="soft"
                  numberOfLines={3}
                  style={{ marginTop: 2 }}
                >
                  {r.snippet}
                </ThemedText>
              ) : null}
            </Pressable>
          ))
        )}
      </View>
    </TabScaffold>
  );
}
