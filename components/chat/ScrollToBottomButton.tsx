import React from 'react';
import { StyleSheet, TouchableOpacity, Animated } from 'react-native';
import { useTheme } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';

interface ScrollToBottomButtonProps {
  onPress: () => void;
  animatedValue: Animated.Value;
}

export const ScrollToBottomButton = ({ onPress, animatedValue }: ScrollToBottomButtonProps) => {
  const theme = useTheme();

  const scale = animatedValue.interpolate({
    inputRange: [0, 1],
    outputRange: [0.8, 1],
  });

  const opacity = animatedValue.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 1],
  });

  return (
    <Animated.View
      style={[
        styles.container,
        {
          transform: [{ scale }],
          opacity,
        },
      ]}
    >
      <TouchableOpacity
        style={[
          styles.button,
          {
            backgroundColor: theme.colors.surfaceVariant,
            shadowColor: theme.colors.onSurfaceVariant,
          },
        ]}
        onPress={onPress}
        activeOpacity={0.8}
      >
        <MaterialCommunityIcons
          name="chevron-down"
          size={24}
          color={theme.colors.onSurfaceVariant}
        />
      </TouchableOpacity>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 120,
    right: 16,
    zIndex: 1000,
  },
  button: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
}); 