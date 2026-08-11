import { mkdir, writeFile } from 'node:fs/promises'
import { blend, hexToOklch, oklchToHex, withAlpha } from './color'
import { resolveRole } from './palette'
import { colorKeys } from './schema'
import { semanticRules } from './semantic'
import { tokenRules } from './scopes'
import type { ColorRef, Variant } from './types'
import { resolveKey } from './workbench'

export interface TokenColor {
  name: string
  scope: string[]
  settings: { foreground: string; fontStyle?: string }
}

export interface ThemeJson {
  name: string
  type: 'dark' | 'light'
  semanticHighlighting: true
  colors: Record<string, string>
  tokenColors: TokenColor[]
  semanticTokenColors: Record<string, string>
}

function resolveRef(value: ColorRef, variant: Variant): string {
  const base = resolveRole(value.role, variant)
  if (value.opacity !== undefined) {
    if (value.alpha !== undefined || value.tint !== undefined) {
      throw new Error(
        `A ColorRef cannot set opacity alongside alpha or tint (role "${value.role}").`,
      )
    }
    if (value.on !== undefined) {
      throw new Error(
        `A ColorRef with opacity composites nothing, so "on" is meaningless (role "${value.role}").`,
      )
    }
    return withAlpha(base, value.opacity)
  }
  if (value.tint !== undefined) {
    if (value.alpha !== undefined) {
      throw new Error(`A ColorRef cannot set both alpha and tint (role "${value.role}").`)
    }
    const surface = hexToOklch(resolveRole(value.on ?? 'bg', variant))
    return oklchToHex({
      l: surface.l + value.tint.lightness,
      c: value.tint.chroma,
      h: hexToOklch(base).h,
    })
  }
  if (value.alpha === undefined) return base
  return blend(base, resolveRole(value.on ?? 'bg', variant), value.alpha)
}

export function buildTheme(variant: Variant): ThemeJson {
  const colors: Record<string, string> = {}
  const unmapped: string[] = []

  for (const key of colorKeys) {
    const value = resolveKey(key)
    if (value === undefined) {
      unmapped.push(key)
      continue
    }
    if (value === null) continue
    colors[key] = resolveRef(value, variant)
  }

  if (unmapped.length > 0) {
    throw new Error(
      `${unmapped.length} colour key(s) have no role mapping:\n  ${unmapped.join('\n  ')}`,
    )
  }

  const tokenColors: TokenColor[] = tokenRules.map((rule) => {
    const fontStyle = [rule.italic ? 'italic' : '', rule.bold ? 'bold' : '']
      .filter(Boolean)
      .join(' ')
    return {
      name: rule.name,
      scope: rule.scope,
      settings: {
        foreground: resolveRole(rule.role, variant),
        ...(fontStyle ? { fontStyle } : {}),
      },
    }
  })

  const semanticTokenColors: Record<string, string> = {}
  for (const [token, role] of Object.entries(semanticRules)) {
    semanticTokenColors[token] = resolveRole(role, variant)
  }

  return {
    name: variant === 'dark' ? 'Hestia' : 'Hestia Light',
    type: variant,
    semanticHighlighting: true,
    colors,
    tokenColors,
    semanticTokenColors,
  }
}

async function main(): Promise<void> {
  await mkdir('themes', { recursive: true })

  const variants: Variant[] = ['dark']
  for (const variant of variants) {
    const file = variant === 'dark' ? 'hestia-color-theme.json' : 'hestia-light-color-theme.json'
    const theme = buildTheme(variant)
    await writeFile(`themes/${file}`, `${JSON.stringify(theme, null, 2)}\n`)
    console.log(
      `Wrote themes/${file}: ${Object.keys(theme.colors).length} colours, ` +
        `${theme.tokenColors.length} token rules, ` +
        `${Object.keys(theme.semanticTokenColors).length} semantic rules.`,
    )
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  await main()
}
