import { View } from "react-native";
import type { ScreenSafeAreaProps } from "./screen-safe-area";

// Router 58 disables safe-area measurements on web. CSS keeps the inset
// correct during server rendering and hydration, without another provider.
export function ScreenSafeArea({ children, style, top = true }: ScreenSafeAreaProps) {
  return (
    <View style={style}>
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          flex: 1,
          minHeight: 0,
          paddingTop: top ? "env(safe-area-inset-top, 0px)" : 0,
        }}
      >
        {children}
      </div>
    </View>
  );
}
