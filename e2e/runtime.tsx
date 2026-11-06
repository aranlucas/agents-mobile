// CI-only adapter for existing application ports; production never imports it.
import { useRef, useState, type ReactNode } from "react";
import { Tabs, Redirect } from "expo-router";
import { Plane, ShoppingCart, Dumbbell, HeartPulse } from "lucide-react-native";
import { StatusBar } from "expo-status-bar";
import {
  AppRuntimeProvider,
  ConversationProvider,
  type Conversation,
} from "../src/runtime/app-runtime";
import type { LayoutBindings } from "../src/runtime/root-layout";
import type { AgentId } from "../src/types";

function Host({ children }: { children: ReactNode }) {
  return <>{children}</>;
}

function FixtureConversation({ children, agentId }: { children: ReactNode; agentId: AgentId }) {
  const [messages, setMessages] = useState<Conversation["messages"]>([]);
  const [state, setState] = useState({});
  const lastMessage = useRef("");
  const conversation: Conversation = {
    messages,
    state,
    isRunning: false,
    headers: {},
    setHeaders: () => {},
    addMessage(message) {
      lastMessage.current = message.content;
      setMessages((current) => [...current, message]);
    },
    async run() {
      setState(agentId === "travel" ? { destination: "Kyoto", status: "drafting" } : {});
      setMessages((current) => [
        ...current,
        {
          id: `reply-${current.length}`,
          role: "assistant",
          content: `Received: ${lastMessage.current}`,
        },
      ]);
    },
  };
  return (
    <ConversationProvider value={{ conversation, renderToolCall: () => null }}>
      {children}
    </ConversationProvider>
  );
}

function RuntimeProvider({ children }: { children: ReactNode }) {
  const attempts = useRef(0);
  return (
    <AppRuntimeProvider
      value={{
        session: {
          userId: "ci-fixture",
          getToken: async () => {
            attempts.current += 1;
            if (attempts.current === 1) throw new Error("Controlled offline token refresh");
            return "fixture-token";
          },
        },
        ConversationProvider: FixtureConversation,
        ProductTool: () => null,
      }}
    >
      {children}
    </AppRuntimeProvider>
  );
}

export const productionBindings: LayoutBindings = {
  providers: {
    AuthProvider: Host,
    AgentProvider: Host,
    RuntimeProvider,
    publishableKey: "",
    runtimeUrl: "",
  },
  navigation: {
    Tabs,
    Redirect,
    icons: { travel: Plane, grocery: ShoppingCart, fitness: Dumbbell, wellness: HeartPulse },
  },
  StatusBar,
  wrap: (component) => component,
};
