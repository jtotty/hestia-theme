import type { RoleName } from './types'

export interface TokenRule {
  name: string
  scope: string[]
  role: RoleName
  italic?: boolean
  bold?: boolean
}

/**
 * The palette offers four warm hues plus jade. VSCode syntax conventionally
 * wants six to eight. Jade carries types, because it is the one sanctioned
 * slight-cool accent in the focus palette. Everything else stays warm,
 * separating by hue where possible and by lightness where not.
 */
export const tokenRules: readonly TokenRule[] = [
  {
    name: 'Comment',
    scope: ['comment', 'punctuation.definition.comment', 'string.comment'],
    role: 'fgFaint',
    italic: true,
  },
  {
    name: 'Keyword',
    scope: [
      'keyword',
      'keyword.control',
      'keyword.operator.expression',
      'keyword.operator.new',
      'storage',
      'storage.type',
      'storage.modifier',
      'entity.name.tag',
    ],
    role: 'accent',
  },
  {
    name: 'Function',
    scope: [
      'entity.name.function',
      'support.function',
      'meta.function-call',
      'variable.function',
      'entity.name.function.member',
    ],
    role: 'warningBright',
  },
  {
    name: 'String',
    scope: [
      'string',
      'string.quoted.single',
      'string.quoted.double',
      'string.quoted.triple',
      'string.template',
      'punctuation.definition.string',
    ],
    role: 'success',
  },
  {
    name: 'Type',
    scope: [
      'entity.name.type',
      'entity.name.class',
      'entity.name.namespace',
      'entity.other.inherited-class',
      'support.type',
      'support.class',
      'meta.type.annotation',
    ],
    role: 'infoBright',
  },
  {
    name: 'Constant',
    scope: [
      'constant',
      'constant.numeric',
      'constant.language',
      'constant.character.escape',
      'string.regexp',
      'support.constant',
      'variable.other.enummember',
    ],
    role: 'modifiedBright',
  },
  {
    name: 'Variable',
    scope: [
      'variable',
      'variable.other',
      'variable.other.readwrite',
      'meta.object-literal.key',
      'support.variable.property',
      'variable.other.property',
    ],
    role: 'fg',
  },
  {
    name: 'Parameter',
    scope: ['variable.parameter', 'meta.parameter'],
    role: 'fgSubtle',
  },
  {
    name: 'Punctuation',
    scope: [
      'punctuation',
      'punctuation.separator',
      'punctuation.terminator',
      'punctuation.accessor',
      'meta.brace',
    ],
    role: 'fgMuted',
  },
  {
    name: 'Operator',
    scope: ['keyword.operator', 'keyword.operator.assignment', 'keyword.operator.arithmetic'],
    role: 'fgSubtle',
  },
  {
    name: 'Attribute',
    scope: ['entity.other.attribute-name', 'meta.attribute'],
    role: 'modified',
  },
  {
    name: 'Invalid',
    scope: ['invalid', 'invalid.illegal'],
    role: 'error',
  },
  {
    name: 'Markup heading',
    scope: ['markup.heading', 'entity.name.section'],
    role: 'accent',
    bold: true,
  },
  { name: 'Markup inserted', scope: ['markup.inserted'], role: 'success' },
  { name: 'Markup deleted', scope: ['markup.deleted'], role: 'error' },
  { name: 'Markup changed', scope: ['markup.changed'], role: 'modified' },
  { name: 'Markup link', scope: ['markup.underline.link', 'string.other.link'], role: 'info' },
]
