import type { RoleName } from './types'

export interface CaptureRule {
  role: RoleName
  italic?: boolean
  bold?: boolean
}

/**
 * Tree-sitter capture names, the third syntax vocabulary this theme speaks.
 *
 * scopes.ts covers TextMate scopes and semantic.ts covers LSP semantic tokens;
 * this covers what Zed uses instead of both. The role each capture gets is
 * copied from the other two rather than chosen again, so the same construct
 * carries the same hue in every editor: types are jade, callables amber,
 * literals salmon, strings green, keywords orange, and comments recede.
 *
 * The list is shorter than the capture names in circulation because Zed falls
 * back along the dotted prefix (see `resolveCapture`), so `function` already
 * covers `function.method.call`. A capture appears here only when it needs a
 * colour its parent does not give it.
 */
const rules: Record<string, CaptureRule> = {
  comment: { role: 'fgFaint', italic: true },

  keyword: { role: 'accent' },
  // The older capture vocabulary, from before grammars settled on `keyword.*`.
  // The make grammar still emits all four, and because they are roots rather
  // than children of `keyword`, nothing falls back to it for them. Its own
  // highlights.scm notes the same thing about `repeat` and remaps around it.
  conditional: { role: 'accent' },
  exception: { role: 'accent' },
  include: { role: 'accent' },
  repeat: { role: 'accent' },
  preproc: { role: 'accent' },
  tag: { role: 'accent' },
  selector: { role: 'accent' },
  // A pseudo-selector is not the element, so it separates from `selector` the
  // same way an attribute separates from the tag it sits on.
  'selector.pseudo': { role: 'modified' },
  attribute: { role: 'modified' },
  label: { role: 'modified' },

  function: { role: 'warningBright' },
  // `satisfies` because TypeScript resolves an object-literal key named
  // `constructor` against Object.prototype rather than the index signature,
  // and so never applies CaptureRule as the contextual type.
  constructor: { role: 'warningBright' } satisfies CaptureRule,

  type: { role: 'infoBright' },
  enum: { role: 'infoBright' },
  namespace: { role: 'infoBright' },
  // Some grammars say `module` where others say `namespace`; neither falls
  // back to the other, so both have to be named.
  module: { role: 'infoBright' },

  string: { role: 'success' },
  // A char literal is a string in every grammar that has one, but `character`
  // is a root capture and so cannot inherit from `string`.
  character: { role: 'success' },
  // Escapes and regexes are structure inside a string rather than more string,
  // which is the same split the TextMate rules make by giving both to the
  // constant colour.
  'string.escape': { role: 'modifiedBright' },
  'string.regex': { role: 'modifiedBright' },
  // Grammars are split between `regex` and `regexp`, and the second would
  // otherwise fall back to plain `string`.
  'string.regexp': { role: 'modifiedBright' },
  'string.special': { role: 'modifiedBright' },

  number: { role: 'modifiedBright' },
  float: { role: 'modifiedBright' },
  boolean: { role: 'modifiedBright' },
  constant: { role: 'modifiedBright' },
  symbol: { role: 'modifiedBright' },
  variant: { role: 'modifiedBright' },

  variable: { role: 'fg' },
  property: { role: 'fg' },
  field: { role: 'fg' },
  embedded: { role: 'fg' },
  primary: { role: 'fg' },
  'variable.parameter': { role: 'fgSubtle' },
  parameter: { role: 'fgSubtle' },
  // `self`, `this`, and the interpolation sigils - names the language reserves
  // rather than ones the author chose.
  'variable.special': { role: 'modified' },

  operator: { role: 'fgSubtle' },
  punctuation: { role: 'fgMuted' },
  // The braces of an interpolation, which mark where the language resumes.
  'punctuation.special': { role: 'modified' },
  // A markdown bullet is the list, not punctuation inside a sentence.
  'punctuation.list_marker': { role: 'accent' },

  // Ghost text: what the editor is proposing, not what the file says.
  predictive: { role: 'fgFaint', italic: true },
  hint: { role: 'fgMuted' },

  // Markup
  title: { role: 'accent', bold: true },
  emphasis: { role: 'fg', italic: true },
  'emphasis.strong': { role: 'fgBright', bold: true },
  'text.literal': { role: 'modifiedBright' },
  link_text: { role: 'info' },
  link_uri: { role: 'info' },
  'diff.plus': { role: 'success' },
  'diff.minus': { role: 'error' },

  // Severity a grammar raises over otherwise plain text: the arguments of
  // make's $(error), $(warning) and $(info), and a token the grammar itself
  // rejects. They take the status roles so a warning in a Makefile reads the
  // same as a warning anywhere else in the editor.
  error: { role: 'error' },
  'text.danger': { role: 'error' },
  'text.warning': { role: 'warning' },
  'text.note': { role: 'info' },
}

export const captureRules: Readonly<Record<string, CaptureRule>> = rules

/**
 * The rule Zed would use for a capture, including its dotted-prefix fallback.
 *
 * Zed resolves a capture to the longest defined name that is a prefix of it on
 * a dot boundary, so `function.method.call` is styled by `function` unless
 * something more specific is defined. Mirrored here so a test can ask what a
 * given capture will actually be painted, rather than only whether its exact
 * name appears in the table.
 */
export function resolveCapture(capture: string): CaptureRule | undefined {
  for (let name = capture; ; ) {
    const rule = rules[name]
    if (rule !== undefined) return rule
    const dot = name.lastIndexOf('.')
    if (dot === -1) return undefined
    name = name.slice(0, dot)
  }
}
