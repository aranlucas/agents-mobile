import { useNavigation, type TabIconProps } from "@/runtime/navigation";
import { useColorScheme } from "react-native";

function TravelIcon({ color, size }: TabIconProps) {
  const { icons } = useNavigation();
  const Icon = icons.travel;

  return <Icon color={String(color)} size={size} />;
}

function GroceryIcon({ color, size }: TabIconProps) {
  const { icons } = useNavigation();
  const Icon = icons.grocery;

  return <Icon color={String(color)} size={size} />;
}

function FitnessIcon({ color, size }: TabIconProps) {
  const { icons } = useNavigation();
  const Icon = icons.fitness;

  return <Icon color={String(color)} size={size} />;
}

function WellnessIcon({ color, size }: TabIconProps) {
  const { icons } = useNavigation();
  const Icon = icons.wellness;

  return <Icon color={String(color)} size={size} />;
}

export function AppTabs() {
  const { Tabs } = useNavigation();
  const isDark = useColorScheme() === "dark";

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: isDark ? "#000" : "#fff",
          borderTopColor: isDark ? "#222" : "#e5e5e5",
        },
        tabBarActiveTintColor: isDark ? "#fff" : "#000",
        tabBarInactiveTintColor: isDark ? "#666" : "#999",
      }}
    >
      <Tabs.Screen name="travel" options={{ title: "Travel", tabBarIcon: TravelIcon }} />
      <Tabs.Screen name="grocery" options={{ title: "Grocery", tabBarIcon: GroceryIcon }} />
      <Tabs.Screen name="fitness" options={{ title: "Fitness", tabBarIcon: FitnessIcon }} />
      <Tabs.Screen name="wellness" options={{ title: "Wellness", tabBarIcon: WellnessIcon }} />
      <Tabs.Screen name="index" options={{ href: null }} />
    </Tabs>
  );
}
