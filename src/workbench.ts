import type { ColorRef, RoleName } from './types'

const ref = (role: RoleName, alpha?: number, on?: RoleName): ColorRef =>
  alpha === undefined ? { role } : on === undefined ? { role, alpha } : { role, alpha, on }

/**
 * A change-signalling background: `role`'s hue at a lightness pinned near the
 * editor background, so code sitting on top stays as readable as it was on
 * the plain background.
 *
 * Use this for every "this region changed" fill. The alternative, `ref(role,
 * alpha)`, cannot work here: see the Tint docs in types.ts for why no alpha
 * value is both readable and visible for the success green.
 *
 * Lightness deltas are deliberately small and the two levels differ mostly in
 * chroma, not lightness - a more saturated word-level fill reads as stronger
 * without costing any contrast. Above roughly 0.07 chroma the greens clip to
 * the sRGB gamut and stop getting more saturated, so LINE and WORD are set
 * either side of that.
 */
const tint = (role: RoleName, lightness: number, chroma: number): ColorRef => ({
  role,
  tint: { lightness, chroma },
})

/** Whole changed line or region: present, but never competing with the code. */
const TINT_LINE = [0.04, 0.04] as const
/**
 * The exact changed characters inside such a line.
 *
 * Lightness is 0.06 rather than 0.07 because the jade hue is the greenest of
 * the roles this is applied to, and at 0.07 it landed at 4.45:1 - just under
 * AA. At 0.06 the worst case across every hue used here is 4.61:1.
 */
const TINT_WORD = [0.06, 0.07] as const
/**
 * The outline VSCode draws around the changed characters.
 *
 * Darker than the fill it surrounds rather than brighter. It has to differ
 * from the fill or it does not render at all, but the previous value was the
 * role at 0.55 alpha, which put a bright edge around every changed word. A
 * recessed edge defines the same boundary without adding a second bright line.
 */
const TINT_EDGE = [0.03, 0.07] as const
/**
 * The diff margin: the line-number column beside a changed line.
 *
 * Marginally stronger than the line wash, so a changed line and its number
 * read as one continuous band rather than a bright column bolted onto a
 * subtle wash. It used to be the full role, and `success` and `error` are
 * light saturated colours - a full-height column of either was the brightest
 * thing on screen.
 *
 * Line numbers *are* drawn on this, so it is contrast-constrained after all,
 * and awkwardly: editorLineNumber.foreground is fgFaint at OKLCH lightness
 * 0.447, above the background's 0.207. Lightening the margin therefore moves
 * it toward the very colour drawn on it. No visible tint reaches the 2.37:1
 * that line numbers get on the plain gutter; the faintest one caps at 2.12.
 * At 0.07 they sit near 2.0, and the active line number - the one you
 * actually look for - improves from 1.36 to 10.07, because full-strength
 * success was so light it nearly erased it.
 */
const TINT_MARGIN = [0.07, 0.09] as const

/**
 * Matches a semantic word appearing as a segment of a colour key.
 *
 * Case-insensitive because VSCode is inconsistent about placement and casing:
 * the same concept appears as `list.errorForeground` and `editorError.foreground`.
 */
const word = (...words: string[]): RegExp =>
  new RegExp(`(^|\\.|[a-z])(${words.join('|')})([A-Z]|\\.|$)`, 'i')

/**
 * Exact-match exceptions, checked before `rules`.
 * `null` means the key is deliberately left transparent.
 */
const overrides: Record<string, ColorRef | null> = {
  // Global
  foreground: ref('fg'),
  disabledForeground: ref('fgFaint'),
  errorForeground: ref('error'),
  descriptionForeground: ref('fgMuted'),
  'icon.foreground': ref('fgSubtle'),
  focusBorder: ref('accent', 0.6),
  // Both contrast keys are deliberately unset. The schema calls them "an
  // extra border around elements to separate them from others for greater
  // contrast" - they exist for high-contrast accessibility themes and stack
  // on top of every border already defined here. Setting them outlined every
  // surface at once, which is the opposite of the recessive chrome this
  // theme is for. Unset means no extra border, not a cool default leaking.
  contrastBorder: null,
  contrastActiveBorder: null,
  'widget.shadow': ref('bgSunken', 0.5),
  'widget.border': ref('bgSunken'),
  'sash.hoverBorder': ref('accent', 0.6),
  // Matches window.inactiveBorder, so the window edge reads the same whether
  // or not it has focus. At full accent this drew an orange line around the
  // entire window. Not nulled: this key is outside the audited set of cool
  // fallbacks, so matching the inactive edge is the safer way to hide it.
  'window.activeBorder': ref('bgSunken'),
  'selection.background': ref('bgSelect'),

  // Text
  'textLink.foreground': ref('accent'),
  'textLink.activeForeground': ref('accentBright'),
  'textPreformat.foreground': ref('modifiedBright'),
  'textBlockQuote.background': ref('bgRaised'),
  'textBlockQuote.border': ref('accent', 0.5),
  'textCodeBlock.background': ref('bgOverlay'),
  'textSeparator.foreground': ref('fgFaint'),

  // Editor core
  'editor.background': ref('bg'),
  'editor.foreground': ref('fg'),
  'editorCursor.foreground': ref('cursor'),
  'editorCursor.background': ref('bg'),
  'editor.lineHighlightBackground': ref('bgSelect', 0.35),
  'editor.lineHighlightBorder': null,
  'editor.selectionBackground': ref('bgSelect'),
  'editor.selectionForeground': ref('fgBright'),
  'editor.inactiveSelectionBackground': ref('bgSelect', 0.5),
  'editor.selectionHighlightBackground': ref('bgSelect', 0.6),
  'editor.wordHighlightBackground': ref('accent', 0.14),
  'editor.wordHighlightStrongBackground': ref('accent', 0.22),
  'editor.findMatchBackground': ref('warning', 0.35),
  'editor.findMatchHighlightBackground': ref('warning', 0.18),
  'editor.findRangeHighlightBackground': ref('bgSelect', 0.4),
  'editor.hoverHighlightBackground': ref('accent', 0.12),
  'editor.rangeHighlightBackground': ref('bgSelect', 0.3),
  'editorLineNumber.foreground': ref('fgFaint'),
  'editorLineNumber.activeForeground': ref('fgSubtle'),
  // Deprecated alias of editorLineNumber.activeForeground (the schema says so
  // explicitly). Two keys naming the same pixel must not drift: pinned to the
  // same role rather than left to a fallback that could move independently.
  'editorActiveLineNumber.foreground': ref('fgSubtle'),
  'editorWhitespace.foreground': ref('fgFaint', 0.5),
  'editorIndentGuide.background1': ref('fgFaint', 0.3),
  'editorIndentGuide.activeBackground1': ref('fgFaint'),
  'editorRuler.foreground': ref('fgFaint', 0.4),
  'editorCodeLens.foreground': ref('fgFaint'),
  'editorBracketMatch.background': ref('accent', 0.16),
  'editorBracketMatch.border': ref('accent', 0.5),
  'editorLink.activeForeground': ref('accentBright'),

  // Terminal ANSI, one-to-one with Ghostty slots 0-15
  'terminal.background': ref('bg'),
  'terminal.foreground': ref('fg'),
  'terminalCursor.foreground': ref('cursor'),
  'terminalCursor.background': ref('bg'),
  'terminal.selectionBackground': ref('bgSelect'),
  'terminal.ansiBlack': ref('bgOverlay'),
  'terminal.ansiRed': ref('error'),
  'terminal.ansiGreen': ref('success'),
  'terminal.ansiYellow': ref('warning'),
  'terminal.ansiBlue': ref('accent'),
  'terminal.ansiMagenta': ref('modified'),
  'terminal.ansiCyan': ref('info'),
  'terminal.ansiWhite': ref('fgSubtle'),
  'terminal.ansiBrightBlack': ref('fgFaint'),
  'terminal.ansiBrightRed': ref('errorBright'),
  'terminal.ansiBrightGreen': ref('successBright'),
  'terminal.ansiBrightYellow': ref('warningBright'),
  'terminal.ansiBrightBlue': ref('accentBright'),
  'terminal.ansiBrightMagenta': ref('modifiedBright'),
  'terminal.ansiBrightCyan': ref('infoBright'),
  'terminal.ansiBrightWhite': ref('fgBright'),

  // The nine keys whose VSCode defaults are cool
  'activityBar.activeBorder': ref('accent'),
  // Kept set, but painted the same colour as the active tab so it does not
  // render. An active tab bordered both top (this) and bottom
  // (tab.activeBorder) reads as a bracket and is too loud; the bottom edge
  // alone is enough to locate it. This cannot be null: it is one of the nine
  // keys whose VSCode fallback is a cool blue, so nulling it would trade an
  // orange line for a blue one.
  'tab.activeBorderTop': ref('bgSelect'),
  // One of the two accents kept at full strength, alongside
  // activityBar.activeBorder. The generic ActiveBorder rule now dims to 0.6,
  // so this has to be pinned or the active tab loses its only marker.
  'tab.activeBorder': ref('accent'),
  'statusBar.focusBorder': ref('accent', 0.6),
  'statusBarItem.focusBorder': ref('accent', 0.6),
  'statusBarItem.remoteBackground': ref('accent'),
  'statusBarItem.remoteForeground': ref('bg'),
  // Dimmed to match the generic ActiveBorder rule. Both must stay set rather
  // than be nulled, because they are two of the nine keys whose VSCode
  // fallback is cool, but neither needs full accent to read as active.
  'terminal.tab.activeBorder': ref('accent', 0.6),
  'welcomePage.progress.foreground': ref('accent'),
  'inputOption.activeBorder': ref('accent', 0.6),
  'actionBar.toggledBackground': ref('bgSelect'),

  // Chrome surfaces pinned so the hierarchy is explicit rather than incidental
  'activityBar.background': ref('bgRaised'),
  'sideBar.background': ref('bgRaised'),
  'statusBar.background': ref('bgRaised'),
  'panel.background': ref('bgRaised'),
  'titleBar.activeBackground': ref('bgRaised'),
  'input.background': ref('bgOverlay'),
  'dropdown.background': ref('bgOverlay'),
  'quickInput.background': ref('bgOverlay'),

  // Buttons
  'button.background': ref('accent'),
  'button.foreground': ref('bg'),
  'button.hoverBackground': ref('accentBright'),
  'button.secondaryBackground': ref('bgOverlay'),
  'button.secondaryForeground': ref('fg'),
  'button.secondaryHoverBackground': ref('bgSelect'),
  'button.border': null,
  // No alpha: the separator sits on button.background (accent), and blending a
  // role over itself is a no-op - blend(bg, bg, a) === bg for every a - so the
  // 0.4 this once carried resolved to plain bg and only looked deliberate.
  'button.separator': ref('bg'),

  // Badges and progress
  'badge.background': ref('accent'),
  'badge.foreground': ref('bg'),
  'progressBar.background': ref('accent'),

  // Scrollbar
  'scrollbar.shadow': ref('bgSunken', 0.5),
  'scrollbarSlider.background': ref('fgFaint', 0.3),
  'scrollbarSlider.hoverBackground': ref('fgFaint', 0.5),
  'scrollbarSlider.activeBackground': ref('fgFaint', 0.7),
  // The third slider family. Without these the base state fell through to the
  // generic Background rule and resolved to bgRaised - exactly
  // notebook.editorBackground, so the notebook's own scrollbar had no thumb.
  // Same role and ascending alphas as the two sibling families above.
  'notebookScrollbarSlider.background': ref('fgFaint', 0.3),
  'notebookScrollbarSlider.hoverBackground': ref('fgFaint', 0.5),
  'notebookScrollbarSlider.activeBackground': ref('fgFaint', 0.7),

  // Comments: resolved is a settled/good state, unresolved still needs attention
  'commentsView.resolvedIcon': ref('success'),
  'commentsView.unresolvedIcon': ref('warning'),

  // Bracket pair colorization: six numbered levels need six *distinct* warm
  // hues so nested brackets stay visually separable. One override per level
  // because each needs a different value; a single rule can't do that.
  'editorBracketHighlight.foreground1': ref('accent'),
  'editorBracketHighlight.foreground2': ref('success'),
  'editorBracketHighlight.foreground3': ref('warning'),
  'editorBracketHighlight.foreground4': ref('info'),
  'editorBracketHighlight.foreground5': ref('modified'),
  'editorBracketHighlight.foreground6': ref('error'),
  'editorBracketPairGuide.background1': ref('accent', 0.3),
  'editorBracketPairGuide.background2': ref('success', 0.3),
  'editorBracketPairGuide.background3': ref('warning', 0.3),
  'editorBracketPairGuide.background4': ref('info', 0.3),
  'editorBracketPairGuide.background5': ref('modified', 0.3),
  'editorBracketPairGuide.background6': ref('error', 0.3),
  'editorBracketPairGuide.activeBackground1': ref('accent', 0.6),
  'editorBracketPairGuide.activeBackground2': ref('success', 0.6),
  'editorBracketPairGuide.activeBackground3': ref('warning', 0.6),
  'editorBracketPairGuide.activeBackground4': ref('info', 0.6),
  'editorBracketPairGuide.activeBackground5': ref('modified', 0.6),
  'editorBracketPairGuide.activeBackground6': ref('error', 0.6),

  // Unsuffixed indent guide keys: the brief already special-cased level 1
  // (fgFaint / fgFaint 0.3) so the guide reads as a faint line rather than
  // vanishing into the editor background. These pre-numbering keys need the
  // same treatment for the same reason; otherwise they fall through to the
  // generic editor-surface rule and resolve to plain 'bg', making the guide
  // invisible against the editor background it's meant to sit on.
  'editorIndentGuide.background': ref('fgFaint', 0.3),
  'editorIndentGuide.activeBackground': ref('fgFaint'),

  // Faded/opacity keys: the vendored schema is explicit that only the alpha
  // channel is read (an 8-digit hex with a ~75%-opacity alpha suffix is the
  // documented example for both this key and minimap.foregroundOpacity).
  // Any opaque hex we emit here is alpha ff, i.e. no fade at all - the exact
  // opposite of intent, and this system has no way to express "alpha-only,
  // ignore RGB" other than leaving it unset. Deliberately transparent; see
  // TRANSPARENT in the test, which carries the schema quote verbatim.
  'editorUnnecessaryCode.opacity': null,
  'minimap.foregroundOpacity': null,

  // Separators, one-offs that don't match the Border/Shadow/Stroke family regex.
  // NOTE: not ref('bg', 0.4) - blending a role over itself is a no-op
  // (blend(bg, bg, alpha) === bg for any alpha), which would make this
  // exactly editor.background regardless of the alpha value.
  // Also not ref('bgSunken') (round 1's fix): this separator's real
  // container is extensionButton.background/prominentBackground - both
  // bgRaised - and bgSunken vs bgRaised only ever reaches ~1.09 contrast
  // (see the menu.separatorBackground note above). fgFaint is visible there.
  'extensionButton.separator': ref('fgFaint'),
  'notebook.cellToolbarSeparator': ref('bgSunken'),

  // Notebook
  'notebook.cellInsertionIndicator': ref('accent'),
  'notebook.outputContainerBackgroundColor': ref('bgOverlay'),

  // Merge editor minimap ruler marks: handled = resolved, unhandled = needs attention
  'mergeEditor.conflict.handled.minimapOverViewRuler': ref('success', 0.25),
  'mergeEditor.conflict.unhandled.minimapOverViewRuler': ref('warning', 0.25),

  // --- Fix round 1 (task-4 review) ---

  // Status-bar and input-validation "chip" foregrounds. The fill (from the
  // error/warning/info word rules further down) is a saturated colour, so
  // the text on top needs to be dark, not the theme's light default
  // foreground - otherwise foreground and background are the same hex.
  'statusBarItem.errorForeground': ref('bg'),
  'statusBarItem.errorHoverForeground': ref('bg'),
  'statusBarItem.warningForeground': ref('bg'),
  'statusBarItem.warningHoverForeground': ref('bg'),
  'inputValidation.errorForeground': ref('bg'),
  'inputValidation.warningForeground': ref('bg'),
  'inputValidation.infoForeground': ref('bg'),
  // The "N hidden lines" label on the collapsed-region fill; the
  // `^diffEditor\.` rule gives foreground and background the same tint.
  'diffEditor.unchangedRegionForeground': ref('fgMuted'),

  // Tab "this file has unsaved changes" indicator border. `word('modified')`
  // matches both active and inactive variants identically (see the rules
  // list below), so these need to be pulled out as exact overrides to be
  // distinguishable at all.
  //
  // Round 2 fix: the inactive pair was first sent to bgSunken, which
  // resolved to the same hex as tab.border - that satisfied the
  // active/inactive guard by deleting the "this tab has unsaved changes"
  // semantic on background tabs rather than differentiating it. Dimmer
  // modified tints (mirroring the alpha already used for the unfocused-
  // active case) keep the semantic while still reading as "not the active
  // tab". The two inactive alphas must differ from each other too, since
  // tab.unfocusedInactiveModifiedBorder and tab.unfocusedActiveModifiedBorder
  // are themselves an active/inactive pair the guard checks.
  'tab.activeModifiedBorder': ref('modified'),
  'tab.inactiveModifiedBorder': ref('modified', 0.6),
  'tab.unfocusedActiveModifiedBorder': ref('modified', 0.6),
  'tab.unfocusedInactiveModifiedBorder': ref('modified', 0.4),

  // Activity-bar badge: matches the plain badge.background/foreground
  // treatment above. Without this override it's caught by the chrome-surface
  // family rule as if "Badge.background" were itself a surface name, so the
  // badge painted the same colour as the activity bar it sits on.
  'activityBarBadge.background': ref('accent'),
  'activityBarBadge.foreground': ref('bg'),

  // One-off editor decorations the generic editor-adjacent-surface rule was
  // swallowing: they end in "...Background" so it matched them as if they
  // were a container, making them identical to editor.background and
  // therefore invisible (debugger current-line highlight, folded-code
  // backdrop, linked-rename highlight, suspicious-unicode highlight, and the
  // minimap's own viewport slider).
  'editor.stackFrameHighlightBackground': ref('warning', 0.25),
  'editor.foldBackground': ref('accent', 0.12),
  'editor.linkedEditingBackground': ref('accent', 0.14),
  'editorUnicodeHighlight.background': ref('warning', 0.2),

  // The same defect class found on a second pass while verifying I3: every
  // key here also ends "...Background" under an "editor"-prefixed key, so
  // the editor-adjacent-surface rule caught it as if it were more editor
  // canvas rather than a decoration painted on top of the canvas.
  'editor.focusedStackFrameHighlightBackground': ref('warning', 0.35),
  'editor.inlineValuesBackground': ref('accent', 0.1),
  'editor.snippetFinalTabstopHighlightBackground': ref('accent', 0.22),
  'editor.snippetTabstopHighlightBackground': ref('accent', 0.14),
  'editor.symbolHighlightBackground': ref('accent', 0.16),
  'editor.wordHighlightTextBackground': ref('accent', 0.1),
  'editorCommentsWidget.rangeBackground': ref('info', 0.12),
  'editorGroup.dropIntoPromptBackground': ref('bgOverlay'),
  'editorMarkerNavigation.background': ref('bgOverlay'),
  'editorInlayHint.background': ref('bgOverlay'),
  'editorInlayHint.parameterBackground': ref('bgOverlay'),
  'editorInlayHint.typeBackground': ref('bgOverlay'),
  'editorStickyScrollHover.background': ref('bgSelect', 0.5),
  // Same defect, but the container is miscategorised: breadcrumbPicker is a
  // popup list (like quickInput/dropdown), not more editor canvas, but its
  // prefix sits in the editor-adjacent-surfaces group below.
  'breadcrumbPicker.background': ref('bgOverlay'),

  // De-emphasised text: these fell through to the generic foreground rule
  // and rendered at full brightness, identical to real content - placeholder
  // text read as typed text, AI ghost-text was indistinguishable from
  // committed code.
  'editorLineNumber.dimmedForeground': ref('fgMuted'),
  'list.deemphasizedForeground': ref('fgMuted'),
  'input.placeholderForeground': ref('fgMuted'),
  'inlineChatInput.placeholderForeground': ref('fgMuted'),
  'editorGhostText.foreground': ref('fgMuted'),
  'editorInlayHint.foreground': ref('fgMuted'),

  // Terminal and search-editor find matches, mirroring the editor's own
  // find-match treatment above. These fell through to the generic background
  // rule and rendered at contrast ~1 against the terminal/search background.
  'terminal.findMatchBackground': ref('warning', 0.35),
  'terminal.findMatchHighlightBackground': ref('warning', 0.18),
  'terminal.hoverHighlightBackground': ref('accent', 0.12),
  'searchEditor.findMatchBackground': ref('warning', 0.35),

  // 3-way merge editor input panes, mirroring the inline merge-conflict
  // treatment (merge.currentContentBackground / incomingContentBackground)
  // above so the two sides of a merge - and the generic "changed" highlight
  // inside either - are visually distinguishable from one another.
  'mergeEditor.conflict.input1.background': tint('info', ...TINT_LINE),
  'mergeEditor.conflict.input2.background': tint('accent', ...TINT_LINE),
  'mergeEditor.change.background': tint('modified', ...TINT_LINE),
  // Was claimed by the generic word('deleted','removed','conflicting') rule,
  // which resolves to full-strength error. That rule is right for gutter
  // icons and decorations but this key is a background: the result was code
  // printed on the same colour as itself, at 1.00:1, invisible rather than
  // merely low contrast.
  'mergeEditor.conflictingLines.background': tint('error', ...TINT_LINE),
  // Both fell through to the generic word('added'|'inserted') and
  // word('deleted'|'removed') rules, which resolve to the full role. That is
  // right for the icons and decorations those rules exist for, but these two
  // fill the whole line-number column beside every changed line, and at full
  // strength that column was brighter than the code it annotates.
  'diffEditorGutter.insertedLineBackground': tint('success', ...TINT_MARGIN),
  'diffEditorGutter.removedLineBackground': tint('error', ...TINT_MARGIN),

  // Test explorer status icons. The word-rule family only accidentally
  // caught "iconErrored" (via the "error" word); the rest fell through to
  // the generic foreground rule and were indistinguishable from each other.
  'testing.iconPassed': ref('success'),
  'testing.iconFailed': ref('error'),
  'testing.iconErrored': ref('error'),
  'testing.iconQueued': ref('info'),
  'testing.iconSkipped': ref('fgFaint'),
  'testing.iconUnset': ref('fgMuted'),

  // Tree indent guides. These are the only two "...Stroke" keys in the whole
  // schema, and no generic rule ends up claiming them, so without these
  // entries the build would fail them as unmapped rather than fall back to
  // anything. (An earlier `Stroke$ -> accent` rule was deleted precisely
  // because these two overrides left it matching nothing.) The values match
  // the editor's own deliberately faint indent guides, rather than the
  // saturated accent orange a Stroke rule would have given every explorer
  // row - the loudest thing on screen, in a theme meant to be calm.
  'tree.indentGuidesStroke': ref('fgFaint', 0.5),
  'tree.inactiveIndentGuidesStroke': ref('fgFaint', 0.25),

  // titleBar.activeBackground is deliberately pinned to bgRaised above (part
  // of the chrome-surface hierarchy), so the generic InactiveBackground rule
  // - which also resolves to bgRaised - would make an unfocused window
  // title bar identical to a focused one. Recede instead.
  'titleBar.inactiveBackground': ref('bgSunken'),

  // Chart series colours, spread across the same six warm hues used for
  // bracket-pair levels so a multi-series chart is readable. charts.lines is
  // a gridline, not a data series, so it gets a neutral instead of joining
  // the rotation. charts.foreground is the only remaining charts key and
  // resolves via the generic foreground rule; between these overrides and
  // that rule nothing was left for a `^charts\.` rule to match, so the one
  // that used to sit in `rules` has been deleted.
  'charts.red': ref('error'),
  'charts.orange': ref('accent'),
  'charts.yellow': ref('warning'),
  'charts.green': ref('success'),
  'charts.blue': ref('info'),
  'charts.purple': ref('modified'),
  'charts.lines': ref('fgFaint'),

  // --- Fix round 2 (task-4 review) ---

  // editorError/Warning/Info.background: the word-rule family gave these the
  // same full-saturation colour as their .foreground squiggle sibling
  // (foreground and background both matched word('error'/'warning'/'info')),
  // so the squiggle was invisible against its own fill. Foreground stays the
  // full colour; background becomes a low-alpha tint.
  //
  // Be clear about what the alpha does and does not achieve. This project
  // emits opaque 6-digit hex by design: resolveRef composites every alpha
  // down over its `on` role (bg unless stated) before the value is written,
  // and the tests assert that shape. The schema asks for these 33 keys to be
  // non-opaque "so as not to hide underlying decorations", and this theme
  // therefore cannot satisfy that request. What the alpha buys is a tint
  // computed over the editor background, so the emitted colour is exactly
  // right wherever the key paints directly on the editor canvas - which is
  // the common case - and wrong only in that it will occlude a decoration
  // painted underneath it instead of letting it show through.
  'editorError.background': ref('error', 0.15),
  'editorWarning.background': ref('warning', 0.15),
  'editorInfo.background': ref('info', 0.15),

  // Minimap slider: round 1 only overrode the base state (fgFaint, 0.3),
  // leaving hover/active to the generic Hover/ActiveBackground rules
  // (bgSelect at 0.5/1.0) - a different role entirely, and one that happened
  // to render *darker* than the base state, so hovering visually dimmed the
  // slider. Mirrors the sibling scrollbarSlider.* treatment above: same
  // role, ascending alpha for background < hover < active.
  'minimapSlider.background': ref('fgFaint', 0.3),
  'minimapSlider.hoverBackground': ref('fgFaint', 0.5),
  'minimapSlider.activeBackground': ref('fgFaint', 0.7),

  // Inlay hints: round 1 muted the base foreground but missed that
  // "parameter" and "type" hints are the two most common variants in
  // practice (inferred types, parameter-name hints) and were still at full
  // foreground brightness, making them indistinguishable from real code.
  'editorInlayHint.parameterForeground': ref('fgMuted'),
  'editorInlayHint.typeForeground': ref('fgMuted'),

  // Menu separator: caught by the chrome-surface family rule as if
  // "separatorBackground" were itself a surface name, making it identical to
  // menu.background (the only "...separatorBackground" key in the schema).
  // Not bgSunken: bgSunken and bgRaised are both tiny lightness deltas off
  // the same base (see palette.ts), so contrast between them is always weak
  // (~1.09) - a systematically bad choice for any separator that sits on a
  // raised chrome surface. fgFaint gives a properly visible thin line.
  'menu.separatorBackground': ref('fgFaint'),

  // --- Fix round 3 (final whole-branch review) ---

  // Renamed and submodule are the two git decorations no status word rule
  // reaches ("renamed" and "submodule" are not status words, and the broad
  // `^git(Decoration)?\.` rule that used to sit in `rules` was shadowed by
  // the generic foreground rule and matched nothing, so it has been
  // deleted). They were rendering as plain foreground, i.e. as if the file
  // were untouched. Each gets a hue no other git decoration uses: added and
  // untracked are success, modified is modified, deleted and conflicting are
  // error, ignored is fgFaint.
  'gitDecoration.renamedResourceForeground': ref('info'),
  'gitDecoration.submoduleResourceForeground': ref('accent'),

  // The Install button. "prominent" is the whole point of the key, but it
  // was resolving to bgRaised via the generic background rule - identical to
  // the plain extensionButton.background beside it. Give it the same
  // accent/dark-text/bright-hover treatment as button.* above.
  'extensionButton.prominentBackground': ref('accent'),
  'extensionButton.prominentForeground': ref('bg'),
  'extensionButton.prominentHoverBackground': ref('accentBright'),

  // Settings-editor input surfaces. These are the settings UI's own copies of
  // dropdown/input, but the generic background rule sent them to bgRaised
  // while dropdown.background and input.background are pinned to bgOverlay,
  // so a dropdown in Settings did not look like a dropdown anywhere else.
  'settings.dropdownBackground': ref('bgOverlay'),
  'settings.textInputBackground': ref('bgOverlay'),
  'settings.numberInputBackground': ref('bgOverlay'),
  'settings.checkboxBackground': ref('bgOverlay'),

  // Validation-message borders. word('error'/'warning'/'info') painted the
  // border and the fill the same colour, so the message box had no edge at
  // all. The Bright variant of the same hue keeps the semantic and draws a
  // visible rim around the fill.
  'inputValidation.errorBorder': ref('errorBright'),
  'inputValidation.warningBorder': ref('warningBright'),
  'inputValidation.infoBorder': ref('infoBright'),

  // 3-way merge editor conflict outlines. All four fell through to the
  // generic Border rule and were one dark hex, so neither "is this conflict
  // resolved" nor "is this the pane I am in" was readable. Hue carries the
  // handled/unhandled semantic (matching the minimapOverViewRuler pair
  // above); alpha carries focus, dimming the outline of the pane that does
  // not have focus.
  'mergeEditor.conflict.handledFocused.border': ref('success', 0.7),
  'mergeEditor.conflict.handledUnfocused.border': ref('success', 0.35),
  'mergeEditor.conflict.unhandledFocused.border': ref('warning', 0.7),
  'mergeEditor.conflict.unhandledUnfocused.border': ref('warning', 0.35),

  // --- Residual cleanup (pre-merge) ---

  // Status-bar mode indicators. All three resolved to bgRaised via the
  // chrome-surface rule, i.e. to exactly statusBar.background, so none of
  // them existed as a signal. Debugging is the important one: VSCode
  // recolours the entire status bar for the duration of a debug session,
  // and a mode indicator that is invisible is the same defect class as the
  // breakpoint icons. It takes the full accent (6.09 against the normal
  // bar) with dark text on top, matching how every other saturated fill in
  // this theme is handled. No-folder is an idle state rather than an alert,
  // so it gets a muted modified wash instead of a saturated one, still 2.37
  // clear of the normal bar and carrying its light label at 4.95.
  'statusBar.debuggingBackground': ref('accent'),
  'statusBar.debuggingForeground': ref('bg'),
  'statusBar.noFolderBackground': ref('modified', 0.5),
  // A "prominent" item that is the same colour as the bar it sits in is not
  // prominent. Accent wash rather than the full accent, because unlike the
  // debugging state this is one chip among many and must not outshout the
  // error and warning chips beside it. The hover state has to be raised in
  // step, or hovering would visibly darken the chip.
  'statusBarItem.prominentBackground': ref('accent', 0.45),
  'statusBarItem.prominentHoverBackground': ref('accent', 0.6),

  // Notebook cell selection. Both fell through to the generic background
  // rule and landed on bgRaised - exactly notebook.editorBackground - so
  // neither the focused cell nor a selected one was marked at all. Given
  // the same two values as the equivalent list row states, so a selected
  // notebook cell and a selected explorer row read the same way: neutral
  // bgSelect for the focused one, warm accent wash for selected-not-focused.
  'notebook.focusedCellBackground': ref('bgSelect'),
  'notebook.selectedCellBackground': ref('accent', 0.18),

  // 3-way merge editor change bands and their word highlights - Critical
  // 2's stacked-layer defect again, under different key names. The band is
  // the changed region, the "....word.background" key is the changed words
  // inside it, so the word value must be both different from and brighter
  // than its band. change.* was inverted (the word highlight resolved
  // darker than its own band, reading as a hole punched in it) and
  // changeBase.* had collapsed to one value. The base pane shows the common
  // ancestor rather than either side of the merge, so it takes a neutral
  // wash instead of joining the input1/input2 hue pair.
  'mergeEditor.change.word.background': tint('modified', ...TINT_WORD),
  // The base pane is deliberately neutral rather than hued, so these two stay
  // alpha composites of a surface role. Alpha is workable here precisely
  // because bgSelect is a dark warm neutral, not a bright accent - but only
  // just: above 0.5 the word fill drops below AA, which is where it used to
  // sit at 0.8 (4.08:1).
  'mergeEditor.changeBase.background': ref('bgSelect', 0.35),
  'mergeEditor.changeBase.word.background': ref('bgSelect', 0.5),
}

/** Ordered fallback rules. First match wins. Later entries are broader. */
const rules: ReadonlyArray<readonly [RegExp, ColorRef | null]> = [
  // Diff and merge.
  //
  // Both paint layers that stack, and a layer only renders if it differs from
  // the one beneath it. Diff has two: a whole-line wash ("...LineBackground",
  // the schema's "lines that got inserted") and, on top of it, the
  // character-level highlight of what actually changed within the line
  // ("...TextBackground", "text that got inserted"), plus an optional rim
  // around that ("...TextBorder"). One alpha for the whole family collapsed
  // all three, so intra-line diff highlighting did not render at all. Three
  // ascending alphas of the same hue, most specific pattern first.
  // Tints, not alpha composites. These fills sit directly under code, and at
  // the alphas they used to carry (0.28 word, 0.12 line) four syntax colours
  // dropped below AA on the inserted fill and comments fell to 1.29:1.
  //
  // Three stacked levels, ordered most specific first: the outline around the
  // changed characters, the fill behind those characters, then the wash across
  // the whole changed line.
  [/^diffEditor\.removedTextBorder$/, tint('error', ...TINT_EDGE)],
  [/^diffEditor\.removedText/, tint('error', ...TINT_WORD)],
  [/^diffEditor\.removed/, tint('error', ...TINT_LINE)],
  [/^diffEditor\.insertedTextBorder$/, tint('success', ...TINT_EDGE)],
  [/^diffEditor\.insertedText/, tint('success', ...TINT_WORD)],
  [/^diffEditor\.inserted/, tint('success', ...TINT_LINE)],
  // A moved block and the moved block you are looking at are different
  // things; the accent marks the active one.
  [/^diffEditor\.moveActive\./, ref('accent', 0.6)],
  [/^diffEditor\./, ref('bgSelect', 0.3)],
  // Merge stacks the same way: the header band is the conflict's visual
  // anchor and has to read above the content band it introduces, so each
  // side's header takes double the content alpha of the same hue.
  // Header bands take the word-level tint and content the line-level one, so
  // the header still reads as the louder of the pair. Both are hue-carrying
  // tints for the same reason as the diff fills: at the alphas these used to
  // carry, the two header bands sat at 2.33:1 and 2.68:1.
  [/^merge\.currentHeader/, tint('info', ...TINT_WORD)],
  [/^merge\.current/, tint('info', ...TINT_LINE)],
  [/^merge\.incomingHeader/, tint('accent', ...TINT_WORD)],
  [/^merge\.incoming/, tint('accent', ...TINT_LINE)],
  [/^merge\.commonHeader/, ref('bgSelect', 0.5)],
  [/^merge\./, ref('bgSelect', 0.3)],

  // Status semantics, before the generic family rules
  [word('error', 'invalid'), ref('error')],
  [word('warning'), ref('warning')],
  [word('success', 'added', 'inserted'), ref('success')],
  [word('info', 'information'), ref('info')],
  // NOTE: 'changed' also matches inside "unchanged" (diffEditor.unchanged-
  // RegionForeground/Background), which would misclassify the "N hidden
  // lines" label as a change indicator. That's safe only because the
  // `^diffEditor\.` rules above run first and catch those keys before this
  // one is ever reached - do not reorder without re-checking that key.
  [word('modified', 'changed'), ref('modified')],
  [word('deleted', 'removed', 'conflicting'), ref('error')],
  [word('ignored'), ref('fgFaint')],
  [word('untracked'), ref('success')],

  // Selection and interaction states. Case-insensitive first letters because
  // VSCode spells these keys lowercase ("list.activeSelectionBackground");
  // the original capital-only patterns for the four Selection rules never
  // matched a real key. Inactive is listed before Active throughout: once
  // case is folded, "inactiveFoo" ends with "activeFoo", so testing Active
  // first silently swallows every Inactive key. This ordering bug, plus the
  // capitalisation bug, was the root cause of most of the task-4 review's
  // active/inactive findings.
  //
  // Unfocused: the second axis, orthogonal to active/inactive. It means "this
  // editor group does not have keyboard focus", and every one of these
  // suffixes also ends with an active/inactive/hover suffix, so these rules
  // must sit above that whole block or they are shadowed by it and a split
  // view gives no clue which side you are typing into.
  [/[Uu]nfocusedActiveBackground$/, ref('bgSelect', 0.6)],
  [/[Uu]nfocusedActiveBorder$/, ref('accent', 0.5)],
  [/[Uu]nfocusedActiveForeground$/, ref('fg')],
  [/[Uu]nfocusedInactiveBackground$/, ref('bgRaised', 0.5)],
  // Not fgFaint. This is a filename, and fgFaint on the already-recessed
  // unfocused inactive tab background measured 2.30:1 - below the 2.37:1
  // that is deliberately reserved for comments and line numbers, the two
  // things in this theme that are *meant* to be hard to read. A dimmed
  // fgMuted keeps the label above that floor at 4.50:1 while staying
  // clearly darker than both tab.inactiveForeground (plain fgMuted, the
  // focused group's version of this same state) and the 10.50:1 of
  // tab.unfocusedActiveForeground, so the focus distinction still reads.
  [/[Uu]nfocusedInactiveForeground$/, ref('fgMuted', 0.8)],
  [/[Uu]nfocusedHoverBackground$/, ref('bgSelect', 0.3)],
  [/[Uu]nfocusedHoverBorder$/, ref('bgSunken', 0.5)],
  [/[Uu]nfocusedHoverForeground$/, ref('fgSubtle')],

  [/[Ii]nactiveSelectionIconForeground$/, ref('fgMuted')],
  [/[Aa]ctiveSelectionIconForeground$/, ref('fgBright')],
  // Four list row states are on screen at once while dragging a file over a
  // tree that already has a selection and a hovered row: active selection,
  // inactive selection, hover and drop target. All four must differ from
  // each other, and lightness alone cannot do it - every dark surface role
  // here is a small delta off the same base, so bg to bgSelect spans only
  // about 1.42 in contrast, which four values cannot divide.
  //
  // So the four are separated on two axes at once. Hue splits them into
  // pairs: hover and the focused selection stay neutral, the unfocused
  // selection takes a warm accent wash and the drop target takes jade -
  // the same trick the theme already uses for find matches (warning) and
  // word highlights (accent). Lightness then separates within and across
  // those pairs, and the alphas below are the values that maximise the
  // *weakest* of the six pairs rather than any single one: every pair now
  // measures at least 1.114, against 1.036 before. The two weakest pairs
  // are both hue crossings, which is the trade being made deliberately.
  [/[Ii]nactiveSelectionBackground$/, ref('accent', 0.18)],
  [/[Aa]ctiveSelectionBackground$/, ref('bgSelect')],
  [/[Ii]nactiveSelectionForeground$/, ref('fg')],
  [/[Aa]ctiveSelectionForeground$/, ref('fgBright')],

  // Selection/match states that live *inside* a chrome/overlay/editor
  // surface, not tied to active/inactive. Must sit above the surface-family
  // rules further down, or e.g. "menu.selectionBackground" gets matched as
  // if "selectionBackground" were itself a surface name and ends up
  // identical to menu.background.
  [/[Ss]elect(ed|ion)Background$/, ref('bgSelect')],
  [/[Mm]atchHighlightBackground$/, ref('warning', 0.25)],
  [/[Ff]ilterMatchBackground$/, ref('warning', 0.25)],
  // Jade, not accent: the drop target used to share the accent with the
  // unfocused selection above and sat 1.038 from it, so during a drag the
  // thing you are dropping onto and a row that merely happened to be
  // selected were the same colour. See the four-state note above.
  [/[Dd]ropBackground$/, ref('info', 0.35)],

  [/[Hh]overBackground$/, ref('bgSelect', 0.5)],
  [/[Hh]overForeground$/, ref('fgBright')],
  [/[Ff]ocusBackground$/, ref('bgSelect', 0.6)],
  // Dimmed with the rest of the accent borders. This one follows the cursor
  // down the explorer tree, so at full strength it was the most persistently
  // distracting outline in the theme.
  [/[Ff]ocusOutline$/, ref('accent', 0.6)],

  // Interactive-cell code border: not caught by any generic Border rule
  // (it ends "...CodeBorder", not "...ctiveBorder"), so without this pair
  // both states fell through to the same bottom-of-list generic Border rule.
  [/[Ii]nactiveCodeBorder$/, ref('bgSunken')],
  [/[Aa]ctiveCodeBorder$/, ref('accent', 0.6)],

  [/[Ii]nactiveBorder$/, ref('bgSunken')],
  // Dimmed from full accent. This one pattern paints every "...ActiveBorder"
  // key, so at full strength around twenty surfaces all outlined themselves
  // in the brightest colour in the palette at once and competed with each
  // other. At 0.6 they still mark active state without shouting. The two
  // that genuinely aid orientation, tab.activeBorder and
  // activityBar.activeBorder, are pinned to full accent in the overrides.
  [/[Aa]ctiveBorder$/, ref('accent', 0.6)],
  [/[Ii]nactiveForeground$/, ref('fgMuted')],
  [/[Aa]ctiveForeground$/, ref('fgBright')],
  [/[Ii]nactiveBackground$/, ref('bgRaised')],
  [/[Aa]ctiveBackground$/, ref('bgSelect')],

  // Indent guide depth levels 2-6 (level 1 and the unsuffixed key are exact
  // overrides above). Numbered suffix means they don't end in "...Background"
  // so the generic background rules below never see them; widen here instead
  // of listing five near-duplicate overrides per side.
  [/^editorIndentGuide\.activeBackground\d/, ref('fgFaint')],
  [/^editorIndentGuide\.background\d/, ref('fgFaint', 0.3)],

  // Chrome surfaces
  [
    /^(activityBar|activityBarTop|sideBar|sideBarSectionHeader|sideBarTitle|statusBar|panel|panelSection|panelSectionHeader|titleBar|menubar|menu|banner|commandCenter|auxiliaryBar)[A-Za-z]*\.[a-zA-Z]*[Bb]ackground$/,
    ref('bgRaised'),
  ],
  // Overlay surfaces
  [
    /^(input|inputOption|inputValidation|dropdown|quickInput|quickInputList|editorWidget|editorSuggestWidget|editorHoverWidget|peekViewEditor|peekViewResult|notifications|notificationCenter|notificationToast|debugToolBar|keybindingTable|editorActionList|inlineChat|chat|walkThrough|welcomePage)[A-Za-z]*\.[a-zA-Z]*[Bb]ackground$/,
    ref('bgOverlay'),
  ],
  // Editor-adjacent surfaces
  [
    /^(editor|editorGroup|editorGroupHeader|editorPane|editorGutter|breadcrumb|breadcrumbPicker|tab|minimap)[A-Za-z]*\.[a-zA-Z]*[Bb]ackground$/,
    ref('bg'),
  ],

  // Icon families.
  //
  // Every key here ends in "Foreground", so all of them must sit above the
  // generic foreground rule or they resolve to one flat neutral - which is
  // exactly what happened: all 33 symbolIcon.* and all 15 debugIcon.* keys
  // painted the same hex, so an enabled breakpoint looked identical to a
  // disabled one and the outline view was monochrome.
  //
  // These are deliberately narrow rather than a single `^debugIcon|^symbolIcon`
  // prefix pair moved up wholesale. The families they belong to (debug*,
  // testing*) also contain widget surfaces - debugToolBar.background,
  // debugExceptionWidget.*, testing.peekHeaderBackground - which must keep
  // reaching the surface rules above, so only the icon keys are claimed here.

  // Debug toolbar and breakpoint gutter icons. Breakpoints: armed is an
  // error-red dot, disabled and unverified recede (VSCode's own defaults
  // treat those two identically), and the stack-frame arrows are their own
  // pair - the frame you are stopped in is amber, other frames green.
  [/^debugIcon\.breakpoint(Disabled|Unverified)/, ref('fgFaint')],
  [/^debugIcon\.breakpointCurrentStackframe/, ref('warning')],
  [/^debugIcon\.breakpointStackframe/, ref('success')],
  [/^debugIcon\.breakpoint/, ref('error')],
  // Transport controls, grouped by what they do rather than all painted
  // alike: go is success, hold is warning, end is error, restart is info,
  // and the four step actions share the accent.
  [/^debugIcon\.(start|continue)/, ref('success')],
  [/^debugIcon\.pause/, ref('warning')],
  [/^debugIcon\.(stop|disconnect)/, ref('error')],
  [/^debugIcon\.restart/, ref('info')],
  [/^debugIcon\.step/, ref('accent')],

  // Outline and suggest-list symbol icons. Grouped to agree with the
  // TextMate rules in scopes.ts, so a symbol's icon in the outline and the
  // same symbol in the code carry the same hue: types are infoBright (the
  // Type rule), callables warningBright (Function), literals modifiedBright
  // (Constant), strings success (String), names fg (Variable), and keywords
  // accent (Keyword). Anchored on the full suffix so "enumerator" cannot
  // swallow "enumeratorMember" and "key" cannot swallow "keyword".
  // The remainder - array, colour, file, folder, unit, reference, snippet -
  // carry no syntax meaning and are left to the generic foreground rule.
  [
    /^symbolIcon\.(class|interface|struct|enumerator|typeParameter|namespace|module|package|object)Foreground$/,
    ref('infoBright'),
  ],
  [/^symbolIcon\.(function|method|constructor|event)Foreground$/, ref('warningBright')],
  [/^symbolIcon\.(constant|enumeratorMember|number|boolean|null)Foreground$/, ref('modifiedBright')],
  [/^symbolIcon\.(keyword|operator)Foreground$/, ref('accent')],
  [/^symbolIcon\.(string|text)Foreground$/, ref('success')],
  [/^symbolIcon\.(variable|field|property|key)Foreground$/, ref('fg')],

  // Generic families, broadest last.
  //
  // Four rules that used to live in this block matched nothing and have been
  // deleted: `Stroke$`, `^charts\.`, `^terminal\.` and `^git(Decoration)?\.`.
  // Each was claimed first either by an exact override or by a broader rule
  // above it, so none of them ever produced a colour. See the tree indent
  // guide, charts and gitDecoration override comments for what replaced them.
  [/[Bb]order([A-Z][a-z]+)?$/, ref('bgSunken')],
  [/[Ss]hadow$/, ref('bgSunken', 0.5)],
  [/[Hh]ighlight$/, ref('accent', 0.2)],
  [/[Oo]utline$/, ref('accent', 0.6)],
  [/[Bb]ackground$/, ref('bgRaised')],
  // fgSubtle, not fg. Anything reaching this rule is unclassified chrome
  // text, and in a theme whose whole point is calm it should not be painted
  // in the brightest neutral the palette has. fgSubtle still clears AA by a
  // wide margin (12.35:1 on the editor background); fg is reserved for real
  // body text, which the keys that carry it name explicitly above.
  [/[Ff]oreground$/, ref('fgSubtle')],
  [/^(debug|testing|symbolIcon)/, ref('fgSubtle')],
]

/**
 * The exact keys `overrides` claims, in declaration order.
 *
 * Exported so a test can assert every one of them is a real schema key. An
 * override naming a key the schema does not define is silently dead: nothing
 * in the build ever looks it up, so it costs coverage without any signal.
 * Only the key set is exposed - the `ColorRef` values stay private.
 */
export const overrideKeys: readonly string[] = Object.keys(overrides)

/**
 * The match pattern of each fallback rule, in `rules` order.
 *
 * Exported so a test can assert every rule is reachable: that some schema key
 * is neither an override nor claimed by an earlier pattern. A rule shadowed by
 * a broader one above it matches nothing at build time and its intent is lost
 * silently. Only the patterns are exposed - the `ColorRef` values stay private.
 */
export const rulePatterns: readonly RegExp[] = rules.map(([pattern]) => pattern)

export function resolveKey(key: string): ColorRef | null | undefined {
  if (key in overrides) return overrides[key]
  for (const [pattern, value] of rules) {
    if (pattern.test(key)) return value
  }
  return undefined
}
