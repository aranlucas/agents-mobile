import { createContext, useContext, type ReactNode, type ComponentType } from "react";
import type { ToolCall, useFrontendTool, useAgent } from "@copilotkit/react-native/headless";
import type { ProductResults } from "@/components/product-results-tool";
import type { AgentId } from "@/utils/agent-config";
import type { createHealthSync } from "@/utils/health-sync";

export type Session = {
  userId: string | null | undefined;
  getToken: () => Promise<string | null>;
};

export type Conversation = {
  messages: NonNullable<ReturnType<typeof useAgent>["agent"]>["messages"];
  state: unknown;
  isRunning: boolean;
  addMessage(message: { id: string; role: "user"; content: string }): void;
  run(): Promise<void>;
  readonly headers: Record<string, string>;
  setHeaders(headers: Record<string, string | null | undefined>): void;
};

export type ProductTool = Parameters<typeof useFrontendTool<ProductResults>>[0];

export type HealthServices = Omit<Parameters<typeof createHealthSync>[1], "getToken">;

/** Application ports. SDK hooks stay in the production adapter, native I/O at the root. */
export type AppRuntime = {
  session: Session;
  health: HealthServices;
  ConversationProvider: ComponentType<{ agentId: AgentId; children: ReactNode }>;
  ProductTool: ComponentType<{ tool: ProductTool }>;
};

const RuntimeContext = createContext<AppRuntime | null>(null);

export function AppRuntimeProvider({
  value,
  children,
}: {
  value: AppRuntime;
  children: ReactNode;
}) {
  return <RuntimeContext value={value}>{children}</RuntimeContext>;
}

export function useAppRuntime(): AppRuntime {
  const runtime = useContext(RuntimeContext);

  if (!runtime) throw new Error("AppRuntimeProvider is required");

  return runtime;
}

export type ConversationValue = {
  conversation: Conversation | undefined;
  renderToolCall: (input: { toolCall: ToolCall }) => ReactNode;
};

const ConversationContext = createContext<ConversationValue | null>(null);

export function ConversationProvider({
  value,
  children,
}: {
  value: ConversationValue;
  children: ReactNode;
}) {
  return <ConversationContext value={value}>{children}</ConversationContext>;
}

export function useConversation() {
  const value = useContext(ConversationContext);

  if (!value) throw new Error("ConversationProvider is required");

  return value;
}
