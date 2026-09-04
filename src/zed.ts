import { SLIDER, TINT_EDGE, TINT_LINE, TINT_WORD } from './tints'
import type { ColorRef, RoleName } from './types'

/*
 * The Zed counterpart of workbench.ts. Same job, different shape: VSCode
 * registers 856 colour keys and needs a rule engine to reach them all, whereas
 * Zed honours 187 and names them semantically, so every one is mapped by hand
 * here. A rule engine over a list this size would only hide which key got
 * which colour behind a regex precedence order.
 *
 * The three ColorRef constructors below are deliberately local copies of
 * workbench.ts's. They are one-liners, and the alternative - a shared module
 * both import - would be an abstraction invented for its second use.
 * The *values* they are called with are not duplicated: SLIDER and the TINT_*
 * strengths are imported, because those were settled by measuring contrast and
 * two copies of them would silently drift apart.
 */

const ref = (role: RoleName, alpha?: number, on?: RoleName): ColorRef =>
  alpha === undefined ? { role } : on === undefined ? { role, alpha } : { role, alpha, on }

/** See the Tint docs in types.ts: hue without lightness, for change-signalling fills. */
const tint = (role: RoleName, [lightness, chroma]: readonly [number, number]): ColorRef => ({
  role,
  tint: { lightness, chroma },
})

/** A colour that keeps its transparency to runtime, for keys that paint over content. */
const translucent = (role: RoleName, opacity: number): ColorRef => ({ role, opacity })

/**
 * Fully transparent, which is a value Zed needs stated rather than omitted.
 *
 * Leaving one of these keys unset does not make it transparent - Zed falls back
 * to its own default, which is the cool-blue leak this theme exists to avoid.
 * The role is irrelevant at zero alpha; `bg` is used so the emitted hex reads
 * as the surface it disappears into.
 */
const NONE = translucent('bg', 0)

/** How far a dim ANSI colour is pulled back toward the terminal background. */
const DIM = 0.65

/**
 * A status family: the foreground Zed paints the label or icon in, plus the
 * fill and outline it uses when that status gets a chip of its own.
 *
 * The fill is deliberately weak. These are chips drawn on chrome, not diff
 * fills drawn under code, so alpha is correct here where `tint` is correct
 * there - nothing legible sits on top of them.
 */
const status = (role: RoleName): Record<string, ColorRef> => ({
  '': ref(role),
  '.background': ref(role, 0.15),
  '.border': ref(role, 0.5),
})

const statusFamilies: Record<string, RoleName> = {
  conflict: 'warning',
  created: 'success',
  deleted: 'error',
  error: 'error',
  hidden: 'fgFaint',
  hint: 'fgMuted',
  ignored: 'fgFaint',
  info: 'info',
  modified: 'modified',
  predictive: 'fgFaint',
  renamed: 'info',
  success: 'success',
  unreachable: 'fgMuted',
  warning: 'warning',
}

const statusKeys: Record<string, ColorRef> = {}
for (const [family, role] of Object.entries(statusFamilies)) {
  for (const [suffix, value] of Object.entries(status(role))) {
    statusKeys[`${family}${suffix}`] = value
  }
}

/**
 * The three slider families Zed draws over content.
 *
 * Same reasoning as VSCode's scrollbar, minimap and notebook sliders: the
 * scrollbar shares its column with the diff and diagnostic marks, and the
 * minimap thumb slides over rendered code, so an opaque thumb hides what it
 * covers. Track and thumb border are transparent rather than dark for the same
 * reason - a filled track would occlude the whole marks column at once.
 */
const thumb = (family: string): Record<string, ColorRef> => ({
  [`${family}.thumb.background`]: translucent('fgSubtle', SLIDER.base),
  [`${family}.thumb.hover_background`]: translucent('fgSubtle', SLIDER.hover),
  [`${family}.thumb.active_background`]: translucent('fgSubtle', SLIDER.active),
  [`${family}.thumb.border`]: NONE,
})

/** Slots 0-15, in the order the ANSI palette defines them. */
const ANSI: readonly (readonly [string, RoleName, RoleName])[] = [
  ['black', 'bgOverlay', 'fgFaint'],
  ['red', 'error', 'errorBright'],
  ['green', 'success', 'successBright'],
  ['yellow', 'warning', 'warningBright'],
  ['blue', 'accent', 'accentBright'],
  ['magenta', 'modified', 'modifiedBright'],
  ['cyan', 'info', 'infoBright'],
  ['white', 'fgSubtle', 'fgBright'],
]

const ansiKeys: Record<string, ColorRef> = {}
for (const [name, base, bright] of ANSI) {
  ansiKeys[`terminal.ansi.${name}`] = ref(base)
  ansiKeys[`terminal.ansi.bright_${name}`] = ref(bright)
  // Zed asks for a dim variant of every slot, which neither ANSI nor the
  // Ghostty palette defines. Pulling the base colour toward the terminal
  // background is what "dim" means for text, and keeps the hue.
  ansiKeys[`terminal.ansi.dim_${name}`] = ref(base, DIM)
}

/**
 * Zed's vim mode indicator: one chip per mode in the status bar.
 *
 * Modes that change what typing does are given the palette's loud hues and a
 * dark foreground, because the whole point of the indicator is that an
 * accidental insert-mode is noticed. Normal mode - the resting state - is the
 * one that stays quiet, so it takes the selection surface rather than a hue.
 */
const MODES: readonly (readonly [string, RoleName])[] = [
  ['insert', 'success'],
  ['replace', 'error'],
  ['visual', 'accent'],
  ['visual_line', 'accentBright'],
  ['visual_block', 'warning'],
  ['helix_select', 'info'],
]

/** Vim's resting state and Helix's equivalent, which has to match it. */
const RESTING = ['normal', 'helix_normal']

const vimKeys: Record<string, ColorRef> = {
  // Painted over the code that was just yanked, so it has to stay translucent
  // or the flash blanks the very text it is confirming.
  'vim.yank.background': translucent('warning', 0.3),
  // The letter overlaid on a jump target. It has no background key of its own,
  // so it is drawn straight onto the editor and needs the brightest warm the
  // palette has rather than a dark chip foreground.
  'vim.helix_jump_label.foreground': ref('warningBright'),
}
for (const mode of RESTING) {
  vimKeys[`vim.${mode}.background`] = ref('bgSelect')
  vimKeys[`vim.${mode}.foreground`] = ref('fg')
}
for (const [mode, role] of MODES) {
  vimKeys[`vim.${mode}.background`] = ref(role)
  vimKeys[`vim.${mode}.foreground`] = ref('bg')
}

/**
 * Every colour key, keyed exactly as Zed spells it.
 *
 * `null` means the key is deliberately left unset; nothing currently uses it,
 * because in Zed an unset key falls back to a built-in default rather than to
 * nothing, and every one of those defaults is outside this palette. It is kept
 * for parity with workbench.ts, where the distinction is load-bearing.
 */
export const styleRefs: Record<string, ColorRef | null> = {
  ...statusKeys,
  ...ansiKeys,
  ...vimKeys,
  ...thumb('scrollbar'),
  ...thumb('minimap'),

  // Surfaces. Zed stacks three: the app background behind everything, the
  // surface panels sit on, and the editor canvas. The VSCode theme already
  // settled that hierarchy - chrome is one consistent bgRaised, the editor is
  // bg, and anything floating above both is bgOverlay - so this follows it
  // rather than inventing a second arrangement of the same five roles.
  background: ref('bgRaised'),
  'surface.background': ref('bgRaised'),
  'elevated_surface.background': ref('bgOverlay'),
  'panel.background': ref('bgRaised'),
  'panel.overlay_background': ref('bgOverlay'),
  'panel.overlay_hover': ref('bgSelect', 0.5),
  'status_bar.background': ref('bgRaised'),
  'title_bar.background': ref('bgRaised'),
  // Recessed rather than another bgRaised, matching what the VSCode theme
  // already gives titleBar.inactiveBackground. An unfocused window has to look
  // unfocused, and this is the only key in the Zed set that says so.
  'title_bar.inactive_background': ref('bgSunken'),
  'toolbar.background': ref('bg'),
  'tab_bar.background': ref('bgRaised'),
  'tab.inactive_background': ref('bgRaised'),
  // The active tab is a window onto the editor, so it takes the editor's own
  // surface. That is what separates it from the bar around it.
  'tab.active_background': ref('bg'),

  // Borders. Zed's schema splits these two ways and the split is load-bearing:
  // `border` is "used for most borders, is usually a high contrast color",
  // `border.variant` is for "deemphasized borders, like a visual divider
  // between two sections". Only the second is a divider between surfaces that
  // already differ, so only the second can be recessive. The VSCode theme
  // makes no such split: workbench.ts ends its rule list with a catch-all
  // `/[Bb]order([A-Z][a-z]+)?$/` painting bgSunken, so element outlines get
  // the recessive treatment too - input.border, dropdown.border, menu.border,
  // checkbox.border, editorWidget.border, keybindingLabel.border,
  // notebook.cellBorderColor and settings.textInputBorder all resolve to
  // bgSunken, which reads 1.04:1 against the editor canvas and is on the wrong
  // side of it. Those are the same case this change corrects here, and the
  // defect is still present in the VSCode theme; fixing it there is
  // deliberately out of scope.
  //
  // `border` is the outline Zed draws around elements sitting *on* a surface,
  // the multibuffer file header among them (editor/src/element/header.rs draws
  // it as border_1 in this colour over `editor.subheader.background`). A line
  // darker than the canvas cannot outline anything there: at bgSunken it read
  // 1.04:1 against the editor background and on the wrong side of it, so a
  // column of collapsed file headers ran together. fgFaint at 0.6 over the
  // canvas lands at 1.62:1, matching the 1.60:1 One Dark gets from its own
  // `border`, and stays inside the warm ramp rather than reaching for a hue.
  // That does couple the chrome to the terminal palette: fgFaint is ansi[8]
  // (palette.ts:37), and the ANSI array is byte-identical to the Ghostty theme
  // (palette.ts:4), so a resync of it now moves every border in the Zed UI,
  // not only the terminal colours.
  border: ref('fgFaint', 0.6),
  // The deemphasized tier. It is still a line someone has to see: it is the
  // rule under the editor toolbar (workspace/src/toolbar.rs draws it as
  // border_b_1 in this colour), which is the only thing separating the cmd+F
  // search bar from the code beneath it. Composited over bgRaised it resolved
  // to within one step of the editor background - 1.00:1 against the toolbar
  // it was meant to close off - so the bar and the buffer ran together. At
  // fgFaint 0.3 over the canvas it reads 1.24:1, matching One Dark's 1.26:1,
  // and stays a clear step below `border` so Zed's two tiers remain two tiers.
  'border.variant': ref('fgFaint', 0.3),
  // The faintest tier, and the one border with nothing to separate: a disabled
  // control should read as one. It was reading as nothing at all, though -
  // bgSunken over bgRaised sat 1.01:1 from `element.disabled`, the fill it is
  // meant to outline, and darker than the canvas, so the control lost its
  // shape rather than only its emphasis. fgFaint at 0.15 reads 1.10:1 both
  // against the canvas and against that fill, and stays clearly below
  // `border.variant`'s 1.24:1, so the ordering border > border.variant >
  // border.disabled holds. 0.15 is exactly half of `border.variant`'s 0.3, and
  // dropping the `on: 'bgRaised'` puts all three tiers on the same surface
  // assumption - composited over `bg`, the default.
  'border.disabled': ref('fgFaint', 0.15),
  'border.focused': ref('accent', 0.6),
  'border.selected': ref('accent', 0.6),
  'border.transparent': NONE,
  'pane.focused_border': ref('accent', 0.6),
  'pane_group.border': ref('bgSunken'),
  'panel.focused_border': ref('accent', 0.6),

  // Interactive elements. Four states that must stay four colours: at rest an
  // element is its surface, hover and active lift toward the selection colour,
  // and selected is the selection colour outright.
  'element.background': ref('bgRaised'),
  'element.hover': ref('bgSelect', 0.5),
  'element.active': ref('bgSelect', 0.7),
  'element.selected': ref('bgSelect'),
  'element.disabled': ref('bgSunken', 0.5, 'bgRaised'),
  'element.selection_background': ref('bgSelect'),
  // Ghost elements are the ones with no surface of their own - toolbar icons
  // and the like - so at rest and disabled they must be transparent, not a
  // surface colour, or they stop being ghosts.
  'ghost_element.background': NONE,
  'ghost_element.disabled': NONE,
  'ghost_element.hover': ref('bgSelect', 0.5),
  'ghost_element.active': ref('bgSelect', 0.7),
  'ghost_element.selected': ref('bgSelect'),

  // Drag and drop. The one place a border exists purely to be noticed: it
  // appears only mid-drag and is the only thing saying where the thing lands.
  'drop_target.background': ref('info', 0.35),
  'drop_target.border': ref('accent'),

  // Text and icons
  text: ref('fg'),
  'text.muted': ref('fgMuted'),
  'text.placeholder': ref('fgFaint'),
  'text.disabled': ref('fgFaint'),
  'text.accent': ref('accent'),
  icon: ref('fgSubtle'),
  'icon.muted': ref('fgMuted'),
  'icon.placeholder': ref('fgFaint'),
  'icon.disabled': ref('fgFaint'),
  'icon.accent': ref('accent'),
  'link_text.hover': ref('accentBright'),
  // The debugger's own highlight colour, matching the amber the VSCode theme
  // gives the stack frame you are stopped in.
  'debugger.accent': ref('warning'),

  // Editor canvas
  'editor.background': ref('bg'),
  'editor.foreground': ref('fg'),
  'editor.gutter.background': ref('bg'),
  // The multibuffer file header - the bar naming each file in a project diff
  // or search result. It is a chip floating over the canvas rather than a
  // panel beside it, so it takes the same surface as everything else that
  // floats. bgRaised put it 1.05:1 from the editor background, which is below
  // the point where an edgeless bar is a bar at all. bgOverlay reads 1.18:1,
  // which is the step the fix was validated at.
  //
  // Sharing that role with `elevated_surface.background`,
  // `panel.overlay_background` and `terminal.ansi.black` is deliberate rather
  // than incidental, because the obvious decoupled alternative fails: fgFaint
  // composited over `bg` only reaches this step at alpha ~0.25, which lands on
  // the exact value of `element.hover`, so the resting header would be
  // indistinguishable from its own hover state. The coupling is named here
  // so a later change to the popover surface does not move the header silently.
  'editor.subheader.background': ref('bgOverlay'),
  'editor.active_line.background': ref('bgSelect', 0.35),
  'editor.highlighted_line.background': ref('accent', 0.12),
  'editor.debugger_active_line.background': ref('warning', 0.25),
  'editor.line_number': ref('fgFaint'),
  'editor.active_line_number': ref('fgSubtle'),
  'editor.hover_line_number': ref('fgMuted'),
  'editor.invisible': ref('fgFaint', 0.5),
  'editor.wrap_guide': ref('fgFaint', 0.4),
  'editor.active_wrap_guide': ref('fgFaint'),
  'editor.indent_guide': ref('fgFaint', 0.3),
  'editor.indent_guide_active': ref('fgFaint'),
  'panel.indent_guide': ref('fgFaint', 0.3),
  'panel.indent_guide_hover': ref('fgFaint', 0.6),
  'panel.indent_guide_active': ref('fgFaint'),
  'editor.document_highlight.read_background': ref('accent', 0.14),
  'editor.document_highlight.write_background': ref('accent', 0.22),
  'editor.document_highlight.bracket_background': ref('accent', 0.16),

  // Search. Every match gets the weaker wash and the one you are on gets the
  // stronger, so the current match is findable among its neighbours.
  'search.match_background': ref('warning', 0.18),
  'search.active_match_background': ref('warning', 0.35),

  // Terminal
  'terminal.background': ref('bg'),
  'terminal.foreground': ref('fg'),
  'terminal.bright_foreground': ref('fgBright'),
  'terminal.dim_foreground': ref('fgMuted'),
  'terminal.ansi.background': ref('bg'),

  // Inline diffs. Tinted, never alpha-composited: see the Tint docs in
  // types.ts for why no alpha value is both visible and readable over green.
  'editor.diff_hunk.added.background': tint('success', TINT_LINE),
  'editor.diff_hunk.deleted.background': tint('error', TINT_LINE),
  // A hollow hunk is an outline standing in for collapsed content, so the fill
  // is genuinely absent and only the edge is drawn.
  'editor.diff_hunk.added.hollow_background': NONE,
  'editor.diff_hunk.deleted.hollow_background': NONE,
  'editor.diff_hunk.added.hollow_border': tint('success', TINT_WORD),
  'editor.diff_hunk.deleted.hollow_border': tint('error', TINT_WORD),

  // Version control. The bare keys are gutter marks and file labels, so they
  // are full-strength foregrounds; the word-level and conflict keys are fills
  // under code and are tinted for the same reason as the hunks above.
  'version_control.added': ref('success'),
  'version_control.deleted': ref('error'),
  'version_control.modified': ref('modified'),
  'version_control.renamed': ref('info'),
  'version_control.conflict': ref('warning'),
  'version_control.ignored': ref('fgFaint'),
  'version_control.word_added': tint('success', TINT_WORD),
  'version_control.word_deleted': tint('error', TINT_WORD),
  'version_control.conflict_marker.ours': tint('success', TINT_EDGE),
  'version_control.conflict_marker.theirs': tint('info', TINT_EDGE),
  'version_control_conflict_ours_background': tint('success', TINT_LINE),
  'version_control_conflict_theirs_background': tint('info', TINT_LINE),

  // Scrollbar track. Transparent, not a surface: the editor scrollbar column
  // carries the diff and diagnostic marks, and a filled track hides all of
  // them at once rather than only where the thumb happens to be.
  'scrollbar.track.background': NONE,
  'scrollbar.track.border': NONE,
}

export interface PlayerRef {
  cursor: ColorRef
  background: ColorRef
  selection: ColorRef
}

/**
 * Collaboration cursors, and - for the first slot - this editor's own.
 *
 * Zed takes the local cursor and the local selection from players[0], so that
 * entry is not a collaborator colour at all: it has to be the cursor and
 * selection the VSCode theme already settled, or opening the same file in the
 * two editors would show two different selections.
 *
 * The remaining seven are the six hues bracket-pair colourisation already uses,
 * plus jade's bright variant, because collaborators are told apart by hue and
 * this palette has exactly seven distinguishable ones.
 */
const COLLABORATORS: readonly RoleName[] = [
  'accent',
  'success',
  'warning',
  'info',
  'modified',
  'error',
  'infoBright',
]

export const players: readonly PlayerRef[] = [
  { cursor: ref('cursor'), background: ref('cursor'), selection: ref('bgSelect') },
  ...COLLABORATORS.map((role) => ({
    cursor: ref(role),
    background: ref(role),
    // Translucent, not composited: a collaborator's selection is painted over
    // whatever they have selected, which is code.
    selection: translucent(role, 0.24),
  })),
]

/**
 * Zed's rotating accent colours, used where it needs a series of colours that
 * are only required to differ from one another.
 *
 * Zed's own themes leave this empty and fall back to a built-in set, which is
 * the one place left where a cool default could still reach the screen.
 */
export const accents: readonly ColorRef[] = [
  ref('accent'),
  ref('success'),
  ref('warning'),
  ref('info'),
  ref('modified'),
  ref('error'),
]

/**
 * Opaque, not blurred or transparent.
 *
 * The palette's surfaces are separated by as little as 0.02 in OKLCH lightness,
 * and any translucency puts the desktop behind the window into that budget.
 */
export const windowBackground = 'opaque'
