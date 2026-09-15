import { useEffect, useState } from "react";
import { Animated } from "react-native";

export function StreamingCursor() {
  const [opacity] = useState(() => new Animated.Value(1));

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { duration: 500, toValue: 0, useNativeDriver: true }),
        Animated.timing(opacity, { duration: 500, toValue: 1, useNativeDriver: true }),
      ]),
    );
    animation.start();
    return () => animation.stop();
  }, [opacity]);

  return <Animated.Text style={{ opacity }}>▍</Animated.Text>;
}
