import type { TokenCache } from "@clerk/expo";
import type { ReactNode } from "react";
import { act, create } from "react-test-renderer";
import { expect, it, vi } from "vitest";
import { createRootLayout, createTokenCache, type LayoutBindings } from "./root-layout";

it("preserves native secure token storage and leaves web cache to Clerk", async () => {
  const storage = {
    getItemAsync: vi.fn(async (key: string) => `stored-${key}`),
    setItemAsync: vi.fn(async (_key: string, _value: string) => undefined),
  };

  const auth: { publishableKey: string; tokenCache?: TokenCache }[] = [];
  const order: string[] = [];

  function AuthProvider({
    children,
    ...props
  }: {
    children: ReactNode;
    publishableKey: string;
    tokenCache?: TokenCache;
  }) {
    auth.push(props);
    order.push("auth");

    return <>{children}</>;
  }

  function AgentProvider({ children }: { children: ReactNode }) {
    order.push("agent");

    return <>{children}</>;
  }

  function RuntimeProvider({ children }: { children: ReactNode }) {
    order.push("runtime");

    return <>{children}</>;
  }

  function Tabs({ children }: { children?: ReactNode }) {
    order.push("tabs");

    return <>{children}</>;
  }

  Tabs.Screen = () => null;

  function Icon() {
    return null;
  }

  const wrap = vi.fn((component: React.ComponentType) => component);

  const bindings: LayoutBindings = {
    providers: {
      AuthProvider,
      AgentProvider,
      RuntimeProvider,
      publishableKey: "fixture-key",
      runtimeUrl: "https://runtime.example.test",
    },
    navigation: {
      Tabs,
      Redirect: () => null,
      icons: { travel: Icon, grocery: Icon, fitness: Icon, wellness: Icon },
    },
    StatusBar: () => null,
    wrap,
  };

  const Native = createRootLayout(bindings, createTokenCache(storage));
  const Web = createRootLayout(bindings);
  expect(wrap).toHaveBeenCalledTimes(2);
  let tree: ReturnType<typeof create>;
  await act(async () => {
    tree = create(
      <>
        <Native />
        <Web />
      </>,
    );
  });
  expect(order.slice(-8)).toEqual([
    "auth",
    "agent",
    "runtime",
    "tabs",
    "auth",
    "agent",
    "runtime",
    "tabs",
  ]);
  expect(auth.at(-2)?.publishableKey).toBe("fixture-key");
  const nativeCache = auth.at(-2)?.tokenCache;
  expect(nativeCache).toBeDefined();
  expect(auth.at(-1)?.tokenCache).toBeUndefined();
  expect(await nativeCache?.getToken("session")).toBe("stored-session");
  await nativeCache?.saveToken("session", "fixture-token");
  expect(storage.getItemAsync).toHaveBeenCalledWith("session");
  expect(storage.setItemAsync).toHaveBeenCalledWith("session", "fixture-token");
  storage.getItemAsync.mockRejectedValueOnce(new Error("Storage unavailable"));
  await expect(nativeCache?.getToken("session")).rejects.toThrow("Storage unavailable");
  await act(async () => {
    tree.unmount();
  });
});
