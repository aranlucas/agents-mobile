import type { ReactNode } from "react";
import type { StyleProp, ViewStyle } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export type ScreenSafeAreaProps = {
  children: ReactNode;
  style: StyleProp<ViewStyle>;
  top?: boolean;
};

export function ScreenSafeArea({ children, style, top = true }: ScreenSafeAreaProps) {
  return (
    <SafeAreaView style={style} edges={top ? ["top"] : []}>
      {children}
    </SafeAreaView>
  );
}
