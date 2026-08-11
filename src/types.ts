export type RoleName =
  | 'bgSunken' | 'bg' | 'bgRaised' | 'bgOverlay' | 'bgSelect'
  | 'fgBright' | 'fg' | 'fgSubtle' | 'fgMuted' | 'fgFaint'
  | 'accent' | 'accentBright'
  | 'cursor'
  | 'error' | 'errorBright'
  | 'warning' | 'warningBright'
  | 'success' | 'successBright'
  | 'info' | 'infoBright'
  | 'modified' | 'modifiedBright'

export type Variant = 'dark' | 'light'

/**
 * A tint that carries a role's hue without carrying its lightness.
 *
 * `lightness` is added to the base surface's OKLCH lightness; `chroma`
 * replaces it outright. The point is that WCAG contrast depends almost
 * entirely on lightness, so a tint built this way signals "this line
 * changed" through hue while leaving the text on top as readable as it
 * was on the plain background.
 *
 * Compositing a role at alpha cannot do this. Alpha drags the bright
 * source colour's lightness in proportionally, and the palette's success
 * green is light enough that any visible amount of it pushes syntax
 * colours below AA. Green is the worst case because relative luminance
 * weights it at 0.7152 against red's 0.2126.
 */
export interface Tint {
  lightness: number
  chroma: number
}

/**
 * A reference to a role, optionally composited.
 * `alpha` composites `role` over `on` (defaulting to `bg`) at build time.
 * `tint` instead takes only `role`'s hue, over `on`, and is mutually
 * exclusive with `alpha`.
 * `opacity` emits `role` with a real alpha channel and composites nothing,
 * and is mutually exclusive with both of the others.
 *
 * The three are not interchangeable. `alpha` and `tint` both resolve to an
 * opaque colour, which is correct only where the surface underneath is known
 * at build time - the overwhelming majority of keys, which paint on one
 * named surface. `opacity` is for the few keys that paint over *content*:
 * an opaque fill there hides whatever it covers, which is the whole reason
 * the key is meant to be translucent.
 */
export interface ColorRef {
  role: RoleName
  alpha?: number
  on?: RoleName
  tint?: Tint
  opacity?: number
}
