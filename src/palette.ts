import { mixOklch, shiftLightness } from './color'
import type { RoleName, Variant } from './types'

/** ANSI slots 0-15, byte-identical to ~/.config/ghostty/themes/focus. */
export const ansi = [
  '#2a251f', '#db6f6d', '#a6c45f', '#e6bb63', '#e0843c', '#d6836f', '#6fc2a0', '#dcd6cc',
  '#5c5347', '#ee8580', '#c2dd72', '#f5cc6e', '#f29a45', '#eb9a85', '#82d2b2', '#fff8ef',
] as const

const BACKGROUND = '#1a1714'
const FOREGROUND = '#e0dcd4'
const CURSOR = '#e0af68'
const SELECTION = '#3d352d'

/**
 * Three roles have no counterpart in the terminal palette, because a terminal
 * has one surface and an editor has several. They are interpolated along the
 * existing warm neutral ramp (OKLCH hue 67-85, chroma 0.007-0.022) rather than
 * hand-picked, so they track the palette if it shifts.
 */
const BG_SUNKEN_DELTA = -0.02
const BG_RAISED_DELTA = 0.022
const FG_MUTED_MIX = 0.45

/** Each role is [dark, light]. Light is unpopulated in this release. */
const palette: Record<RoleName, [string, string | null]> = {
  bgSunken: [shiftLightness(BACKGROUND, BG_SUNKEN_DELTA), null],
  bg: [BACKGROUND, null],
  bgRaised: [shiftLightness(BACKGROUND, BG_RAISED_DELTA), null],
  bgOverlay: [ansi[0], null],
  bgSelect: [SELECTION, null],

  fgBright: [ansi[15], null],
  fg: [FOREGROUND, null],
  fgSubtle: [ansi[7], null],
  fgMuted: [mixOklch(FOREGROUND, ansi[8], FG_MUTED_MIX), null],
  fgFaint: [ansi[8], null],

  accent: [ansi[4], null],
  accentBright: [ansi[12], null],
  cursor: [CURSOR, null],

  error: [ansi[1], null],
  errorBright: [ansi[9], null],
  warning: [ansi[3], null],
  warningBright: [ansi[11], null],
  success: [ansi[2], null],
  successBright: [ansi[10], null],
  info: [ansi[6], null],
  infoBright: [ansi[14], null],
  modified: [ansi[5], null],
  modifiedBright: [ansi[13], null],
}

export const roleNames = Object.keys(palette) as readonly RoleName[]

export function resolveRole(role: RoleName, variant: Variant): string {
  const [dark, light] = palette[role]
  if (variant === 'dark') return dark
  if (light === null) {
    throw new Error(
      `Role "${role}" has no light variant. The light variant is not implemented in this release.`,
    )
  }
  return light
}

export type { ColorRef, RoleName, Variant } from './types'
