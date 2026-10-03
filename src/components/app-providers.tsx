import type { TokenCache } from "@clerk/expo";
import type { ComponentType, ReactNode } from "react";

export type ProviderBindings = {
  AuthProvider: ComponentType<{
    children: ReactNode;
    publishableKey: string;
    tokenCache?: TokenCache;
  }>;
  AgentProvider: ComponentType<{
    children: ReactNode;
    runtimeUrl: string;
    defaultThrottleMs: number;
    useSingleEndpoint: boolean;
  }>;
  RuntimeProvider: ComponentType<{ children: ReactNode }>;
  publishableKey: string;
  runtimeUrl: string;
};

export function AppProviders({
  children,
  tokenCache,
  bindings,
}: {
  children: ReactNode;
  tokenCache?: TokenCache;
  bindings: ProviderBindings;
}) {
  const { AuthProvider, AgentProvider, RuntimeProvider, publishableKey, runtimeUrl } = bindings;

  return (
    <AuthProvider publishableKey={publishableKey} tokenCache={tokenCache}>
      <AgentProvider defaultThrottleMs={0} runtimeUrl={runtimeUrl} useSingleEndpoint={false}>
        <RuntimeProvider>{children}</RuntimeProvider>
      </AgentProvider>
    </AuthProvider>
  );
}
