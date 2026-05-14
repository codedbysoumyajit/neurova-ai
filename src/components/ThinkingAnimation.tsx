import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import { useTheme } from '@/src/theme/useTheme';

function PulseDot({ delay, color }: { delay: number; color: string }) {
  const scale = useRef(new Animated.Value(0.4)).current;
  const opacity = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.delay(delay),
        Animated.parallel([
          Animated.timing(scale, {
            toValue: 1,
            duration: 480,
            useNativeDriver: true,
          }),
          Animated.timing(opacity, {
            toValue: 1,
            duration: 480,
            useNativeDriver: true,
          }),
        ]),
        Animated.parallel([
          Animated.timing(scale, {
            toValue: 0.4,
            duration: 480,
            useNativeDriver: true,
          }),
          Animated.timing(opacity, {
            toValue: 0.3,
            duration: 480,
            useNativeDriver: true,
          }),
        ]),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [delay]);

  return (
    <Animated.View
      style={[
        styles.dot,
        {
          backgroundColor: color,
          transform: [{ scale }],
          opacity,
        },
      ]}
    />
  );
}

function ShimmerBar({ delay, width, color }: { delay: number; width: number | string; color: string }) {
  const opacity = useRef(new Animated.Value(0.15)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.delay(delay),
        Animated.timing(opacity, {
          toValue: 0.45,
          duration: 700,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 0.15,
          duration: 700,
          useNativeDriver: true,
        }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [delay]);

  return (
    <Animated.View
      style={{
        height: 8,
        width: width as any,
        borderRadius: 4,
        backgroundColor: color,
        opacity,
        marginVertical: 4,
      }}
    />
  );
}

export function ThinkingAnimation() {
  const c = useTheme();

  return (
    <View style={styles.container}>
      {/* Dots row */}
      <View style={styles.dotsRow}>
        <PulseDot delay={0} color={c.primary} />
        <PulseDot delay={160} color={c.accent} />
        <PulseDot delay={320} color={c.primary} />
        <Text style={[styles.label, { color: c.textSecondary }]}>Thinking…</Text>
      </View>

      {/* Shimmer skeleton lines */}
      <View style={styles.shimmerGroup}>
        <ShimmerBar delay={0} width="92%" color={c.primary} />
        <ShimmerBar delay={120} width="75%" color={c.primary} />
        <ShimmerBar delay={240} width="85%" color={c.primary} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingVertical: 6,
    paddingHorizontal: 4,
    minWidth: 160,
  },
  dotsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 10,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  label: {
    fontSize: 13,
    fontWeight: '500',
    marginLeft: 4,
    letterSpacing: 0.3,
  },
  shimmerGroup: {
    gap: 0,
  },
});
