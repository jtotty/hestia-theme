import { describe, expect, it } from 'vitest'
import { buildTheme } from '../src/build'
import { contrastRatio, isWarm, relativeLuminance } from '../src/color'
import { colorKeys } from '../src/schema'
import { resolveRole } from '../src/palette'
import { overrideKeys, rulePatterns } from '../src/workbench'

const theme = buildTheme('dark')

/** Keys deliberately left transparent. Anything else absent is a bug. */
const TRANSPARENT: readonly string[] = [
  // The editor line highlight is a background tint only; VSCode falls back
  // to no border when this is unset, which is the desired look here too -
  // an extra border around the current line would compete with the accent
  // colours used for selection and bracket highlighting.
  'editor.lineHighlightBorder',
  // Buttons already read as distinct filled surfaces (accent/overlay
  // backgrounds), so an additional border would just double the edge.
  'button.border',
  // The schema is explicit that only the alpha channel of this value is
  // read: "Opacity of unnecessary (unused) source code in the editor. For
  // example, '#000000c0' will render the code with 75% opacity." Any opaque
  // hex we could emit here is alpha ff - no fade at all, the opposite of
  // intent - and this system has no way to express alpha-only colours.
  'editorUnnecessaryCode.opacity',
  // Same alpha-only contract as above: "Opacity of foreground elements
  // rendered in the minimap. For example, '#000000c0' will render the
  // elements with 75% opacity."
  'minimap.foregroundOpacity',
  // The schema describes these as "an extra border around elements" and "an
  // extra border around active elements" for "greater contrast". They are a
  // high-contrast-theme mechanism, and they stack on top of every border
  // this theme already sets, outlining every surface at once. Unlike the
  // cool-fallback keys, leaving these unset draws nothing at all rather than
  // exposing a VSCode default, so unset is the correct value and not a gap.
  'contrastBorder',
  'contrastActiveBorder',
]

describe('the generated theme', () => {
  it('declares itself a dark theme with semantic highlighting', () => {
    expect(theme.type).toBe('dark')
    expect(theme.semanticHighlighting).toBe(true)
  })

  it('emits only keys VSCode recognises', () => {
    const known = new Set(colorKeys)
    expect(Object.keys(theme.colors).filter((k) => !known.has(k))).toEqual([])
  })

  it('emits well-formed hex for every colour', () => {
    for (const [key, value] of Object.entries(theme.colors)) {
      expect(value, key).toMatch(/^#[0-9a-f]{6}([0-9a-f]{2})?$/)
    }
  })
})

// Every other key in the theme resolves transparency at build time, because
// the surface underneath is known and an opaque colour is the more faithful
// result. These nine paint over content - the overview ruler's change marks,
// the minimap's rendered code - so an opaque value erases exactly the thing
// the user is looking at. They must keep a real alpha channel.
describe('the sliders stay translucent', () => {
  const SLIDERS = ['scrollbarSlider', 'minimapSlider', 'notebookScrollbarSlider']
  const STATES = ['background', 'hoverBackground', 'activeBackground']

  it.each(SLIDERS.flatMap((s) => STATES.map((st) => `${s}.${st}`)))(
    '%s carries an alpha channel',
    (key) => {
      expect(theme.colors[key], key).toMatch(/^#[0-9a-f]{6}[0-9a-f]{2}$/)
    },
  )

  it.each(SLIDERS)('%s grows more opaque from rest through hover to active', (slider) => {
    const alpha = (state: string): number =>
      Number.parseInt((theme.colors[`${slider}.${state}`] as string).slice(7), 16)
    expect(alpha('background')).toBeLessThan(alpha('hoverBackground'))
    expect(alpha('hoverBackground')).toBeLessThan(alpha('activeBackground'))
  })
})

describe('nothing falls back to a VSCode default', () => {
  it('sets every colour key except those explicitly declared transparent', () => {
    const missing = colorKeys.filter((k) => !(k in theme.colors) && !TRANSPARENT.includes(k))
    expect(missing).toEqual([])
  })

  it('sets the nine keys whose defaults are cool', () => {
    for (const key of [
      'activityBar.activeBorder',
      'tab.activeBorderTop',
      'statusBar.focusBorder',
      'statusBarItem.focusBorder',
      'statusBarItem.remoteBackground',
      'terminal.tab.activeBorder',
      'welcomePage.progress.foreground',
      'inputOption.activeBorder',
      'actionBar.toggledBackground',
    ]) {
      expect(theme.colors, key).toHaveProperty(key)
    }
  })
})

describe('terminal parity with Ghostty', () => {
  it.each([
    ['terminal.ansiBlack', '#2a251f'],
    ['terminal.ansiRed', '#db6f6d'],
    ['terminal.ansiGreen', '#a6c45f'],
    ['terminal.ansiYellow', '#e6bb63'],
    ['terminal.ansiBlue', '#e0843c'],
    ['terminal.ansiMagenta', '#d6836f'],
    ['terminal.ansiCyan', '#6fc2a0'],
    ['terminal.ansiWhite', '#dcd6cc'],
    ['terminal.ansiBrightBlack', '#5c5347'],
    ['terminal.ansiBrightRed', '#ee8580'],
    ['terminal.ansiBrightGreen', '#c2dd72'],
    ['terminal.ansiBrightYellow', '#f5cc6e'],
    ['terminal.ansiBrightBlue', '#f29a45'],
    ['terminal.ansiBrightMagenta', '#eb9a85'],
    ['terminal.ansiBrightCyan', '#82d2b2'],
    ['terminal.ansiBrightWhite', '#fff8ef'],
  ])('%s renders as %s, identical to Ghostty', (key, hex) => {
    expect(theme.colors[key]).toBe(hex)
  })

  it('matches the Ghostty editor background, terminal background, and cursor', () => {
    expect(theme.colors['editor.background']).toBe('#1a1714')
    expect(theme.colors['terminal.background']).toBe('#1a1714')
    expect(theme.colors['editorCursor.foreground']).toBe('#e0af68')
  })
})

describe('surface hierarchy', () => {
  it('renders the editor distinctly from the surrounding chrome', () => {
    const editor = theme.colors['editor.background']
    for (const key of ['activityBar.background', 'sideBar.background', 'statusBar.background']) {
      expect(theme.colors[key], key).not.toBe(editor)
    }
  })

  it('renders the chrome panels as one consistent surface', () => {
    const chrome = ['activityBar.background', 'sideBar.background', 'statusBar.background'].map(
      (k) => theme.colors[k],
    )
    expect(new Set(chrome).size).toBe(1)
  })

  it('renders inputs and dropdowns as one surface, distinct from both', () => {
    const overlay = ['input.background', 'dropdown.background'].map((k) => theme.colors[k])
    expect(new Set(overlay).size).toBe(1)
    expect(overlay[0]).not.toBe(theme.colors['editor.background'])
    expect(overlay[0]).not.toBe(theme.colors['sideBar.background'])
  })
})

describe('status semantics survive VSCode inconsistent key casing', () => {
  it('uses one colour for errors however the key is spelled', () => {
    expect(theme.colors['editorError.foreground']).toBe(theme.colors['list.errorForeground'])
  })

  it('uses one colour for warnings however the key is spelled', () => {
    expect(theme.colors['editorWarning.foreground']).toBe(theme.colors['list.warningForeground'])
  })

  it('distinguishes error, warning, and success from one another', () => {
    const distinct = new Set([
      theme.colors['editorError.foreground'],
      theme.colors['editorWarning.foreground'],
      theme.colors['gitDecoration.untrackedResourceForeground'],
    ])
    expect(distinct.size).toBe(3)
  })
})

describe('the all-warm guarantee', () => {
  it('emits no cool workbench colour', () => {
    const cool = Object.entries(theme.colors).filter(([, v]) => !isWarm(v))
    expect(cool).toEqual([])
  })
})

describe('nothing is painted invisible', () => {
  it('never paints text the same colour as its own background', () => {
    // Covers both VSCode's casings for this pair: capital-F keys like
    // "statusBarItem.errorForeground" / "...Background", and lowercase-f
    // keys like "editorError.foreground" / "editorError.background". A
    // key can only end in one of the two casings, so chaining both
    // replacements is safe - at most one of them ever does anything.
    const pairs = Object.keys(theme.colors)
      .filter((k) => /[Ff]oreground$/.test(k))
      .map((k) => [k, k.replace(/foreground$/, 'background').replace(/Foreground$/, 'Background')] as const)
      .filter(([, bg]) => theme.colors[bg] !== undefined)
    expect(pairs.length).toBeGreaterThan(0)
    const invisible = pairs.filter(([fg, bg]) => theme.colors[fg] === theme.colors[bg]).map(([fg]) => fg)
    expect(invisible).toEqual([])
  })

  // The window edge is meant to be invisible in both focus states, so this
  // one pair is identical on purpose. An accent-coloured window.activeBorder
  // drew a bright line around the whole application, and focus is already
  // legible from the title bar and the active editor group. Neither key can
  // simply be unset: the vendored schema records no default for them, so
  // what VSCode falls back to here is unverified, and the theme's whole
  // premise is that an unset key is a cool default waiting to leak.
  const UNIFORM_ON_PURPOSE: ReadonlyArray<readonly [string, string]> = [
    ['window.inactiveBorder', 'window.activeBorder'],
  ]
  const uniformLabels = UNIFORM_ON_PURPOSE.map(([a, b]) => `${a} == ${b}`)

  it('distinguishes an inactive state from its active counterpart', () => {
    const collisions: string[] = []
    for (const key of Object.keys(theme.colors)) {
      const m = key.match(/^(.*)[Ii]nactive(.*)$/)
      if (!m) continue
      for (const sibling of [`${m[1]}active${m[2]}`, `${m[1]}Active${m[2]}`]) {
        if (theme.colors[sibling] !== undefined && theme.colors[sibling] === theme.colors[key]) {
          collisions.push(`${key} == ${sibling}`)
        }
      }
    }
    expect(collisions.filter((c) => !uniformLabels.includes(c))).toEqual([])
  })

  it('still flags the exempted pair, so the exemption cannot rot silently', () => {
    // If a later change gives the window edge two distinct colours, this
    // fails and the exemption above should be deleted rather than kept.
    for (const [a, b] of UNIFORM_ON_PURPOSE) {
      expect(theme.colors[a], `${a} == ${b}`).toBe(theme.colors[b])
    }
  })

  // The twin of the inactive/active guard above. VSCode uses a second axis for
  // split editor groups: "unfocused" means "this group is not the one with
  // keyboard focus". A key spelled `x.unfocusedFooBar` has up to two siblings
  // worth comparing against - the plain `x.fooBar` (tab.* spells it this way)
  // and the explicit `x.focusedFooBar` (mergeEditor.* spells it this way).
  // If either matches, you cannot tell which editor group has focus.
  it('distinguishes an unfocused state from its focused counterpart', () => {
    const collisions = new Set<string>()
    for (const key of Object.keys(theme.colors)) {
      const m = key.match(/^(.*)[Uu]nfocused(.*)$/)
      if (!m) continue
      const [, prefix = '', rest = ''] = m
      const head = rest.charAt(0)
      for (const sibling of [
        `${prefix}${head.toLowerCase()}${rest.slice(1)}`,
        `${prefix}${head.toUpperCase()}${rest.slice(1)}`,
        `${prefix}focused${rest}`,
        `${prefix}Focused${rest}`,
      ]) {
        if (sibling === key) continue
        if (theme.colors[sibling] !== undefined && theme.colors[sibling] === theme.colors[key]) {
          collisions.add(`${key} == ${sibling}`)
        }
      }
    }
    expect([...collisions]).toEqual([])
  })
})

describe('related keys stay distinguishable from one another', () => {
  it.each(['symbolIcon.', 'debugIcon.', 'editorOverviewRuler.'])(
    'does not collapse the %s family to a single colour',
    (prefix) => {
      const values = Object.entries(theme.colors)
        .filter(([key]) => key.startsWith(prefix))
        .map(([, value]) => value)
      expect(values.length).toBeGreaterThan(1)
      expect(new Set(values).size).toBeGreaterThan(1)
    },
  )

  // Diff and merge both paint two stacked layers: a whole-line wash and, on
  // top of it, a character-level highlight of what actually changed within
  // the line (and, for merge, a header band above the content band). Equal
  // values mean the upper layer does not render at all.
  it.each([
    ['diffEditor.insertedTextBackground', 'diffEditor.insertedLineBackground'],
    ['diffEditor.removedTextBackground', 'diffEditor.removedLineBackground'],
    ['diffEditor.insertedTextBorder', 'diffEditor.insertedTextBackground'],
    ['diffEditor.removedTextBorder', 'diffEditor.removedTextBackground'],
    ['merge.currentHeaderBackground', 'merge.currentContentBackground'],
    ['merge.incomingHeaderBackground', 'merge.incomingContentBackground'],
    ['diffEditor.move.border', 'diffEditor.moveActive.border'],
    // The 3-way merge editor stacks the same two layers under different key
    // names: a "...background" band across the changed region, and a
    // "....word.background" highlight of the changed words inside it.
    ['mergeEditor.change.word.background', 'mergeEditor.change.background'],
    ['mergeEditor.changeBase.word.background', 'mergeEditor.changeBase.background'],
  ])('paints %s differently from %s', (a, b) => {
    expect(theme.colors[a]).toBeDefined()
    expect(theme.colors[b]).toBeDefined()
    expect(theme.colors[a]).not.toBe(theme.colors[b])
  })

  // Differing is necessary but not sufficient for a stacked pair: the upper
  // layer has to read as sitting on top of the band, not behind it. A word
  // highlight darker than the band it lives inside looks like a hole.
  it.each([
    ['mergeEditor.change.word.background', 'mergeEditor.change.background'],
    ['mergeEditor.changeBase.word.background', 'mergeEditor.changeBase.background'],
  ])('paints %s brighter than the %s band it sits inside', (word, band) => {
    expect(relativeLuminance(theme.colors[word]!)).toBeGreaterThan(
      relativeLuminance(theme.colors[band]!),
    )
  })

  // A state background that equals the surface it is painted on is not a
  // state at all. VSCode recolours the whole status bar while debugging and
  // when no folder is open, and marks the focused and selected notebook
  // cells; each of those signals only exists if the value differs from the
  // surface underneath it.
  it.each([
    ['statusBar.debuggingBackground', 'statusBar.background'],
    ['statusBar.noFolderBackground', 'statusBar.background'],
    ['statusBarItem.prominentBackground', 'statusBar.background'],
    ['notebook.focusedCellBackground', 'notebook.editorBackground'],
    ['notebook.selectedCellBackground', 'notebook.editorBackground'],
  ])('paints the %s state differently from the %s it sits on', (state, surface) => {
    expect(theme.colors[state]).toBeDefined()
    expect(theme.colors[surface]).toBeDefined()
    expect(theme.colors[state]).not.toBe(theme.colors[surface])
  })

  // The four explorer row states are visible at the same time - dragging a
  // file over a tree that already has a selection and a hovered row shows
  // all of them at once - so no two may be the same colour.
  it('gives the four list row states four different colours', () => {
    const states = [
      'list.activeSelectionBackground',
      'list.inactiveSelectionBackground',
      'list.hoverBackground',
      'list.dropBackground',
    ]
    const values = states.map((key) => theme.colors[key])
    expect(values.filter(Boolean)).toHaveLength(states.length)
    expect(new Set(values).size).toBe(states.length)
  })
})

describe('the mapping tables carry no dead entries', () => {
  it('overrides only keys the schema actually defines', () => {
    const known = new Set(colorKeys)
    expect(overrideKeys.filter((key) => !known.has(key))).toEqual([])
  })

  it('reaches every fallback rule with at least one key', () => {
    const overridden = new Set(overrideKeys)
    const reached = new Set<number>()
    for (const key of colorKeys) {
      if (overridden.has(key)) continue
      const index = rulePatterns.findIndex((pattern) => pattern.test(key))
      if (index !== -1) reached.add(index)
    }
    const unreachable = rulePatterns
      .map((pattern) => pattern.source)
      .filter((_, index) => !reached.has(index))
    expect(unreachable).toEqual([])
  })
})

/** The colour the generated theme actually paints a given scope. */
const colorForScope = (scope: string): string | undefined =>
  theme.tokenColors.find((rule) => rule.scope.includes(scope))?.settings.foreground

const styleForScope = (scope: string): string | undefined =>
  theme.tokenColors.find((rule) => rule.scope.includes(scope))?.settings.fontStyle

describe('syntax highlighting', () => {
  it.each([
    ['keyword.control', '#e0843c'],
    ['storage.type', '#e0843c'],
    ['entity.name.function', '#f5cc6e'],
    ['support.function', '#f5cc6e'],
    ['string.quoted.double', '#a6c45f'],
    ['entity.name.type', '#82d2b2'],
    ['entity.name.class', '#82d2b2'],
    ['constant.numeric', '#eb9a85'],
    ['constant.language', '#eb9a85'],
    ['variable', '#e0dcd4'],
    ['comment', '#5c5347'],
  ])('paints %s as %s', (scope, hex) => {
    expect(colorForScope(scope)).toBe(hex)
  })

  it('gives keywords, functions, strings, types and constants five distinct colours', () => {
    const hues = [
      colorForScope('keyword.control'),
      colorForScope('entity.name.function'),
      colorForScope('string.quoted.double'),
      colorForScope('entity.name.type'),
      colorForScope('constant.numeric'),
    ]
    expect(new Set(hues).size).toBe(5)
  })

  it('paints comments more faintly than any other token', () => {
    const bg = theme.colors['editor.background']!
    const comment = contrastRatio(colorForScope('comment')!, bg)
    for (const rule of theme.tokenColors) {
      if (rule.name === 'Comment') continue
      expect(contrastRatio(rule.settings.foreground, bg), rule.name).toBeGreaterThan(comment)
    }
  })

  it('italicises comments and nothing else', () => {
    expect(styleForScope('comment')).toBe('italic')
    const italicised = theme.tokenColors.filter((r) => r.settings.fontStyle?.includes('italic'))
    expect(italicised.map((r) => r.name)).toEqual(['Comment'])
  })

  it('never paints the same scope twice', () => {
    const seen = new Map<string, string>()
    for (const rule of theme.tokenColors) {
      for (const scope of rule.scope) {
        expect(seen.has(scope), `"${scope}" claimed by "${seen.get(scope)}" and "${rule.name}"`).toBe(false)
        seen.set(scope, rule.name)
      }
    }
  })

  it('emits no cool syntax colour', () => {
    const cool = theme.tokenColors.filter((r) => !isWarm(r.settings.foreground))
    expect(cool.map((r) => r.name)).toEqual([])
  })
})

describe('semantic highlighting', () => {
  it('agrees with the TextMate colours for the same concepts', () => {
    expect(theme.semanticTokenColors.class).toBe(colorForScope('entity.name.class'))
    expect(theme.semanticTokenColors.function).toBe(colorForScope('entity.name.function'))
    expect(theme.semanticTokenColors.keyword).toBe(colorForScope('keyword.control'))
    expect(theme.semanticTokenColors.string).toBe(colorForScope('string.quoted.double'))
    expect(theme.semanticTokenColors.number).toBe(colorForScope('constant.numeric'))
    expect(theme.semanticTokenColors.comment).toBe(colorForScope('comment'))
    expect(theme.semanticTokenColors.enumMember).toBe(colorForScope('variable.other.enummember'))
  })

  it('emits no cool semantic colour', () => {
    const cool = Object.entries(theme.semanticTokenColors).filter(([, v]) => !isWarm(v))
    expect(cool).toEqual([])
  })
})

describe('legibility', () => {
  const bg = () => theme.colors['editor.background']!

  /*
   * fgFaint is exempt. At roughly 2.4:1 against the background it is below
   * WCAG AA, which is a deliberate property of the Ghostty palette: comments
   * and line numbers are meant to recede. Every role carrying real content is
   * held to AA for body text.
   */
  it.each([
    'fg', 'fgSubtle', 'fgMuted', 'fgBright',
    'accent', 'accentBright', 'cursor',
    'error', 'errorBright', 'warning', 'warningBright',
    'success', 'successBright', 'info', 'infoBright',
    'modified', 'modifiedBright',
  ] as const)('%s meets AA against the editor background', (role) => {
    expect(contrastRatio(resolveRole(role, 'dark'), bg())).toBeGreaterThanOrEqual(4.5)
  })

  it('holds every syntax colour except comments to AA', () => {
    for (const rule of theme.tokenColors) {
      if (rule.name === 'Comment') continue
      expect(contrastRatio(rule.settings.foreground, bg()), rule.name).toBeGreaterThanOrEqual(4.5)
    }
  })

  it('keeps default editor text comfortably above the AA floor', () => {
    expect(contrastRatio(theme.colors['editor.foreground']!, bg())).toBeGreaterThan(10)
  })

  it('makes the cursor stand out against the editor', () => {
    expect(contrastRatio(theme.colors['editorCursor.foreground']!, bg())).toBeGreaterThan(4.5)
  })

  /*
   * Diff and merge fills are the one place code is routinely read on
   * something other than the editor background, so holding syntax colours to
   * AA against `editor.background` alone does not prove a diff is readable.
   *
   * This is what regressed: composited at alpha, the inserted word fill put
   * four syntax colours below AA and the merge conflict fill resolved to
   * full-strength error, printing code at 1.00:1 on its own colour. Comments
   * are exempt on the same grounds as above.
   */
  it('keeps code readable on every diff and merge fill', () => {
    const comment = resolveRole('fgFaint', 'dark')
    const content = [
      ...theme.tokenColors.map((r) => r.settings.foreground),
      ...Object.values(theme.semanticTokenColors),
    ].filter((c) => c !== comment)
    expect(content.length).toBeGreaterThan(0)

    // Gutter and overview-ruler keys are excluded on purpose. They are solid
    // change bars in the margin with no code on top of them, so they are free
    // to use the role at full strength, and diffEditorGutter.* deliberately
    // does. Only fills that sit under text are held to AA here.
    const fills = Object.keys(theme.colors).filter(
      (k) =>
        /[Bb]ackground$/.test(k) &&
        /^(diffEditor|merge)/.test(k) &&
        !/Gutter|Overview|[Mm]inimap/.test(k),
    )
    expect(fills.length).toBeGreaterThan(10)

    for (const key of fills) {
      const fill = theme.colors[key]!
      const worst = Math.min(...content.map((c) => contrastRatio(c, fill)))
      expect(worst, `${key} (${fill})`).toBeGreaterThanOrEqual(4.5)
    }
  })

  /*
   * The diff margin is the line-number column beside a changed line, and line
   * numbers are drawn on it, so it cannot be treated as decoration.
   *
   * It used to be the full success/error role. Those are light saturated
   * colours, and editorLineNumber.activeForeground is a near-white, so the
   * active line number - the one you look for when reading a diff - sat at
   * 1.36:1 on an inserted line and was effectively erased.
   */
  it.each(['diffEditorGutter.insertedLineBackground', 'diffEditorGutter.removedLineBackground'])(
    'keeps the active line number legible on %s',
    (key) => {
      const margin = theme.colors[key]!
      const active = theme.colors['editorLineNumber.activeForeground']!
      expect(contrastRatio(active, margin)).toBeGreaterThanOrEqual(4.5)
    },
  )

  it.each(['diffEditorGutter.insertedLineBackground', 'diffEditorGutter.removedLineBackground'])(
    'keeps %s from returning to full role strength',
    (key) => {
      // The full roles sit at 9.08 and 5.53 against the editor background. A
      // margin that bright dominates the code it annotates. This is a
      // brightness ceiling, not a contrast requirement.
      expect(contrastRatio(theme.colors[key]!, bg())).toBeLessThan(2)
    },
  )

  it('keeps a changed line distinguishable from the code around it', () => {
    // The twin of the test above. Readability is bought by keeping these
    // fills close to the background in lightness, so it is possible to
    // overshoot and make a diff invisible. Anything at 1.05 or below reads as
    // no highlight at all.
    for (const key of ['diffEditor.insertedLineBackground', 'diffEditor.removedLineBackground']) {
      expect(contrastRatio(theme.colors[key]!, bg()), key).toBeGreaterThan(1.05)
    }
  })
})

describe('build reproducibility', () => {
  it('is unaffected by build order or repetition', () => {
    const a = buildTheme('dark')
    const b = buildTheme('dark')
    expect(JSON.stringify(a)).toBe(JSON.stringify(b))
  })
})
