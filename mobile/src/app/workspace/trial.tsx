import * as Haptics from "expo-haptics";
import * as Speech from "expo-speech";
import { SymbolView } from "expo-symbols";
import { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Keyboard,
  Pressable,
  ScrollView,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { ThemedText } from "@/components/themed-text";
import { Fonts, Radius, Spacing } from "@/constants/theme";
import { useTheme } from "@/hooks/use-theme";
import { streamMockTrial } from "@/lib/api";
import {
  CASES,
  MAX_ROUNDS,
  TRIAL_ROLES,
  opposingKey,
  type TrialCase,
  type TrialRoleId,
} from "@/lib/mockTrial";

type Screen = "lobby" | "side" | "trial" | "verdict";
interface TMsg { by: TrialRoleId; label: string; text: string }
interface Verdict { text: string; you: number; ai: number; youWon: boolean }

export default function Trial() {
  const { palette } = useTheme();
  const insets = useSafeAreaInsets();
  const [screen, setScreen] = useState<Screen>("lobby");
  const [sel, setSel] = useState<TrialCase | null>(null);
  const [yourKey, setYourKey] = useState("");
  const [messages, setMessages] = useState<TMsg[]>([]);
  const [live, setLive] = useState("");
  const [liveBy, setLiveBy] = useState<TrialRoleId | null>(null);
  const [input, setInput] = useState("");
  const [round, setRound] = useState(0);
  const [scores, setScores] = useState({ you: 0, ai: 0 });
  const [verdict, setVerdict] = useState<Verdict | null>(null);
  const [busy, setBusy] = useState(false);
  const [voice, setVoice] = useState(false);
  const [kb, setKb] = useState(0);
  const voiceRef = useRef(false);
  const caseLawRef = useRef("");
  const scrollRef = useRef<ScrollView>(null);

  useEffect(() => {
    const s = Keyboard.addListener("keyboardWillShow", (e) => setKb(e.endCoordinates.height));
    const h = Keyboard.addListener("keyboardWillHide", () => setKb(0));
    return () => { s.remove(); h.remove(); };
  }, []);
  useEffect(() => { voiceRef.current = voice; if (!voice) Speech.stop(); }, [voice]);
  useEffect(() => () => {
    Speech.stop();
  }, []);

  const say = (text: string, role: TrialRoleId) => {
    if (!voiceRef.current) return;
    Speech.stop();
    Speech.speak(text.replace(/[*_#`>[\]()]/g, ""), {
      pitch: role === "judge" ? 0.85 : 1.0,
      rate: role === "judge" ? 0.92 : 1.05,
    });
  };

  async function turn(body: Record<string, unknown>, by: TrialRoleId) {
    setLive("");
    setLiveBy(by);
    const text = await streamMockTrial(
      { ...body, caseLaw: caseLawRef.current },
      (acc) => setLive(acc),
      (cl) => (caseLawRef.current = cl),
    ).catch(() => "The court is briefly unavailable. Try again.");
    setLive("");
    setLiveBy(null);
    return text;
  }

  async function begin(c: TrialCase, key: string) {
    Haptics.selectionAsync().catch(() => {});
    setSel(c); setYourKey(key); setScreen("trial");
    setMessages([]); setRound(0); setScores({ you: 0, ai: 0 }); setVerdict(null);
    caseLawRef.current = "";
    setBusy(true);
    const opening = await turn({ turn: "open", caseId: c.id, yourSideKey: key }, "judge");
    setMessages([{ by: "judge", label: c.judge, text: opening }]);
    say(opening, "judge");
    setBusy(false);
  }

  async function argue() {
    if (!input.trim() || busy || !sel) return;
    const arg = input.trim();
    setInput("");
    Keyboard.dismiss();
    setBusy(true);
    const you = sel.sides[yourKey];
    const ai = sel.sides[opposingKey(sel, yourKey)];
    const afterYou: TMsg[] = [...messages, { by: "you", label: `You — ${you.label}`, text: arg }];
    setMessages(afterYou);

    const history = afterYou
      .filter((m) => m.by === "you" || m.by === "counsel")
      .map((m) => ({ role: m.by === "you" ? "user" : "assistant", content: m.text }));

    const reply = await turn(
      { turn: "counsel", caseId: sel.id, yourSideKey: yourKey, history, userArgument: arg },
      "counsel",
    );
    const afterAi: TMsg[] = [...afterYou, { by: "counsel", label: `${ai.counsel} — ${ai.label}`, text: reply }];
    setMessages(afterAi);
    say(reply, "counsel");

    const next = round + 1;
    if (next >= MAX_ROUNDS) {
      const v = await turn(
        { turn: "verdict", caseId: sel.id, yourSideKey: yourKey, history: [...history, { role: "assistant", content: reply }] },
        "judge",
      );
      const you2 = 16 + Math.floor(Math.random() * 14);
      const ai2 = 14 + Math.floor(Math.random() * 14);
      setMessages([...afterAi, { by: "judge", label: `${sel.judge} — Verdict`, text: v }]);
      say(v, "judge");
      setVerdict({ text: v, you: you2, ai: ai2, youWon: you2 >= ai2 });
      setRound(next); setScreen("verdict"); setBusy(false);
      return;
    }
    const ruling = await turn(
      { turn: "ruling", caseId: sel.id, yourSideKey: yourKey, userArgument: arg, lastAiReply: reply },
      "judge",
    );
    setScores((s) => ({ you: s.you + 3 + Math.floor(Math.random() * 5), ai: s.ai + 2 + Math.floor(Math.random() * 5) }));
    setMessages([...afterAi, { by: "judge", label: sel.judge, text: ruling }]);
    say(ruling, "judge");
    setRound(next); setBusy(false);
  }

  function reset() {
    Speech.stop();
    setScreen("lobby"); setSel(null); setYourKey(""); setMessages([]);
    setVerdict(null); setRound(0); setScores({ you: 0, ai: 0 });
  }

  // ───────── LOBBY ─────────
  if (screen === "lobby") {
    return (
      <Shell palette={palette}>
        <ThemedText variant="display" style={{ fontSize: 32, lineHeight: 36, letterSpacing: -1 }}>Mock Trial</ThemedText>
        <ThemedText variant="body" tone="soft" style={{ marginTop: 4, marginBottom: Spacing.lg }}>
          Pick a landmark case, choose your side, and argue it live against AI counsel.
        </ThemedText>
        <View style={{ gap: Spacing.sm }}>
          {CASES.map((c) => (
            <Pressable key={c.id} onPress={() => { Haptics.selectionAsync().catch(() => {}); setSel(c); setScreen("side"); }}
              style={{ borderRadius: Radius.lg, backgroundColor: palette.card, borderWidth: 1, borderColor: palette.divider, padding: Spacing.md, flexDirection: "row", alignItems: "center", gap: Spacing.md }}>
              <View style={{ width: 44, height: 44, borderRadius: 12, backgroundColor: palette.brandSoft, alignItems: "center", justifyContent: "center" }}>
                <ThemedText style={{ fontFamily: Fonts.serif, fontSize: 22, color: palette.brand }}>{c.glyph}</ThemedText>
              </View>
              <View style={{ flex: 1 }}>
                <ThemedText variant="body" style={{ fontWeight: "700" }} numberOfLines={1}>{c.title}</ThemedText>
                <ThemedText variant="caption" tone="muted">{c.category} · {c.year}</ThemedText>
              </View>
              <SymbolView name="chevron.right" size={14} tintColor={palette.inkMuted} />
            </Pressable>
          ))}
        </View>
      </Shell>
    );
  }

  // ───────── SIDE SELECT ─────────
  if (screen === "side" && sel) {
    return (
      <Shell palette={palette} onBack={() => setScreen("lobby")}>
        <ThemedText variant="eyebrow" tone="accent">{sel.glyph} {sel.title} · {sel.year}</ThemedText>
        <ThemedText variant="body" tone="soft" style={{ marginTop: 4, marginBottom: Spacing.lg, fontStyle: "italic" }}>{sel.blurb}</ThemedText>
        <ThemedText variant="caption" tone="muted" style={{ marginBottom: Spacing.sm }}>CHOOSE YOUR SIDE</ThemedText>
        <View style={{ gap: Spacing.md }}>
          {Object.keys(sel.sides).map((k) => {
            const s = sel.sides[k];
            return (
              <Pressable key={k} onPress={() => begin(sel, k)}
                style={{ borderRadius: Radius.lg, backgroundColor: palette.card, borderWidth: 1, borderColor: palette.divider, padding: Spacing.md }}>
                <ThemedText variant="caption" tone="accent">{s.label}</ThemedText>
                <ThemedText variant="heading" style={{ fontSize: 18, fontStyle: "italic", marginTop: 2 }}>{s.counsel}</ThemedText>
                <ThemedText variant="body" tone="soft" style={{ fontSize: 14, marginTop: 6 }}>{s.goal}</ThemedText>
                <View style={{ marginTop: Spacing.sm, gap: 3 }}>
                  {s.weapons.map((w) => (
                    <ThemedText key={w} variant="caption" style={{ color: palette.ink }}>✓ {w}</ThemedText>
                  ))}
                </View>
              </Pressable>
            );
          })}
        </View>
        <ThemedText variant="caption" tone="muted" style={{ textAlign: "center", marginTop: Spacing.lg }}>
          Historical outcome revealed after your verdict.
        </ThemedText>
      </Shell>
    );
  }

  // ───────── VERDICT ─────────
  if (screen === "verdict" && verdict && sel) {
    const ai = sel.sides[opposingKey(sel, yourKey)];
    const you = sel.sides[yourKey];
    return (
      <Shell palette={palette}>
        <View style={{ alignItems: "center", gap: Spacing.sm }}>
          <View style={{ width: 60, height: 60, borderRadius: 30, backgroundColor: palette.brandSoft, alignItems: "center", justifyContent: "center" }}>
            <SymbolView name="checkmark.seal.fill" size={30} tintColor={palette.brand} />
          </View>
          <ThemedText variant="caption" tone="accent">THE COURT HAS SPOKEN</ThemedText>
          <ThemedText style={{ fontFamily: Fonts.serif, fontSize: 26, color: palette.ink, fontStyle: "italic", textAlign: "center" }}>
            {verdict.youWon ? "You outargued history" : "The AI prevailed"}
          </ThemedText>
        </View>
        <View style={{ flexDirection: "row", justifyContent: "center", gap: Spacing.md, marginTop: Spacing.lg }}>
          {[{ n: verdict.you, who: you.counsel, lbl: "You", win: verdict.youWon }, { n: verdict.ai, who: ai.counsel, lbl: ai.label, win: !verdict.youWon }].map((c, i) => (
            <View key={i} style={{ minWidth: 120, alignItems: "center", borderRadius: Radius.lg, padding: Spacing.md, backgroundColor: palette.card, borderWidth: c.win ? 2 : 1, borderColor: c.win ? palette.brand : palette.divider }}>
              <ThemedText style={{ fontFamily: Fonts.serif, fontSize: 34, color: c.win ? palette.brand : palette.inkMuted }}>{c.n}</ThemedText>
              <ThemedText variant="caption" style={{ fontStyle: "italic" }}>{c.who}</ThemedText>
              <ThemedText variant="caption" tone="muted">{c.lbl}</ThemedText>
            </View>
          ))}
        </View>
        <View style={{ marginTop: Spacing.lg, borderRadius: Radius.lg, backgroundColor: palette.card, borderWidth: 1, borderColor: palette.divider, padding: Spacing.md }}>
          <ThemedText variant="caption" tone="accent" style={{ marginBottom: 6 }}>THE BENCH</ThemedText>
          <ThemedText variant="body" tone="soft" style={{ fontSize: 14, fontStyle: "italic", lineHeight: 21 }}>{verdict.text}</ThemedText>
        </View>
        <View style={{ marginTop: Spacing.md, borderRadius: Radius.lg, backgroundColor: palette.bgRaised, borderWidth: 1, borderColor: palette.divider, padding: Spacing.md }}>
          <ThemedText variant="caption" tone="muted">HISTORICAL OUTCOME</ThemedText>
          <ThemedText variant="body" style={{ fontSize: 14, marginTop: 2 }}>{sel.historicalVerdict}</ThemedText>
        </View>
        <View style={{ flexDirection: "row", gap: Spacing.sm, marginTop: Spacing.lg }}>
          <Pressable onPress={reset} style={{ flex: 1, alignItems: "center", paddingVertical: 13, borderRadius: Radius.pill, backgroundColor: palette.brand }}>
            <ThemedText variant="body" style={{ fontWeight: "700", color: "#FFFFFF" }}>Another case</ThemedText>
          </Pressable>
          <Pressable onPress={() => { setVerdict(null); begin(sel, opposingKey(sel, yourKey)); }} style={{ flex: 1, alignItems: "center", paddingVertical: 13, borderRadius: Radius.pill, borderWidth: 1, borderColor: palette.divider }}>
            <ThemedText variant="body" style={{ fontWeight: "600" }}>Switch sides</ThemedText>
          </Pressable>
        </View>
      </Shell>
    );
  }

  // ───────── TRIAL ─────────
  if (screen === "trial" && sel) {
    const ai = sel.sides[opposingKey(sel, yourKey)];
    const you = sel.sides[yourKey];
    return (
      <View style={{ flex: 1, backgroundColor: palette.bg }}>
        <SafeAreaView edges={["top"]} style={{ flex: 1 }}>
          <View style={{ flex: 1, paddingBottom: kb }}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: Spacing.sm, paddingHorizontal: Spacing.lg, paddingVertical: Spacing.sm, borderBottomWidth: 1, borderBottomColor: palette.divider }}>
              <Pressable onPress={reset} hitSlop={8}><SymbolView name="chevron.left" size={18} tintColor={palette.ink} /></Pressable>
              <View style={{ flex: 1 }}>
                <ThemedText variant="body" style={{ fontWeight: "700" }} numberOfLines={1}>{sel.glyph} {sel.title}</ThemedText>
                <ThemedText variant="caption" tone="muted">{sel.judge} · Round {Math.min(round + (busy ? 1 : 0), MAX_ROUNDS)}/{MAX_ROUNDS} · You {scores.you} · AI {scores.ai}</ThemedText>
              </View>
              <Pressable onPress={() => setVoice((v) => !v)} hitSlop={8}>
                <SymbolView name={voice ? "speaker.wave.2.fill" : "speaker.slash.fill"} size={17} tintColor={voice ? palette.brand : palette.inkMuted} />
              </Pressable>
            </View>

            <ScrollView ref={scrollRef} contentContainerStyle={{ padding: Spacing.lg, gap: Spacing.md }}
              keyboardDismissMode="interactive"
              onContentSizeChange={() => scrollRef.current?.scrollToEnd({ animated: true })}>
              {messages.map((m, i) => <TrialBubble key={i} m={m} palette={palette} />)}
              {live && liveBy ? (
                <TrialBubble m={{ by: liveBy, label: liveBy === "counsel" ? `${ai.counsel} — ${ai.label}` : sel.judge, text: live }} palette={palette} />
              ) : busy ? (
                <ActivityIndicator color={palette.brand} />
              ) : null}
            </ScrollView>

            <View style={{ paddingHorizontal: Spacing.lg, paddingTop: Spacing.sm, paddingBottom: kb > 0 ? Spacing.xs : Math.max(insets.bottom, Spacing.sm) + Spacing.xs }}>
              <View style={{ flexDirection: "row", alignItems: "flex-end", gap: 4, borderRadius: Radius.xl, borderWidth: 1, borderColor: palette.divider, backgroundColor: palette.bgRaised, paddingHorizontal: 6, paddingVertical: 6 }}>
                <TextInput value={input} onChangeText={setInput} editable={!busy} multiline
                  placeholder={`Argue as ${you.counsel}…`} placeholderTextColor={palette.inkMuted}
                  style={{ flex: 1, color: palette.ink, fontSize: 16, maxHeight: 110, paddingHorizontal: 8, paddingTop: 9, paddingBottom: 9 }} />
                <Pressable onPress={argue} disabled={busy || !input.trim()}
                  style={{ width: 38, height: 38, borderRadius: 19, alignItems: "center", justifyContent: "center", backgroundColor: busy || !input.trim() ? palette.bg : palette.brand }}>
                  <SymbolView name="arrow.up" size={18} tintColor={busy || !input.trim() ? palette.inkMuted : "#FFFFFF"} />
                </Pressable>
              </View>
            </View>
          </View>
        </SafeAreaView>
      </View>
    );
  }

  return null;
}

function Shell({ children, palette, onBack }: { children: React.ReactNode; palette: ReturnType<typeof useTheme>["palette"]; onBack?: () => void }) {
  return (
    <View style={{ flex: 1, backgroundColor: palette.bg }}>
      <SafeAreaView edges={["top"]} style={{ flex: 1 }}>
        {onBack ? (
          <Pressable onPress={onBack} hitSlop={8} style={{ paddingHorizontal: Spacing.lg, paddingTop: Spacing.sm }}>
            <SymbolView name="chevron.left" size={20} tintColor={palette.ink} />
          </Pressable>
        ) : null}
        <ScrollView contentContainerStyle={{ paddingHorizontal: Spacing.lg, paddingTop: Spacing.md, paddingBottom: Spacing.xxl + 40 }} showsVerticalScrollIndicator={false}>
          {children}
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

function TrialBubble({ m, palette }: { m: TMsg; palette: ReturnType<typeof useTheme>["palette"] }) {
  const role = TRIAL_ROLES[m.by];
  const isJudge = m.by === "judge";
  const align = m.by === "you" ? "flex-end" : m.by === "counsel" ? "flex-start" : "center";
  return (
    <View style={{ alignItems: align }}>
      <ThemedText variant="caption" style={{ color: role.color, marginBottom: 3, fontSize: 10 }}>{m.label}</ThemedText>
      <View style={{ maxWidth: "90%", borderRadius: Radius.lg, paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm + 2, backgroundColor: palette.card, borderWidth: 1, borderColor: role.color + "66" }}>
        <ThemedText variant="body" style={{ fontSize: 14.5, lineHeight: 21, color: palette.ink, fontStyle: isJudge ? "italic" : "normal", textAlign: isJudge ? "center" : "left" }}>
          {m.text}
        </ThemedText>
      </View>
    </View>
  );
}
