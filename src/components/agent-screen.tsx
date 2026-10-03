import { z } from "zod";
import type { ReactNode } from "react";
import { useCallback, useRef, useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAppRuntime, useConversation } from "@/runtime/app-runtime";
import type { ToolCall, useAgent } from "@copilotkit/react-native/headless";
import { NativeMarkdown, type NativeMarkdownStyle } from "@/native-markdown";
import type { FitnessState, GroceryState, TripState, WellnessState } from "@agents/types";
import type { AgentId } from "@/utils/agent-config";
import { runWithCurrentClerkToken } from "@/utils/copilotkit-auth";

type AgentState = TripState | GroceryState | FitnessState | WellnessState;

type AgentScreenConfig<TState extends AgentState> = {
  id: AgentId;
  summarySchema: z.ZodType<TState>;
  title: string;
  subtitle: string;
  placeholder: string;
  accentColor: string;
  renderSummary: (state: TState) => ReactNode;
};

type Props<TState extends AgentState> = {
  config: AgentScreenConfig<TState>;
  initialState: TState;
  /** Skip top inset when a parent already wraps this column. */
  safeArea?: boolean;
};

type DisplayMessage = { id: string; role: "user" | "assistant"; content: string };

type DisplayToolCall = {
  id: string;
  kind: "tool-call";
  toolCall: ToolCall;
};

type DisplayItem = DisplayMessage | DisplayToolCall;

type AgentMessage = NonNullable<ReturnType<typeof useAgent>["agent"]>["messages"][number];

const messageSchema = z.object({
  role: z.enum(["user", "assistant"]),
  content: z.string().optional().catch(undefined),
  id: z.string().optional().catch(undefined),
  toolCalls: z.array(z.unknown()).optional().catch(undefined),
});

const toolCallSchema = z.object({
  id: z.string().optional().catch(undefined),
  function: z.object({
    name: z.string(),
    arguments: z.string().catch("{}"),
  }),
});

function toDisplayItems(message: AgentMessage, index: number): DisplayItem[] {
  const parsed = messageSchema.safeParse(message);

  if (!parsed.success) return [];

  const msg = parsed.data;
  const role = msg.role;
  const id = msg.id ?? `${role}-${index}`;
  const items: DisplayItem[] = [];

  if (msg.content) items.push({ id, role, content: msg.content });

  if (role !== "assistant") return items;

  for (const [toolIndex, value] of (msg.toolCalls ?? []).entries()) {
    const parsedCall = toolCallSchema.safeParse(value);

    if (!parsedCall.success) continue;

    const call = parsedCall.data;
    const callId = call.id ?? `${id}-tool-${toolIndex}`;
    // Keep partial streaming JSON raw for the SDK's tolerant argument parser.
    const raw: ToolCall = { id: callId, type: "function", function: call.function };
    items.push({ id: callId, kind: "tool-call", toolCall: raw });
  }

  return items;
}

export function AgentScreen<TState extends AgentState>(props: Props<TState>) {
  const { ConversationProvider } = useAppRuntime();

  return (
    <ConversationProvider agentId={props.config.id}>
      <AgentScreenContent {...props} />
    </ConversationProvider>
  );
}

function AgentScreenContent<TState extends AgentState>({
  config,
  initialState,
  safeArea = true,
}: Props<TState>) {
  const [input, setInput] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [sendError, setSendError] = useState<string>();
  const submitting = useRef(false);
  const scrollRef = useRef<ScrollView>(null);

  const { session } = useAppRuntime();
  const { conversation: agent, renderToolCall } = useConversation();
  const { getToken, userId } = session;

  const messages = (agent?.messages ?? []).flatMap(toDisplayItems);

  const parsedState = config.summarySchema.safeParse(agent?.state ?? initialState);
  const state = parsedState.success ? parsedState.data : initialState;
  const isLoading = agent?.isRunning ?? false;

  const onSend = useCallback(async () => {
    const content = input.trim();

    if (!content || isLoading || submitting.current || !agent) return;
    // Reserve synchronously: SDK isRunning does not cover the auth refresh.
    submitting.current = true;
    setIsSubmitting(true);
    setSendError(undefined);
    let added = false;

    try {
      await runWithCurrentClerkToken({
        copilotkit: agent,
        getToken,
        userId,
        run: () => {
          agent.addMessage({
            id: `user_${Date.now()}_${Math.random().toString(36).slice(2)}`,
            role: "user",
            content,
          });
          added = true;
          // Do not erase a newer draft typed while authentication was pending.
          setInput((current) => (current === input ? "" : current));

          return agent.run();
        },
      });
    } catch {
      setSendError(
        added
          ? "Your message is in the conversation, but the reply could not be confirmed. Check the conversation before sending it again."
          : "Your message was not sent. Check your connection and sign-in, then try again.",
      );
    } finally {
      submitting.current = false;
      setIsSubmitting(false);
    }
  }, [input, isLoading, agent, getToken, userId]);

  const summary = config.renderSummary(state);

  return (
    <SafeAreaView style={styles.container} edges={safeArea ? ["top"] : []}>
      <KeyboardAvoidingView
        style={styles.fill}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <View style={[styles.header, { borderTopColor: config.accentColor }]}>
          {
            // oxlint-disable-next-line typescript/prefer-nullish-coalescing
            summary ? (
              summary
            ) : (
              <View style={styles.emptyState}>
                <Text selectable style={styles.emptyTitle}>
                  {config.title}
                </Text>
                <Text selectable style={styles.emptySubtitle}>
                  {config.subtitle}
                </Text>
              </View>
            )
          }
        </View>

        <ScrollView
          ref={scrollRef}
          style={styles.messageList}
          contentContainerStyle={styles.messageContent}
          onContentSizeChange={() => scrollRef.current?.scrollToEnd({ animated: true })}
        >
          {messages.map((m, index) => {
            if ("kind" in m) {
              const rendered = renderToolCall({ toolCall: m.toolCall });

              return rendered ? (
                <View key={m.id} style={styles.toolCall}>
                  {rendered}
                </View>
              ) : null;
            }

            return (
              <View
                key={m.id}
                style={[styles.bubble, m.role === "user" ? styles.userBubble : styles.agentBubble]}
              >
                {m.role === "user" ? (
                  <Text selectable style={[styles.bubbleText, styles.userText]}>
                    {m.content}
                  </Text>
                ) : (
                  <NativeMarkdown
                    isStreaming={isLoading && index === messages.length - 1}
                    style={markdownStyle}
                  >
                    {m.content}
                  </NativeMarkdown>
                )}
              </View>
            );
          })}
          {isLoading && <ActivityIndicator style={styles.loading} />}
        </ScrollView>

        {sendError && (
          <Text selectable accessibilityRole="alert" style={styles.sendError}>
            {sendError}
          </Text>
        )}
        <View style={styles.inputRow}>
          <TextInput
            style={styles.input}
            value={input}
            onChangeText={setInput}
            placeholder={config.placeholder}
            placeholderTextColor="#777"
            onSubmitEditing={onSend}
            returnKeyType="send"
            multiline
          />
          <Pressable
            style={[styles.sendButton, { backgroundColor: config.accentColor }]}
            onPress={onSend}
            accessibilityRole="button"
            disabled={isSubmitting || isLoading}
          >
            <Text style={styles.sendText}>{isSubmitting ? "Sending..." : "Send"}</Text>
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

export function Field({ label, value }: { label: string; value?: string | number | boolean }) {
  if (value === undefined || value === null || value === "") return null;

  return (
    <View style={styles.field}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <Text selectable style={styles.fieldValue}>
        {String(value)}
      </Text>
    </View>
  );
}

export function SummaryCard({ children }: { children: ReactNode }) {
  return <View style={styles.summaryCard}>{children}</View>;
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff" },
  fill: { flex: 1 },
  header: {
    borderTopWidth: 4,
    borderBottomWidth: 1,
    borderBottomColor: "#e8e8e8",
    backgroundColor: "#fff",
  },
  emptyState: { padding: 24, alignItems: "center", gap: 4 },
  emptyTitle: { fontSize: 22, fontWeight: "700", color: "#111" },
  emptySubtitle: { fontSize: 14, color: "#777", textAlign: "center" },
  messageList: { flex: 1 },
  messageContent: { paddingHorizontal: 12, paddingVertical: 8 },
  bubble: { marginVertical: 4, padding: 10, borderRadius: 12, maxWidth: "85%" },
  userBubble: { backgroundColor: "#111", alignSelf: "flex-end" },
  agentBubble: { backgroundColor: "#f0f0f0", alignSelf: "flex-start" },
  bubbleText: { fontSize: 14, lineHeight: 20 },
  userText: { color: "#fff" },
  loading: { margin: 12 },
  toolCall: { alignSelf: "stretch", marginVertical: 6 },
  sendError: { color: "#b91c1c", paddingHorizontal: 12, paddingVertical: 8 },
  inputRow: {
    flexDirection: "row",
    padding: 12,
    borderTopWidth: 1,
    borderTopColor: "#eee",
    gap: 8,
  },
  input: {
    flex: 1,
    minHeight: 40,
    maxHeight: 120,
    backgroundColor: "#f5f5f5",
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 15,
    color: "#111",
  },
  sendButton: {
    borderRadius: 20,
    paddingHorizontal: 16,
    justifyContent: "center",
  },
  sendText: { color: "#fff", fontWeight: "600", fontSize: 14 },
  summaryCard: { padding: 16, gap: 10 },
  field: { gap: 2 },
  fieldLabel: { color: "#777", fontSize: 11, fontWeight: "700", textTransform: "uppercase" },
  fieldValue: { color: "#111", fontSize: 15, lineHeight: 20 },
});

const markdownStyle: NativeMarkdownStyle = {
  body: { color: "#111", fontSize: 14, lineHeight: 20 },
  table: { borderColor: "#d8d8d8" },
  thead: { backgroundColor: "#e4e4e4" },
  tr: { borderColor: "#d8d8d8" },
  code_inline: { backgroundColor: "#e4e4e4", borderColor: "#d8d8d8" },
  code_block: { backgroundColor: "#e4e4e4", borderColor: "#d8d8d8" },
  fence: { backgroundColor: "#e4e4e4", borderColor: "#d8d8d8" },
};
