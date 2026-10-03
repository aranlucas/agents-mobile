import type { ComponentType } from "react";
import type { TokenCache } from "@clerk/expo";
import { AppProviders, type ProviderBindings } from "@/components/app-providers";
import { AppTabs } from "@/components/app-tabs";
import { NavigationProvider, type Navigation } from "./navigation";

export type LayoutBindings = {
  providers: ProviderBindings;
  navigation: Navigation;
  StatusBar: ComponentType<{ style: "auto" }>;
  wrap(component: ComponentType): ComponentType;
};

/** Both platform entry points share the same provider/navigation ordering. */
export function createRootLayout(bindings: LayoutBindings, tokenCache?: TokenCache) {
  const { StatusBar } = bindings;

  function RootLayout() {
    return (
      <AppProviders bindings={bindings.providers} tokenCache={tokenCache}>
        <NavigationProvider value={bindings.navigation}>
          <AppTabs />
          <StatusBar style="auto" />
        </NavigationProvider>
      </AppProviders>
    );
  }

  return bindings.wrap(RootLayout);
}

export function createTokenCache(store: {
  getItemAsync(key: string): Promise<string | null>;
  setItemAsync(key: string, value: string): Promise<void>;
}): TokenCache {
  return {
    getToken: (key) => store.getItemAsync(key),
    saveToken: (key, value) => store.setItemAsync(key, value),
  };
}
