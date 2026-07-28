import type { RoleName } from './types'

/** Kept deliberately in step with the TextMate mapping in scopes.ts. */
export const semanticRules: Record<string, RoleName> = {
  namespace: 'infoBright',
  class: 'infoBright',
  interface: 'infoBright',
  type: 'infoBright',
  typeParameter: 'infoBright',
  enum: 'infoBright',
  struct: 'infoBright',

  function: 'warningBright',
  method: 'warningBright',
  macro: 'warningBright',

  keyword: 'accent',
  modifier: 'accent',

  string: 'success',
  number: 'modifiedBright',
  regexp: 'modifiedBright',
  enumMember: 'modifiedBright',

  variable: 'fg',
  property: 'fg',
  parameter: 'fgSubtle',
  operator: 'fgSubtle',

  comment: 'fgFaint',
}
