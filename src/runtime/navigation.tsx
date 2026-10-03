import { createContext, useContext, type ComponentType, type ReactNode } from "react";
import type { ColorValue } from "react-native";

export type TabIconProps = { color: ColorValue; size: number };

type ScreenProps = {
  name: string;
  options: { title?: string; href?: null; tabBarIcon?: (props: TabIconProps) => ReactNode };
};

export type Navigation = {
  Tabs: ComponentType<{
    children: ReactNode;
    screenOptions: {
      headerShown: boolean;
      tabBarStyle: { backgroundColor: string; borderTopColor: string };
      tabBarActiveTintColor: string;
      tabBarInactiveTintColor: string;
    };
  }> & { Screen: ComponentType<ScreenProps> };
  Redirect: ComponentType<{ href: "/travel" }>;
  icons: Record<
    "travel" | "grocery" | "fitness" | "wellness",
    ComponentType<{ color: string; size: number }>
  >;
};

const NavigationContext = createContext<Navigation | null>(null);

export function NavigationProvider({
  value,
  children,
}: {
  value: Navigation;
  children: ReactNode;
}) {
  return <NavigationContext value={value}>{children}</NavigationContext>;
}

export function useNavigation() {
  const navigation = useContext(NavigationContext);

  if (!navigation) throw new Error("NavigationProvider is required");

  return navigation;
}
