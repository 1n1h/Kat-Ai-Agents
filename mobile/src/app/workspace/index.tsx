import TextRecognition from "@react-native-ml-kit/text-recognition";
import * as DocumentPicker from "expo-document-picker";
import * as Haptics from "expo-haptics";
import * as ImagePicker from "expo-image-picker";
import * as Speech from "expo-speech";
import { SymbolView } from "expo-symbols";
import { useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { Seal } from "@/components/seal";
import { ThemedText } from "@/components/themed-text";
import { Radius, Spacing } from "@/constants/theme";
import { useMatters } from "@/hooks/use-matters";
import { useTheme } from "@/hooks/use-theme";
import { extractDocument, streamChat } from "@/lib/api";
import { agentName } from "@/lib/agents";
import type { Msg } from "@/lib/store";

/** Approx. height of the floating native tab bar, so the composer clears it. */
const TAB_BAR_SPACE = 52;

export default function Assistant() {
  const { palette } = useTheme();
  const insets = useSafeAreaInsets();
  const { active, appendMessage } = useMatters();
  const [draft, setDraft] = useState("");
  const [live, setLive] = useState("");
  const [status, setStatus] = useState<string | null>(null);
  const [streaming, setStreaming] = useState(false);
  const [reading, setReading] = useState(false);
  const scrollRef = useRef<ScrollView>(null);

  const messages = active?.messages ?? [];
  const empty = messages.length === 0 && !live;

  /** On-device OCR (ML Kit). Reads text from an image URI into the composer. */
  async function recognizeUri(uri: string) {
    setReading(true);
    setStatus("Reading document…");
    try {
      const result = await TextRecognition.recognize(uri);
      const text = (result?.text ?? "").trim();
      if (text) {
        setDraft((d) => (d ? `${d}\n\n${text}` : text));
      } else {
        Alert.alert("Nothing found", "I couldn't read any text from that image.");
      }
    } catch {
      Alert.alert("Couldn't read it", "Try a clearer, well-lit photo.");
    } finally {
      setReading(false);
      setStatus(null);
    }
  }

  async function scanCamera() {
    const perm = await ImagePicker.requestCameraPermissionsAsync();
    if (!perm.granted) {
      Alert.alert("Camera access needed", "Enable camera access in Settings to scan.");
      return;
    }
    const res = await ImagePicker.launchCameraAsync({ quality: 0.85 });
    const a = res.assets?.[0];
    if (!res.canceled && a?.uri) void recognizeUri(a.uri);
  }

  async function choosePhoto() {
    const res = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      quality: 0.85,
    });
    const a = res.assets?.[0];
    if (!res.canceled && a?.uri) void recognizeUri(a.uri);
  }

  async function chooseDocument() {
    const res = await DocumentPicker.getDocumentAsync({
      type: [
        "application/pdf",
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "text/plain",
        "text/markdown",
      ],
      copyToCacheDirectory: true,
    });
    const a = res.assets?.[0];
    if (res.canceled || !a) return;
    setReading(true);
    setStatus("Reading document…");
    try {
      const text = await extractDocument(
        a.uri,
        a.name,
        a.mimeType || "application/octet-stream",
      );
      if (text) {
        setDraft((d) => (d ? `${d}\n\n${text}` : text));
      } else {
        Alert.alert("Nothing found", "I couldn't read any text from that file.");
      }
    } catch (e) {
      Alert.alert(
        "Couldn't read it",
        e instanceof Error ? e.message : "Try a PDF, Word doc, or text file.",
      );
    } finally {
      setReading(false);
      setStatus(null);
    }
  }

  function attach() {
    if (streaming || reading) return;
    Haptics.selectionAsync().catch(() => {});
    Alert.alert("Add a document", "Read a document into this matter.", [
      { text: "Scan with camera", onPress: () => void scanCamera() },
      { text: "Choose a photo", onPress: () => void choosePhoto() },
      { text: "Choose a file (PDF, Word)", onPress: () => void chooseDocument() },
      { text: "Cancel", style: "cancel" },
    ]);
  }

  const send = async () => {
    const text = draft.trim();
    if (!text || !active || streaming) return;
    Haptics.selectionAsync().catch(() => {});
    const userMsg: Msg = { role: "user", content: text };
    const history = [...messages, userMsg].map(({ role, content }) => ({
      role,
      content,
    }));
    appendMessage(active.id, userMsg);
    setDraft("");
    setLive("");
    setStatus(null);
    setStreaming(true);

    let acc = "";
    const docs: { name: string; content: string }[] = [];
    try {
      await streamChat(
        { messages: history, agentId: "auto", matterId: active.id, matterMemory: null },
        (ev) => {
          if ((ev.t === "delta" || ev.t === "text") && ev.text) {
            acc += (ev.t === "text" && acc ? "\n\n" : "") + ev.text;
            setLive(acc);
          } else if (ev.t === "status" && ev.text) {
            setStatus(ev.text);
          } else if (ev.t === "document" && ev.name && ev.text) {
            docs.push({ name: ev.name, content: ev.text });
          } else if (ev.t === "error" && ev.text) {
            acc += `${acc ? "\n\n" : ""}⚠️ ${ev.text}`;
          }
        },
      );
    } catch {
      acc += `${acc ? "\n\n" : ""}⚠️ Connection error.`;
    }
    appendMessage(active.id, {
      role: "assistant",
      content: acc || "No response produced.",
      agentId: "auto",
      ...(docs.length ? { docs } : {}),
    });
    setLive("");
    setStatus(null);
    setStreaming(false);
  };

  return (
    <View style={{ flex: 1, backgroundColor: palette.bg }}>
      <SafeAreaView edges={["top"]} style={{ flex: 1 }}>
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === "ios" ? "padding" : undefined}
          keyboardVerticalOffset={8}
        >
          {/* header */}
          <View
            style={{
              paddingHorizontal: Spacing.lg,
              paddingVertical: Spacing.sm,
              borderBottomWidth: 1,
              borderBottomColor: palette.divider,
            }}
          >
            <ThemedText
              variant="eyebrow"
              tone="accent"
              numberOfLines={1}
            >
              {active?.name ?? "—"} · Orchestrated
            </ThemedText>
          </View>

          <ScrollView
            ref={scrollRef}
            contentContainerStyle={{
              padding: Spacing.lg,
              gap: Spacing.md,
              flexGrow: 1,
            }}
            onContentSizeChange={() =>
              scrollRef.current?.scrollToEnd({ animated: true })
            }
            keyboardDismissMode="interactive"
          >
            {empty ? (
              <View
                style={{
                  flex: 1,
                  alignItems: "center",
                  justifyContent: "center",
                  gap: Spacing.lg,
                  paddingTop: Spacing.xxl,
                }}
              >
                <Seal size={72} />
                <ThemedText variant="title" style={{ textAlign: "center" }}>
                  Ask in plain language
                </ThemedText>
                <ThemedText
                  variant="body"
                  tone="soft"
                  style={{ textAlign: "center", maxWidth: 300 }}
                >
                  Draft a letter, flag risk clauses, check citations — the
                  orchestrator routes it and verifies the result.
                </ThemedText>
              </View>
            ) : (
              messages.map((m, i) => <Bubble key={i} msg={m} />)
            )}

            {streaming && (
              <View>
                {status ? (
                  <ThemedText
                    variant="eyebrow"
                    tone="muted"
                    style={{ marginBottom: 4 }}
                  >
                    {status}
                  </ThemedText>
                ) : null}
                {live ? (
                  <Bubble msg={{ role: "assistant", content: live, agentId: "auto" }} />
                ) : (
                  <ActivityIndicator color={palette.brand} />
                )}
              </View>
            )}
          </ScrollView>

          {/* composer — a floating rounded pill that clears the tab bar */}
          <View
            style={{
              paddingHorizontal: Spacing.lg,
              paddingTop: Spacing.sm,
              paddingBottom: insets.bottom + TAB_BAR_SPACE,
            }}
          >
            <View
              style={{
                flexDirection: "row",
                alignItems: "flex-end",
                gap: 4,
                backgroundColor: palette.bgRaised,
                borderRadius: 26,
                borderWidth: 1,
                borderColor: palette.divider,
                paddingHorizontal: 6,
                paddingVertical: 6,
              }}
            >
              <Pressable
                onPress={attach}
                disabled={streaming || reading}
                style={{
                  width: 38,
                  height: 38,
                  borderRadius: 19,
                  alignItems: "center",
                  justifyContent: "center",
                  backgroundColor: palette.bg,
                  opacity: streaming || reading ? 0.5 : 1,
                }}
              >
                {reading ? (
                  <ActivityIndicator color={palette.brand} />
                ) : (
                  <SymbolView name="plus" size={18} tintColor={palette.inkSoft} />
                )}
              </Pressable>
              <TextInput
                value={draft}
                onChangeText={setDraft}
                placeholder="Ask Lex anything…"
                placeholderTextColor={palette.inkMuted}
                multiline
                style={{
                  flex: 1,
                  maxHeight: 120,
                  minHeight: 38,
                  color: palette.ink,
                  paddingHorizontal: 6,
                  paddingTop: 9,
                  paddingBottom: 9,
                  fontSize: 16,
                }}
              />
              <Pressable
                onPress={send}
                disabled={!draft.trim() || streaming}
                style={({ pressed }) => [
                  {
                    width: 38,
                    height: 38,
                    borderRadius: 19,
                    alignItems: "center",
                    justifyContent: "center",
                    backgroundColor:
                      !draft.trim() || streaming ? palette.bg : palette.brand,
                  },
                  pressed && { transform: [{ scale: 0.95 }] },
                ]}
              >
                <SymbolView
                  name="arrow.up"
                  size={18}
                  tintColor={!draft.trim() || streaming ? palette.inkMuted : "#FFFFFF"}
                />
              </Pressable>
            </View>
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
}

function Bubble({ msg }: { msg: Msg }) {
  const { palette } = useTheme();
  const isUser = msg.role === "user";
  const [speaking, setSpeaking] = useState(false);

  const toggleSpeak = () => {
    if (speaking) {
      Speech.stop();
      setSpeaking(false);
      return;
    }
    Speech.stop();
    setSpeaking(true);
    Speech.speak(msg.content, {
      rate: 1.0,
      onDone: () => setSpeaking(false),
      onStopped: () => setSpeaking(false),
      onError: () => setSpeaking(false),
    });
  };

  return (
    <View style={{ alignItems: isUser ? "flex-end" : "flex-start" }}>
      {!isUser && (
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            gap: 8,
            marginBottom: 4,
          }}
        >
          <ThemedText variant="eyebrow" tone="accent">
            {agentName(msg.agentId ?? "auto")}
          </ThemedText>
          <Pressable onPress={toggleSpeak} hitSlop={8}>
            <SymbolView
              name={speaking ? "stop.circle.fill" : "speaker.wave.2.fill"}
              size={13}
              tintColor={speaking ? palette.brand : palette.inkMuted}
            />
          </Pressable>
        </View>
      )}
      <View
        style={{
          maxWidth: "92%",
          borderRadius: Radius.lg,
          paddingHorizontal: Spacing.md,
          paddingVertical: Spacing.sm + 2,
          backgroundColor: isUser ? palette.brandSoft : palette.card,
          borderWidth: isUser ? 0 : 1,
          borderColor: palette.divider,
        }}
      >
        <ThemedText
          variant="body"
          style={{ color: palette.ink, fontSize: isUser ? 16 : 15.5, lineHeight: 23 }}
        >
          {msg.content}
        </ThemedText>
        {msg.docs?.map((d) => (
          <View
            key={d.name}
            style={{
              marginTop: Spacing.sm,
              flexDirection: "row",
              alignItems: "center",
              gap: 8,
              borderRadius: Radius.md,
              borderWidth: 1,
              borderColor: palette.divider,
              backgroundColor: palette.bgRaised,
              paddingHorizontal: 10,
              paddingVertical: 8,
            }}
          >
            <SymbolView name="doc.text.fill" size={15} tintColor={palette.brand} />
            <ThemedText variant="mono" style={{ fontSize: 12 }} numberOfLines={1}>
              {d.name}
            </ThemedText>
          </View>
        ))}
      </View>
    </View>
  );
}
