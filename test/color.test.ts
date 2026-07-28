// test/color.test.ts
import { describe, expect, it } from 'vitest'
import {
  blend,
  contrastRatio,
  hexToOklch,
  isWarm,
  mixOklch,
  oklchToHex,
  relativeLuminance,
  shiftLightness,
} from '../src/color'

const FOCUS = [
  '#1a1714', '#2a251f', '#3d352d', '#5c5347', '#dcd6cc', '#e0dcd4', '#fff8ef',
  '#db6f6d', '#ee8580', '#a6c45f', '#c2dd72', '#e6bb63', '#f5cc6e',
  '#e0843c', '#f29a45', '#d6836f', '#eb9a85', '#6fc2a0', '#82d2b2', '#e0af68',
]

describe('colour space round-trip', () => {
  it('preserves every focus palette colour exactly', () => {
    for (const hex of FOCUS) {
      expect(oklchToHex(hexToOklch(hex)), hex).toBe(hex)
    }
  })

  it('preserves the extremes', () => {
    for (const hex of ['#000000', '#ffffff']) {
      expect(oklchToHex(hexToOklch(hex)), hex).toBe(hex)
    }
  })
})

describe('shiftLightness', () => {
  it('makes a colour lighter for a positive delta and darker for a negative one', () => {
    const base = '#1a1714'
    expect(relativeLuminance(shiftLightness(base, 0.05))).toBeGreaterThan(relativeLuminance(base))
    expect(relativeLuminance(shiftLightness(base, -0.05))).toBeLessThan(relativeLuminance(base))
  })

  it('is monotonic across a ramp', () => {
    const ramp = [-0.04, -0.02, 0, 0.02, 0.04].map((d) => relativeLuminance(shiftLightness('#1a1714', d)))
    for (let i = 1; i < ramp.length; i++) {
      expect(ramp[i]!, `step ${i}`).toBeGreaterThan(ramp[i - 1]!)
    }
  })

  it('keeps the result warm', () => {
    for (const delta of [-0.04, -0.02, 0.02, 0.04, 0.1]) {
      expect(isWarm(shiftLightness('#1a1714', delta)), `delta ${delta}`).toBe(true)
    }
  })

  it('is a no-op at delta zero', () => {
    expect(shiftLightness('#1a1714', 0)).toBe('#1a1714')
  })
})

describe('mixOklch', () => {
  it('returns the endpoints at t=0 and t=1', () => {
    expect(mixOklch('#e0dcd4', '#5c5347', 0)).toBe('#e0dcd4')
    expect(mixOklch('#e0dcd4', '#5c5347', 1)).toBe('#5c5347')
  })

  it('lands between the endpoints in luminance', () => {
    const mid = relativeLuminance(mixOklch('#e0dcd4', '#5c5347', 0.45))
    expect(mid).toBeLessThan(relativeLuminance('#e0dcd4'))
    expect(mid).toBeGreaterThan(relativeLuminance('#5c5347'))
  })

  it('stays warm when both endpoints are warm', () => {
    for (const t of [0.2, 0.45, 0.8]) {
      expect(isWarm(mixOklch('#e0dcd4', '#5c5347', t)), `t ${t}`).toBe(true)
    }
  })
})

describe('blend', () => {
  it('returns the background at alpha zero and the foreground at alpha one', () => {
    expect(blend('#e0843c', '#1a1714', 0)).toBe('#1a1714')
    expect(blend('#e0843c', '#1a1714', 1)).toBe('#e0843c')
  })

  it('moves monotonically toward the foreground as alpha rises', () => {
    const steps = [0, 0.25, 0.5, 0.75, 1].map((a) => relativeLuminance(blend('#e0843c', '#1a1714', a)))
    for (let i = 1; i < steps.length; i++) {
      expect(steps[i]!, `alpha step ${i}`).toBeGreaterThan(steps[i - 1]!)
    }
  })

  it('keeps a warm foreground warm over a warm background', () => {
    for (const alpha of [0.1, 0.2, 0.35, 0.5, 0.8]) {
      expect(isWarm(blend('#e0843c', '#1a1714', alpha)), `alpha ${alpha}`).toBe(true)
    }
  })
})

describe('contrastRatio', () => {
  it('matches the WCAG anchors', () => {
    expect(contrastRatio('#ffffff', '#000000')).toBeCloseTo(21, 5)
    expect(contrastRatio('#1a1714', '#1a1714')).toBeCloseTo(1, 10)
  })

  it('is symmetric', () => {
    expect(contrastRatio('#e0dcd4', '#1a1714')).toBeCloseTo(contrastRatio('#1a1714', '#e0dcd4'), 10)
  })

  it('ranks the neutral ramp by distance from the background', () => {
    const bg = '#1a1714'
    const ramp = ['#5c5347', '#a29c91', '#dcd6cc', '#e0dcd4', '#fff8ef']
    const ratios = ramp.map((hex) => contrastRatio(hex, bg))
    for (let i = 1; i < ratios.length; i++) {
      expect(ratios[i]!, ramp[i]).toBeGreaterThan(ratios[i - 1]!)
    }
  })
})

describe('the all-warm gate', () => {
  it('accepts every focus accent, including the sanctioned jade', () => {
    for (const hex of [
      '#e0843c', '#f29a45', '#e6bb63', '#f5cc6e', '#a6c45f', '#c2dd72',
      '#d6836f', '#eb9a85', '#db6f6d', '#ee8580', '#e0af68', '#6fc2a0', '#82d2b2',
    ]) {
      expect(isWarm(hex), hex).toBe(true)
    }
  })

  it('accepts every focus neutral', () => {
    for (const hex of ['#1a1714', '#2a251f', '#3d352d', '#5c5347', '#dcd6cc', '#e0dcd4', '#fff8ef']) {
      expect(isWarm(hex), hex).toBe(true)
    }
  })

  it('accepts true achromatics, whose hue is undefined', () => {
    expect(isWarm('#ffffff')).toBe(true)
    expect(isWarm('#000000')).toBe(true)
    expect(isWarm('#808080')).toBe(true)
  })

  it('rejects the cool defaults that leak through unset keys', () => {
    for (const hex of ['#0078d4', '#2488db', '#7aa2f7', '#bb9af7']) {
      expect(isWarm(hex), hex).toBe(false)
    }
  })

  it('rejects a cool grey whose chroma is low enough to look neutral', () => {
    // #383a49 is VSCode's actionBar.toggledBackground default. Its chroma is
    // only 0.026, low enough that a naive near-neutral exemption would pass it.
    expect(isWarm('#383a49')).toBe(false)
  })
})

describe('gamut mapping', () => {
  it('keeps an accent warm even when the shift leaves sRGB', () => {
    for (const [hex, delta] of [
      ['#6fc2a0', 0.25],
      ['#82d2b2', 0.2],
      ['#e0843c', 0.4],
      ['#db6f6d', 0.5],
    ] as const) {
      expect(isWarm(shiftLightness(hex, delta)), `${hex} +${delta}`).toBe(true)
    }
  })

  it('sacrifices chroma rather than hue when a colour will not fit', () => {
    const before = hexToOklch('#6fc2a0')
    const after = hexToOklch(shiftLightness('#6fc2a0', 0.2))
    expect(Math.abs(after.h - before.h)).toBeLessThan(1)
    expect(after.c).toBeLessThan(before.c)
  })

  it('resolves an unsatisfiable lightness request to the achromatic extreme', () => {
    expect(shiftLightness('#6fc2a0', 1.5)).toBe('#ffffff')
    expect(shiftLightness('#6fc2a0', -1.5)).toBe('#000000')
  })
})
