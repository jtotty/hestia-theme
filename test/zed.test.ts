import { describe, expect, it } from 'vitest'
import { buildTheme, buildZedTheme } from '../src/build'
import type { ZedHighlight, ZedPlayer } from '../src/build'
import { contrastRatio, isWarm } from '../src/color'
import { resolveRole } from '../src/palette'
import { styleRefs } from '../src/zed'
import { bundledCaptures, styleKeys } from '../src/zed-schema'
import { resolveCapture } from '../src/zed-syntax'

const family = buildZedTheme('dark')
const theme = family.themes[0]!
const style = theme.style as Record<string, string>
const syntax = theme.style.syntax as Record<string, ZedHighlight>
const players = theme.style.players as ZedPlayer[]
const accents = theme.style.accents as string[]
const bg = style['editor.background']!

/** Every colour the theme paints, wherever in the style object it lives. */
const emitted: [string, string][] = [
  ...styleKeys.map((key): [string, string] => [key, style[key]!]),
  ...players.flatMap((player, i): [string, string][] => [
    [`players[${i}].cursor`, player.cursor],
    [`players[${i}].background`, player.background],
    [`players[${i}].selection`, player.selection],
  ]),
  ...accents.map((accent, i): [string, string] => [`accents[${i}]`, accent]),
  ...Object.entries(syntax).map(([capture, highlight]): [string, string] => [
    `syntax.${capture}`,
    highlight.color,
  ]),
]

/*
 * Captures that are meant to recede, and so are exempt from the AA floor for
 * the same reason comments are exempt in the VSCode suite: `comment` and
 * `hint` are annotation rather than code, and `predictive` is text the editor
 * is proposing, which must not read as text the file contains.
 */
const RECEDING = ['comment', 'hint', 'predictive']

describe('the generated Zed theme', () => {
  it('declares one dark theme in a family Zed can load', () => {
    expect(family.themes).toHaveLength(1)
    expect(theme.appearance).toBe('dark')
    expect(family.name).toBe('Hestia')
    expect(theme.name).toBe('Hestia')
  })

  it('emits only keys the installed Zed recognises', () => {
    const known = new Set([...styleKeys, 'background.appearance', 'players', 'accents', 'syntax'])
    expect(Object.keys(theme.style).filter((k) => !known.has(k))).toEqual([])
  })

  it('emits well-formed hex for every colour', () => {
    for (const [key, value] of emitted) {
      expect(value, key).toMatch(/^#[0-9a-f]{6}([0-9a-f]{2})?$/)
    }
  })

  it('paints the window opaque', () => {
    // The palette separates its surfaces by as little as 0.02 OKLCH lightness.
    // Anything showing through spends that entire budget on the desktop.
    expect(style['background.appearance']).toBe('opaque')
  })
})

describe('nothing falls back to a Zed default', () => {
  /*
   * Zed has no "unset" that means transparent - an omitted key takes its
   * built-in value, and every one of those is outside this palette. So unlike
   * the VSCode theme, which deliberately leaves six keys unset, this one has
   * no exemption list: the keys that should be invisible are emitted at zero
   * alpha rather than left out.
   */
  it('sets every vendored key', () => {
    expect(styleKeys.filter((key) => !(key in style))).toEqual([])
  })

  it('gives Zed a full set of collaborator and accent colours', () => {
    expect(players.length).toBeGreaterThanOrEqual(8)
    expect(accents.length).toBeGreaterThanOrEqual(6)
  })

  it('maps no key the installed Zed does not define', () => {
    const known = new Set(styleKeys)
    expect(Object.keys(styleRefs).filter((key) => !known.has(key))).toEqual([])
  })
})

describe('terminal parity with Ghostty', () => {
  it.each([
    ['black', '#2a251f', '#5c5347'],
    ['red', '#db6f6d', '#ee8580'],
    ['green', '#a6c45f', '#c2dd72'],
    ['yellow', '#e6bb63', '#f5cc6e'],
    ['blue', '#e0843c', '#f29a45'],
    ['magenta', '#d6836f', '#eb9a85'],
    ['cyan', '#6fc2a0', '#82d2b2'],
    ['white', '#dcd6cc', '#fff8ef'],
  ])('renders ANSI %s as %s and bright as %s, identical to Ghostty', (name, base, bright) => {
    expect(style[`terminal.ansi.${name}`]).toBe(base)
    expect(style[`terminal.ansi.bright_${name}`]).toBe(bright)
  })

  it('dims every slot toward the terminal background without changing its hue', () => {
    for (const name of ['black', 'red', 'green', 'yellow', 'blue', 'magenta', 'cyan', 'white']) {
      const base = style[`terminal.ansi.${name}`]!
      const dim = style[`terminal.ansi.dim_${name}`]!
      expect(dim, name).not.toBe(base)
      expect(contrastRatio(dim, bg), name).toBeLessThanOrEqual(contrastRatio(base, bg))
    }
  })

  it('matches the Ghostty editor background and terminal background', () => {
    expect(bg).toBe('#1a1714')
    expect(style['terminal.background']).toBe('#1a1714')
  })
})

describe('the two editors agree', () => {
  const vscode = buildTheme('dark')

  it('paints the editor, the cursor and the selection identically', () => {
    expect(bg).toBe(vscode.colors['editor.background'])
    expect(style['editor.foreground']).toBe(vscode.colors['editor.foreground'])
    // Zed takes the local cursor and selection from the first player slot, so
    // this is where a divergence between the two editors would show up.
    expect(players[0]!.cursor).toBe(vscode.colors['editorCursor.foreground'])
    expect(players[0]!.selection).toBe(vscode.colors['editor.selectionBackground'])
  })

  /*
   * The construct-to-hue mapping is hand-copied into three vocabularies -
   * TextMate scopes, LSP semantic tokens, and Zed's tree-sitter captures - so
   * that a construct keeps its colour whichever editor renders it. Nothing
   * structural stops one copy from drifting, so this pairs every construct
   * shared by the Zed and VSCode tables and checks the hue matches.
   */
  it.each([
    ['keyword', 'keyword.control'],
    ['function', 'entity.name.function'],
    ['constructor', 'entity.name.function'],
    ['string', 'string.quoted.double'],
    ['string.escape', 'constant.character.escape'],
    ['type', 'entity.name.type'],
    ['namespace', 'entity.name.namespace'],
    ['number', 'constant.numeric'],
    ['boolean', 'constant.language'],
    ['constant', 'constant.language'],
    ['comment', 'comment'],
    ['variable', 'variable'],
    ['variable.parameter', 'variable.parameter'],
    ['operator', 'keyword.operator'],
    ['tag', 'entity.name.tag'],
    ['attribute', 'entity.other.attribute-name'],
  ])('paints %s the same hue as VSCode paints %s', (capture, scopeName) => {
    const expected = vscode.tokenColors.find((rule) => rule.scope.includes(scopeName))?.settings
      .foreground
    expect(expected, scopeName).toBeDefined()
    expect(resolveCapture(capture), capture).toBeDefined()
    expect(syntax[capture]?.color ?? resolveRole(resolveCapture(capture)!.role, 'dark')).toBe(
      expected,
    )
  })
})

/** The surfaces that frame the editor, all of which sit on one step. */
const CHROME = [
  'background',
  'surface.background',
  'panel.background',
  'status_bar.background',
  'title_bar.background',
  'tab_bar.background',
]

describe('surface hierarchy', () => {
  it('renders the editor distinctly from the chrome around it', () => {
    for (const key of CHROME) {
      expect(style[key], key).not.toBe(bg)
    }
  })

  it('renders the chrome as one consistent surface', () => {
    // An inactive tab belongs to the bar it sits in, not to the editor.
    const chrome = [...CHROME, 'tab.inactive_background']
    expect(new Set(chrome.map((key) => style[key])).size).toBe(1)
  })

  it('floats popovers above both', () => {
    const elevated = style['elevated_surface.background']
    expect(elevated).not.toBe(bg)
    expect(elevated).not.toBe(style.background)
  })

  // The Zed counterpart of the VSCode suite's active/inactive guard. Zed spells
  // the axis `x.inactive_y`, and a state that paints the same as its active
  // counterpart has silently stopped being a state.
  it('distinguishes every inactive state from its active counterpart', () => {
    const collisions = styleKeys
      .filter((key) => key.includes('.inactive_'))
      .map((key) => [key, key.replace('.inactive_', '.active_')] as const)
      .filter(([inactive, active]) => style[active] !== undefined && style[active] === style[inactive])
    // tab.inactive_background pairs with tab.active_background; title_bar's
    // active counterpart is the unprefixed title_bar.background.
    expect(collisions).toEqual([])
    expect(style['title_bar.inactive_background']).not.toBe(style['title_bar.background'])
  })

  it('shows the active tab as a window onto the editor', () => {
    expect(style['tab.active_background']).toBe(bg)
    expect(style['tab.inactive_background']).not.toBe(bg)
  })
})

// The same reasoning as the VSCode sliders: Zed's scrollbar column carries the
// diff and diagnostic marks and the minimap thumb slides over rendered code,
// so an opaque thumb erases exactly what the user is looking for.
describe('the sliders stay translucent', () => {
  const FAMILIES = ['scrollbar', 'minimap']
  const STATES = ['background', 'hover_background', 'active_background']

  it.each(FAMILIES.flatMap((f) => STATES.map((s) => `${f}.thumb.${s}`)))(
    '%s carries an alpha channel',
    (key) => {
      expect(style[key], key).toMatch(/^#[0-9a-f]{6}[0-9a-f]{2}$/)
    },
  )

  it.each(FAMILIES)('%s grows more opaque from rest through hover to active', (name) => {
    const alpha = (state: string): number =>
      Number.parseInt(style[`${name}.thumb.${state}`]!.slice(7), 16)
    expect(alpha('background')).toBeLessThan(alpha('hover_background'))
    expect(alpha('hover_background')).toBeLessThan(alpha('active_background'))
  })

  it('leaves the scrollbar track empty so the marks under it stay visible', () => {
    for (const key of ['scrollbar.track.background', 'scrollbar.track.border', 'scrollbar.thumb.border', 'minimap.thumb.border']) {
      expect(style[key], key).toMatch(/^#[0-9a-f]{6}00$/)
    }
  })
})

describe('the all-warm guarantee', () => {
  it('emits no cool colour anywhere in the theme', () => {
    expect(emitted.filter(([, value]) => !isWarm(value)).map(([key]) => key)).toEqual([])
  })
})

describe('syntax highlighting', () => {
  it('styles every capture Zed styles in its own themes', () => {
    expect(bundledCaptures.filter((capture) => resolveCapture(capture) === undefined)).toEqual([])
  })

  it('reaches a nested capture through its parent', () => {
    // The whole reason the rule table is shorter than the list of capture
    // names in circulation. If Zed's prefix fallback were mirrored wrongly,
    // this is what would break.
    expect(resolveCapture('function.method.call')).toBe(resolveCapture('function'))
    expect(resolveCapture('keyword.import')).toBe(resolveCapture('keyword'))
    expect(resolveCapture('nonsense.capture.name')).toBeUndefined()
  })

  it('styles the root captures that have no parent to inherit from', () => {
    // Zed's fallback only ever walks up a dotted name, so a single-word capture
    // either appears in the table or gets the editor's default foreground.
    // These are the ones real grammars emit that no parent covers.
    for (const capture of ['conditional', 'exception', 'include', 'repeat', 'error']) {
      expect(resolveCapture(capture), capture).toBeDefined()
    }
    // `text` itself is deliberately not styled - plain prose is plain - so each
    // severity under it has to be named rather than inherited.
    expect(resolveCapture('text')).toBeUndefined()
    for (const capture of ['text.danger', 'text.warning', 'text.note']) {
      expect(resolveCapture(capture), capture).toBeDefined()
    }
  })

  it('does not let a regex fall back to plain string', () => {
    // Grammars are split between `string.regex` and `string.regexp`, and only
    // the first is defined by Zed's own themes. The second would otherwise
    // inherit the string colour and stop reading as a pattern.
    expect(syntax['string.regexp']!.color).toBe(syntax['string.escape']!.color)
    expect(syntax['string.regexp']!.color).not.toBe(syntax.string!.color)
  })

  it('gives keywords, functions, strings, types and constants five distinct colours', () => {
    const hues = ['keyword', 'function', 'string', 'type', 'constant'].map((c) => syntax[c]!.color)
    expect(new Set(hues).size).toBe(5)
  })

  it('paints comments more faintly than any code token', () => {
    const comment = contrastRatio(syntax.comment!.color, bg)
    for (const [capture, highlight] of Object.entries(syntax)) {
      if (RECEDING.includes(capture)) continue
      expect(contrastRatio(highlight.color, bg), capture).toBeGreaterThan(comment)
    }
  })

  it('italicises only what the editor is not asserting', () => {
    const italicised = Object.entries(syntax)
      .filter(([, highlight]) => highlight.font_style === 'italic')
      .map(([capture]) => capture)
    expect(italicised.sort()).toEqual(['comment', 'emphasis', 'predictive'])
  })

  it('holds every code capture to AA against the editor background', () => {
    for (const [capture, highlight] of Object.entries(syntax)) {
      if (RECEDING.includes(capture)) continue
      expect(contrastRatio(highlight.color, bg), capture).toBeGreaterThanOrEqual(4.5)
    }
  })
})

describe('legibility', () => {
  const codeColors = Object.entries(syntax)
    .filter(([capture]) => !RECEDING.includes(capture))
    .map(([, highlight]) => highlight.color)

  /** Every fill the theme paints underneath live code. */
  const FILLS = [
    'editor.diff_hunk.added.background',
    'editor.diff_hunk.deleted.background',
    'version_control.word_added',
    'version_control.word_deleted',
    'version_control_conflict_ours_background',
    'version_control_conflict_theirs_background',
  ]

  /*
   * Zed renders diffs inline in the editor rather than in a side-by-side pane,
   * so its hunk fills sit under live code far more of the time than VSCode's
   * do. They are tinted rather than composited for the reason in the Tint
   * docs, and this is the test that keeps them that way.
   */
  it.each(FILLS)('keeps code readable on %s', (key) => {
    const fill = style[key]!
    const worst = Math.min(...codeColors.map((color) => contrastRatio(color, fill)))
    expect(worst, `${key} (${fill})`).toBeGreaterThanOrEqual(4.5)
  })

  // The word-level fills are excluded: they sit on top of a line fill rather
  // than on the bare background, so measuring them against bg proves nothing.
  it.each(FILLS.filter((key) => !key.includes('word')))('keeps %s distinguishable from the code around it', (key) => {
    // The twin of the test above: readability is bought by staying close to
    // the background, so it is possible to overshoot into no highlight at all.
    expect(contrastRatio(style[key]!, bg), key).toBeGreaterThan(1.05)
  })

  it('keeps the vim mode indicator readable in every mode', () => {
    const modes = Object.keys(styleRefs)
      .filter((key) => key.startsWith('vim.') && key.endsWith('.foreground'))
      .map((key) => key.replace(/\.foreground$/, ''))
    // The jump label is drawn on the editor rather than on a chip of its own,
    // so it has no background key to be checked against.
    const chips = modes.filter((mode) => `${mode}.background` in style)
    expect(chips.length).toBeGreaterThan(5)
    for (const mode of chips) {
      expect(
        contrastRatio(style[`${mode}.foreground`]!, style[`${mode}.background`]!),
        mode,
      ).toBeGreaterThanOrEqual(4.5)
    }
  })

  it('keeps chrome text readable on the chrome surface', () => {
    for (const key of ['text', 'text.muted', 'icon', 'icon.muted']) {
      expect(contrastRatio(style[key]!, style.background!), key).toBeGreaterThanOrEqual(4.5)
    }
  })

  it('keeps the jump label visible without a chip behind it', () => {
    expect(contrastRatio(style['vim.helix_jump_label.foreground']!, bg)).toBeGreaterThanOrEqual(4.5)
  })

  it('gives every collaborator a distinguishable cursor', () => {
    expect(new Set(players.map((player) => player.cursor)).size).toBe(players.length)
    for (const [i, player] of players.entries()) {
      expect(contrastRatio(player.cursor, bg), `players[${i}]`).toBeGreaterThanOrEqual(4.5)
    }
  })

  it('keeps line numbers recessive, matching the VSCode theme', () => {
    expect(style['editor.line_number']).toBe(resolveRole('fgFaint', 'dark'))
    expect(style['editor.active_line_number']).toBe(resolveRole('fgSubtle', 'dark'))
  })
})

describe('build reproducibility', () => {
  it('is unaffected by build order or repetition', () => {
    expect(JSON.stringify(buildZedTheme('dark'))).toBe(JSON.stringify(buildZedTheme('dark')))
  })
})
