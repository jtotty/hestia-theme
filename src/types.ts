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
 * A reference to a role, optionally composited.
 * `alpha` composites `role` over `on` (defaulting to `bg`) at build time.
 */
export interface ColorRef {
  role: RoleName
  alpha?: number
  on?: RoleName
}
