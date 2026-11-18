import type { Transition } from 'motion/react';

/**
 * SwiftUI-inspired spring presets calibrated for crisp Apple-grade physics:
 * - Snappy: Segmented controls, pill slides, toggle switches (<= 200ms feel)
 * - Smooth: Page crossfades, matchedGeometryEffect transitions
 * - Sheet: iOS modal / drawer slide-up presentation
 * - Bouncy: Subtle interactive micro-feedback
 */
export const SWIFTUI_SNAPPY: Transition = {
  type: 'spring',
  stiffness: 480,
  damping: 36,
  mass: 0.75,
};

export const SWIFTUI_SMOOTH: Transition = {
  type: 'spring',
  stiffness: 320,
  damping: 32,
  mass: 0.9,
};

export const SWIFTUI_SHEET: Transition = {
  type: 'spring',
  stiffness: 340,
  damping: 34,
  mass: 0.85,
};

export const SWIFTUI_BOUNCY: Transition = {
  type: 'spring',
  stiffness: 400,
  damping: 26,
  mass: 0.8,
};

export const APPLE_EASE: [number, number, number, number] = [0.16, 1, 0.3, 1];
