import { describe, expect, it } from 'vitest'
import { contrastRatio, isWarm, relativeLuminance } from '../src/color'
import { ansi, resolveRole, roleNames } from '../src/palette'

/** Read from ~/.config/ghostty/themes/focus. This is an external contract. */
const GHOSTTY = {
  background: '#1a1714',
  foreground: '#e0dcd4',
  cursor: '#e0af68',
  selection: '#3d352d',
  ansi: [
    '#2a251f', '#db6f6d', '#a6c45f', '#e6bb63', '#e0843c', '#d6836f', '#6fc2a0', '#dcd6cc',
    '#5c5347', '#ee8580', '#c2dd72', '#f5cc6e', '#f29a45', '#eb9a85', '#82d2b2', '#fff8ef',
  ],
}

describe('Ghostty parity', () => {
  it('reproduces all sixteen ANSI slots exactly', () => {
    expect(ansi).toEqual(GHOSTTY.ansi)
  })

  it.each([
    ['bg', GHOSTTY.background],
    ['bgOverlay', GHOSTTY.ansi[0]!],
    ['bgSelect', GHOSTTY.selection],
    ['fg', GHOSTTY.foreground],
    ['fgSubtle', GHOSTTY.ansi[7]!],
    ['fgFaint', GHOSTTY.ansi[8]!],
    ['fgBright', GHOSTTY.ansi[15]!],
    ['accent', GHOSTTY.ansi[4]!],
    ['accentBright', GHOSTTY.ansi[12]!],
    ['cursor', GHOSTTY.cursor],
    ['error', GHOSTTY.ansi[1]!],
    ['errorBright', GHOSTTY.ansi[9]!],
    ['success', GHOSTTY.ansi[2]!],
    ['successBright', GHOSTTY.ansi[10]!],
    ['warning', GHOSTTY.ansi[3]!],
    ['warningBright', GHOSTTY.ansi[11]!],
    ['info', GHOSTTY.ansi[6]!],
    ['infoBright', GHOSTTY.ansi[14]!],
    ['modified', GHOSTTY.ansi[5]!],
    ['modifiedBright', GHOSTTY.ansi[13]!],
  ] as const)('%s is the Ghostty value %s', (role, hex) => {
    expect(resolveRole(role, 'dark')).toBe(hex)
  })
})

describe('the derived surfaces', () => {
  /*
   * Exact hex is not asserted. The delta constants are an implementation
   * choice; what the design requires is that the surfaces form an ordered,
   * warm ramp with the editor in the middle.
   */
  it('orders the surface ramp from sunken to selection', () => {
    const ramp = (['bgSunken', 'bg', 'bgRaised', 'bgOverlay', 'bgSelect'] as const).map((r) =>
      relativeLuminance(resolveRole(r, 'dark')),
    )
    for (let i = 1; i < ramp.length; i++) {
      expect(ramp[i]!, `surface step ${i}`).toBeGreaterThan(ramp[i - 1]!)
    }
  })

  it('orders the foreground ramp from faint to bright', () => {
    const ramp = (['fgFaint', 'fgMuted', 'fgSubtle', 'fg', 'fgBright'] as const).map((r) =>
      relativeLuminance(resolveRole(r, 'dark')),
    )
    for (let i = 1; i < ramp.length; i++) {
      expect(ramp[i]!, `foreground step ${i}`).toBeGreaterThan(ramp[i - 1]!)
    }
  })

  it('keeps the derived surfaces adjacent to the editor rather than distant', () => {
    const bg = resolveRole('bg', 'dark')
    for (const role of ['bgSunken', 'bgRaised'] as const) {
      const ratio = contrastRatio(resolveRole(role, 'dark'), bg)
      expect(ratio, role).toBeGreaterThan(1)
      expect(ratio, role).toBeLessThan(1.5)
    }
  })

  it('places fgMuted legibly above the comment tier', () => {
    const bg = resolveRole('bg', 'dark')
    expect(contrastRatio(resolveRole('fgMuted', 'dark'), bg)).toBeGreaterThanOrEqual(4.5)
    expect(contrastRatio(resolveRole('fgFaint', 'dark'), bg)).toBeLessThan(4.5)
  })
})

describe('every role', () => {
  it('is warm', () => {
    for (const role of roleNames) {
      expect(isWarm(resolveRole(role, 'dark')), role).toBe(true)
    }
  })

  it('resolves to a well-formed hex colour', () => {
    for (const role of roleNames) {
      expect(resolveRole(role, 'dark'), role).toMatch(/^#[0-9a-f]{6}$/)
    }
  })
})

describe('the light variant', () => {
  it('refuses to resolve with an actionable error', () => {
    for (const role of roleNames) {
      expect(() => resolveRole(role, 'light'), role).toThrow(/light variant/i)
    }
  })
})
