import { ClerkProvider, useAuth } from "@clerk/expo";
import { CopilotKitProvider } from "@copilotkit/react-native/headless";
import Constants from "expo-constants";
import { StatusBar } from "expo-status-bar";
import { Redirect, Tabs } from "expo-router";
import { Dumbbell, HeartPulse, Plane, ShoppingCart } from "lucide-react-native";
import type { ReactNode } from "react";
import { getCopilotKitRuntimeUrl } from "@/utils/agent-config";
import { Sentry } from "@/utils/sentry";
import { AppRuntimeProvider } from "./app-runtime";
import { SdkConversationProvider, SdkProductTool } from "./sdk-runtime";
import type { LayoutBindings } from "./root-layout";

function RuntimeProvider({ children }: { children: ReactNode }) {
  const { userId, getToken } = useAuth();

  return (
    <AppRuntimeProvider
      value={{
        session: { userId, getToken },
        ConversationProvider: SdkConversationProvider,
        ProductTool: SdkProductTool,
      }}
    >
      {children}
    </AppRuntimeProvider>
  );
}

export const productionBindings: LayoutBindings = {
  providers: {
    AuthProvider: ClerkProvider,
    AgentProvider: CopilotKitProvider,
    RuntimeProvider,
    publishableKey:
      Constants.expoConfig?.extra?.clerkPublishableKey ??
      process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY ??
      "",
    runtimeUrl: getCopilotKitRuntimeUrl(),
  },
  navigation: {
    Tabs,
    Redirect,
    icons: { travel: Plane, grocery: ShoppingCart, fitness: Dumbbell, wellness: HeartPulse },
  },
  StatusBar,
  wrap: Sentry.wrap,
};
