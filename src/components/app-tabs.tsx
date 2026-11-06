import { useNavigation, type TabIconProps } from "@/runtime/navigation";
import { useColorScheme } from "react-native";

import { AGENT_ORDER, type AgentId } from "@/types";

const titles: Record<AgentId, string> = {
  travel: "Travel",
  grocery: "Grocery",
  fitness: "Fitness",
  wellness: "Wellness",
};

function AgentIcon({ agentId, color, size }: TabIconProps & { agentId: AgentId }) {
  const { icons } = useNavigation();
  const Icon = icons[agentId];

  return <Icon color={String(color)} size={size} />;
}

const tabOptions = AGENT_ORDER.map((id) => ({
  id,
  title: titles[id],
  tabBarIcon: (props: TabIconProps) => <AgentIcon agentId={id} {...props} />,
}));

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
      {tabOptions.map(({ id, title, tabBarIcon }) => (
        <Tabs.Screen key={id} name={id} options={{ title, tabBarIcon }} />
      ))}
      <Tabs.Screen name="index" options={{ href: null }} />
    </Tabs>
  );
}
