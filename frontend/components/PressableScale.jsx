import React from 'react';
import { Pressable } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from 'react-native-reanimated';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export default function PressableScale({
  activeScale = 1.06,
  style,
  children,
  onPressIn,
  onPressOut,
  ...props
}) {
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePressIn = (e) => {
    scale.value = withSpring(activeScale);
    if (onPressIn) onPressIn(e);
  };

  const handlePressOut = (e) => {
    scale.value = withSpring(1);
    if (onPressOut) onPressOut(e);
  };

  return (
    <AnimatedPressable
      style={[style, animatedStyle]}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      {...props}
    >
      {children}
    </AnimatedPressable>
  );
}
