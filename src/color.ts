export type RGB = [number, number, number]

export interface Oklch {
  l: number
  c: number
  h: number
}

type Matrix = readonly [readonly number[], readonly number[], readonly number[]]

const LMS_FROM_LINEAR: Matrix = [
  [0.4122214708, 0.5363325363, 0.0514459929],
  [0.2119034982, 0.6806995451, 0.1073969566],
  [0.0883024619, 0.2817188376, 0.6299787005],
]
const LAB_FROM_LMS: Matrix = [
  [0.2104542553, 0.793617785, -0.0040720468],
  [1.9779984951, -2.428592205, 0.4505937099],
  [0.0259040371, 0.7827717662, -0.808675766],
]
const LMS_FROM_LAB: Matrix = [
  [1, 0.3963377774, 0.2158037573],
  [1, -0.1055613458, -0.0638541728],
  [1, -0.0894841775, -1.291485548],
]
const LINEAR_FROM_LMS: Matrix = [
  [4.0767416621, -3.3077115913, 0.2309699292],
  [-1.2684380046, 2.6097574011, -0.3413193965],
  [-0.0041960863, -0.7034186147, 1.707614701],
]

const GAMUT_EPSILON = 1e-6

function apply(m: Matrix, v: RGB): RGB {
  return [0, 1, 2].map((i) => {
    const row = m[i] as readonly number[]
    return (row[0] as number) * v[0] + (row[1] as number) * v[1] + (row[2] as number) * v[2]
  }) as RGB
}

const toLinear = (c: number): number => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4)
const toSrgb = (c: number): number => (c <= 0.0031308 ? c * 12.92 : 1.055 * c ** (1 / 2.4) - 0.055)

/**
 * The RGB channels of a colour, ignoring any alpha channel.
 *
 * `#rrggbbaa` is accepted so that the warmth gate and the luminance helpers
 * can be applied to a translucent emitted colour. What they then measure is
 * the source colour, not the composite - the composite depends on whatever
 * VSCode paints underneath, which is not knowable at build time. That is the
 * point of emitting real alpha for those few keys: see `withAlpha`.
 */
export function hexToRgb(hex: string): RGB {
  const h = hex.replace('#', '')
  if (h.length !== 6 && h.length !== 8) throw new Error(`Expected #rrggbb(aa), got "${hex}"`)
  return [0, 2, 4].map((i) => Number.parseInt(h.slice(i, i + 2), 16) / 255) as RGB
}

export function rgbToHex(rgb: RGB): string {
  return `#${rgb
    .map((c) => Math.max(0, Math.min(255, Math.round(c * 255))).toString(16).padStart(2, '0'))
    .join('')}`
}

export function hexToOklch(hex: string): Oklch {
  const linear = hexToRgb(hex).map(toLinear) as RGB
  const lms = apply(LMS_FROM_LINEAR, linear).map(Math.cbrt) as RGB
  const [l, a, b] = apply(LAB_FROM_LMS, lms)
  return {
    l,
    c: Math.hypot(a, b),
    h: ((Math.atan2(b, a) * 180) / Math.PI + 360) % 360,
  }
}

function oklchToSrgb({ l, c, h }: Oklch): RGB {
  const rad = (h * Math.PI) / 180
  const lab: RGB = [l, c * Math.cos(rad), c * Math.sin(rad)]
  const lms = apply(LMS_FROM_LAB, lab).map((x) => x ** 3) as RGB
  return apply(LINEAR_FROM_LMS, lms).map(toSrgb) as RGB
}

function inGamut(o: Oklch): boolean {
  return oklchToSrgb(o).every((v) => v >= -GAMUT_EPSILON && v <= 1 + GAMUT_EPSILON)
}

/**
 * Maps a colour into sRGB by reducing chroma, holding hue and lightness.
 *
 * Independent per-channel clamping would shift hue instead, which can push a
 * near-boundary accent across the warm gate. Lightness is clamped first: at
 * l = 1 sRGB contains exactly one colour, so an over-bright request correctly
 * collapses to white rather than to a hue-shifted approximation.
 */
function toGamut(o: Oklch): Oklch {
  const clamped: Oklch = { ...o, l: Math.min(1, Math.max(0, o.l)) }
  if (inGamut(clamped)) return clamped

  let lo = 0
  let hi = clamped.c
  for (let i = 0; i < 24; i++) {
    const mid = (lo + hi) / 2
    if (inGamut({ ...clamped, c: mid })) lo = mid
    else hi = mid
  }
  return { ...clamped, c: lo }
}

export function oklchToHex(o: Oklch): string {
  return rgbToHex(oklchToSrgb(toGamut(o)))
}

export function shiftLightness(hex: string, delta: number): string {
  const { l, c, h } = hexToOklch(hex)
  return oklchToHex({ l: l + delta, c, h })
}

export function mixOklch(a: string, b: string, t: number): string {
  const A = hexToOklch(a)
  const B = hexToOklch(b)
  return oklchToHex({
    l: A.l + (B.l - A.l) * t,
    c: A.c + (B.c - A.c) * t,
    h: A.h + (B.h - A.h) * t,
  })
}

/**
 * Appends a real alpha channel, producing `#rrggbbaa`.
 *
 * The opposite of `blend`. `blend` resolves transparency at build time and
 * emits an opaque colour, which is right for a decoration painted on a known
 * surface and wrong for anything painted over content - an opaque fill hides
 * what is underneath it. VSCode accepts `#rrggbbaa` for every workbench
 * colour, so those keys can keep their transparency to runtime.
 */
export function withAlpha(hex: string, alpha: number): string {
  if (alpha < 0 || alpha > 1) throw new Error(`Alpha must be within 0-1, got ${alpha}`)
  if (hex.replace('#', '').length !== 6) throw new Error(`Expected #rrggbb, got "${hex}"`)
  const byte = Math.round(alpha * 255)
    .toString(16)
    .padStart(2, '0')
  return `${hex}${byte}`
}

export function blend(fg: string, bg: string, alpha: number): string {
  const f = hexToRgb(fg)
  const b = hexToRgb(bg)
  return rgbToHex(
    [0, 1, 2].map((i) => (f[i] as number) * alpha + (b[i] as number) * (1 - alpha)) as RGB,
  )
}

export function relativeLuminance(hex: string): number {
  const [r, g, b] = hexToRgb(hex).map(toLinear) as RGB
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}

export function contrastRatio(a: string, b: string): number {
  const la = relativeLuminance(a)
  const lb = relativeLuminance(b)
  return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05)
}

/**
 * The all-warm gate.
 *
 * Every focus accent sits between hue 22.5 (error) and 166.7 (jade bright).
 * Every cool default that leaks through unset keys sits between 249 and 300.
 *
 * The chroma escape hatch exists only for true achromatics such as white,
 * whose hue is undefined. It is deliberately far below the lowest cool
 * offender (cool grey with chroma 0.026) so near-neutral cool greys are still
 * rejected.
 */
export const WARM_HUE_MIN = 15
export const WARM_HUE_MAX = 170
export const ACHROMATIC_CHROMA = 0.002

export function isWarm(hex: string): boolean {
  const { c, h } = hexToOklch(hex)
  if (c <= ACHROMATIC_CHROMA) return true
  return h >= WARM_HUE_MIN && h <= WARM_HUE_MAX
}
