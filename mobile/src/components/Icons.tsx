import React from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

type IconProps = {
  size?: number;
  color?: string;
  strokeWidth?: number;
  style?: StyleProp<ViewStyle>;
};

export function ChevronLeftIcon({ size = 22, color = '#FFFFFF', strokeWidth = 2.4, style }: IconProps) {
  const arm = Math.round(size * 0.38);
  return (
    <View style={[{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }, style]}>
      <View
        style={{
          width: arm,
          height: arm,
          borderLeftWidth: strokeWidth,
          borderBottomWidth: strokeWidth,
          borderColor: color,
          borderRadius: 1,
          transform: [{ rotate: '45deg' }, { translateX: Math.round(size * 0.08) }],
        }}
      />
    </View>
  );
}

export function PublishIcon({ size = 26, color = '#FFFFFF', strokeWidth = 2.4, style }: IconProps) {
  const w = Math.round(size * 0.8);
  const arrowH = Math.round(size * 0.52);
  const headSize = Math.round(size * 0.28);
  return (
    <View style={[{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }, style]}>
      {/* Arrow stem */}
      <View
        style={{
          width: strokeWidth,
          height: arrowH,
          backgroundColor: color,
          borderRadius: strokeWidth / 2,
          position: 'absolute',
          top: 3,
        }}
      />
      {/* Arrow head */}
      <View
        style={{
          width: headSize,
          height: headSize,
          borderTopWidth: strokeWidth,
          borderLeftWidth: strokeWidth,
          borderColor: color,
          borderRadius: 1.5,
          position: 'absolute',
          top: 3,
          transform: [{ rotate: '45deg' }],
        }}
      />
      {/* Tray */}
      <View
        style={{
          position: 'absolute',
          bottom: 2,
          width: w,
          height: size * 0.32,
          borderLeftWidth: strokeWidth,
          borderRightWidth: strokeWidth,
          borderBottomWidth: strokeWidth,
          borderColor: color,
          borderRadius: 2,
        }}
      />
    </View>
  );
}

/** Scissors / Edit Icon */
export function ScissorsIcon({ size = 26, color = '#FFFFFF', strokeWidth = 2.2, style }: IconProps) {
  const loopD = Math.round(size * 0.34);
  return (
    <View style={[{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }, style]}>
      {/* Blade 1 */}
      <View
        style={{
          position: 'absolute',
          width: strokeWidth,
          height: size * 0.72,
          backgroundColor: color,
          borderRadius: strokeWidth / 2,
          transform: [{ rotate: '32deg' }],
        }}
      />
      {/* Blade 2 */}
      <View
        style={{
          position: 'absolute',
          width: strokeWidth,
          height: size * 0.72,
          backgroundColor: color,
          borderRadius: strokeWidth / 2,
          transform: [{ rotate: '-32deg' }],
        }}
      />
      {/* Loop left */}
      <View
        style={{
          position: 'absolute',
          bottom: 1,
          left: 1,
          width: loopD,
          height: loopD,
          borderRadius: loopD / 2,
          borderWidth: strokeWidth,
          borderColor: color,
        }}
      />
      {/* Loop right */}
      <View
        style={{
          position: 'absolute',
          bottom: 1,
          right: 1,
          width: loopD,
          height: loopD,
          borderRadius: loopD / 2,
          borderWidth: strokeWidth,
          borderColor: color,
        }}
      />
      {/* Pivot rivet */}
      <View
        style={{
          position: 'absolute',
          top: Math.round(size * 0.44),
          width: 4,
          height: 4,
          borderRadius: 2,
          backgroundColor: color,
        }}
      />
    </View>
  );
}

/** Big Play Triangle Icon with subtle roundness */
export function PlayIcon({ size = 30, color = '#FFFFFF', style }: IconProps) {
  const s = size * 0.6;
  return (
    <View style={[{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }, style]}>
      <View
        style={{
          width: 0,
          height: 0,
          borderLeftWidth: s,
          borderRightWidth: 0,
          borderTopWidth: s * 0.62,
          borderBottomWidth: s * 0.62,
          borderStyle: 'solid',
          borderLeftColor: color,
          borderTopColor: 'transparent',
          borderRightColor: 'transparent',
          borderBottomColor: 'transparent',
          transform: [{ translateX: 2 }],
        }}
      />
    </View>
  );
}
