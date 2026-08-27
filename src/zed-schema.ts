import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

interface KeySchema {
  properties: Record<string, unknown>
}

interface CaptureList {
  captures: string[]
}

const read = <T>(file: string): T =>
  JSON.parse(readFileSync(fileURLToPath(new URL(`../schema/${file}`, import.meta.url)), 'utf8')) as T

/** Every colour key the installed Zed honours, sorted. */
export const styleKeys: readonly string[] = Object.keys(read<KeySchema>('zed-theme-keys.json').properties).sort()

/**
 * Every syntax capture Zed's own bundled themes style.
 *
 * Unlike the colour keys this is a floor, not a closed set: any tree-sitter
 * grammar can emit a capture name nobody has styled, and Zed then falls back
 * along the dotted prefix (see `resolveCapture`). What the list guarantees is
 * that nothing Zed itself considers worth colouring is left to that fallback.
 */
export const bundledCaptures: readonly string[] = read<CaptureList>('zed-syntax-captures.json').captures
