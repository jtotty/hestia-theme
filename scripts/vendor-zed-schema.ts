import { readFile, writeFile } from 'node:fs/promises'

/*
 * The Zed counterpart of vendor-schema.ts, and it exists for the same reason:
 * the build fails on any vendored key with no role mapping, so the list has to
 * be the full set of keys the editor honours. A key missing from it is a key
 * the theme never sets, and Zed then paints its own default there - which in an
 * all-warm theme means a cool blue nothing can catch, because nothing knows the
 * key exists.
 *
 * Three sources are merged. None is sufficient alone.
 */

/*
 * Source 1: the schema Zed publishes. It carries the real descriptions, which
 * is why it is the base, but it lags the shipping editor - the installed
 * binary honours whole families it has never heard of (see EXTRAS).
 */
const SCHEMA_URL = 'https://zed.dev/schema/themes/v0.2.0.json'

/*
 * Source 2: the themes Zed bundles, read out of the installed binary. These are
 * complete theme JSONs embedded verbatim, so unlike the field-name string table
 * next to them they parse exactly. Whatever One, Ayu and Gruvbox set is a key
 * the shipping editor honours, published schema or not.
 *
 * Override with ZED_BINARY to vendor from a different install.
 */
const BINARIES = ['/Applications/Zed.app/Contents/MacOS/zed']

/*
 * Source 3: keys the installed binary honours that neither of the other two
 * names - either because the published schema predates them or because none of
 * Zed's own themes happens to set them.
 *
 * They are listed by hand because they cannot be discovered mechanically. The
 * binary does hold the field-name list, but as one concatenated string table
 * with no delimiters and with shared substrings elided, so it can be read as a
 * membership test and not as an enumeration. That is exactly how it is used
 * here: every name below is checked against the binary and the script throws if
 * one is missing, so a Zed upgrade that drops a family fails loudly rather than
 * vendoring a name the editor no longer knows.
 */
const EXTRAS = [
  'element.selection_background',
  'drop_target.border',
  'debugger.accent',
  'panel.overlay_background',
  'panel.overlay_hover',
  'minimap.thumb.background',
  'minimap.thumb.hover_background',
  'minimap.thumb.active_background',
  'minimap.thumb.border',
  'editor.debugger_active_line.background',
  'editor.diff_hunk.added.background',
  'editor.diff_hunk.added.hollow_background',
  'editor.diff_hunk.added.hollow_border',
  'editor.diff_hunk.deleted.background',
  'editor.diff_hunk.deleted.hollow_background',
  'editor.diff_hunk.deleted.hollow_border',
  'version_control.added',
  'version_control.deleted',
  'version_control.modified',
  'version_control.renamed',
  'version_control.conflict',
  'version_control.ignored',
  'version_control.word_added',
  'version_control.word_deleted',
  'version_control.conflict_marker.ours',
  'version_control.conflict_marker.theirs',
  'version_control_conflict_ours_background',
  'version_control_conflict_theirs_background',
  'vim.normal.background',
  'vim.normal.foreground',
  'vim.insert.background',
  'vim.insert.foreground',
  'vim.replace.background',
  'vim.replace.foreground',
  'vim.visual.background',
  'vim.visual.foreground',
  'vim.visual_line.background',
  'vim.visual_line.foreground',
  'vim.visual_block.background',
  'vim.visual_block.foreground',
  'vim.yank.background',
  'vim.helix_normal.background',
  'vim.helix_normal.foreground',
  'vim.helix_select.background',
  'vim.helix_select.foreground',
  'vim.helix_jump_label.foreground',
] as const

/*
 * Properties of a theme's `style` object that are not a single colour, and so
 * are not part of the colour key list the build walks. Each is emitted by its
 * own code path in src/zed.ts.
 */
const NON_COLOR = new Set(['background.appearance', 'players', 'accents', 'syntax'])

interface Property {
  type: string
  description: string
  format: string
}

interface ThemeFamily {
  name: string
  themes: { name: string; style: Record<string, unknown> & { syntax?: Record<string, unknown> } }[]
}

/** Every JSON object in the binary whose first property is the theme `$schema`. */
function embeddedThemeFamilies(binary: Buffer): ThemeFamily[] {
  const MARKER = Buffer.from('"$schema": "https://zed.dev/schema/themes')
  const families: ThemeFamily[] = []

  for (let at = binary.indexOf(MARKER); at !== -1; at = binary.indexOf(MARKER, at + 1)) {
    const start = binary.lastIndexOf(0x7b, at)
    let depth = 0
    let inString = false
    let escaped = false
    let end = start
    for (; end < binary.length; end++) {
      const byte = binary[end]
      if (inString) {
        if (escaped) escaped = false
        else if (byte === 0x5c) escaped = true
        else if (byte === 0x22) inString = false
        continue
      }
      if (byte === 0x22) inString = true
      else if (byte === 0x7b) depth++
      else if (byte === 0x7d && --depth === 0) break
    }
    families.push(JSON.parse(binary.subarray(start, end + 1).toString('utf8')) as ThemeFamily)
  }
  return families
}

async function readBinary(): Promise<{ path: string; binary: Buffer }> {
  const candidates = process.env.ZED_BINARY ? [process.env.ZED_BINARY] : BINARIES
  for (const path of candidates) {
    try {
      return { path, binary: await readFile(path) }
    } catch {
      // Try the next install.
    }
  }
  throw new Error(
    `No Zed binary found. Looked in:\n  ${candidates.join('\n  ')}\n` +
      `Set ZED_BINARY to the path of a Zed executable.`,
  )
}

// The fetch and the binary read are independent, and the binary is large
// enough that overlapping them is worth the one line.
const [res, { path, binary }] = await Promise.all([fetch(SCHEMA_URL), readBinary()])
if (!res.ok) throw new Error(`Schema fetch failed: ${res.status}`)

const published = (await res.json()) as {
  definitions: { ThemeStyleContent: { properties: Record<string, Property> } }
}
const properties: Record<string, Property> = {}
for (const [key, property] of Object.entries(published.definitions.ThemeStyleContent.properties)) {
  if (!NON_COLOR.has(key)) properties[key] = property
}
if (Object.keys(properties).length < 138) {
  throw new Error(`Suspiciously few keys in the published schema: ${Object.keys(properties).length}`)
}

const publishedCount = Object.keys(properties).length

const families = embeddedThemeFamilies(binary)
const bundled = new Set<string>()
for (const family of families) {
  for (const theme of family.themes) {
    for (const key of Object.keys(theme.style)) {
      if (!NON_COLOR.has(key)) bundled.add(key)
    }
  }
}
if (bundled.size < 140) {
  throw new Error(
    `Only ${bundled.size} colour keys recovered from ${families.length} bundled theme ` +
      `families in the binary. The embedded themes are the authority here, so a short ` +
      `list means the extraction broke - fix it rather than vendoring a truncated one.`,
  )
}

const missing = EXTRAS.filter((key) => !binary.includes(key))
if (missing.length > 0) {
  throw new Error(
    `The installed Zed no longer mentions ${missing.length} of the hand-listed extra ` +
      `key(s):\n  ${missing.join('\n  ')}\n` +
      `Confirm against the current Zed before removing them from EXTRAS.`,
  )
}

const fromBundled = [...bundled].filter((key) => !(key in properties)).sort()
for (const key of fromBundled) {
  properties[key] = {
    type: 'string',
    description: `Set by Zed's own bundled themes but absent from the published schema.`,
    format: 'color-hex',
  }
}
const fromExtras = EXTRAS.filter((key) => !(key in properties))
for (const key of fromExtras) {
  properties[key] = {
    type: 'string',
    description: `Present in the installed Zed but named by neither the published schema nor Zed's bundled themes.`,
    format: 'color-hex',
  }
}

/*
 * The published schema's declaration order is preserved and the additions
 * appended, rather than the merged set being sorted, so that re-vendoring shows
 * only what actually changed. src/zed-schema.ts sorts on read, so this order
 * has no effect on the generated theme.
 */
const captures = new Set<string>()
for (const family of families) {
  for (const theme of family.themes) {
    for (const capture of Object.keys(theme.style.syntax ?? {})) captures.add(capture)
  }
}

await writeFile('schema/zed-theme-keys.json', `${JSON.stringify({ type: 'object', properties }, null, 2)}\n`)
await writeFile(
  'schema/zed-syntax-captures.json',
  `${JSON.stringify({ captures: [...captures].sort() }, null, 2)}\n`,
)
console.log(
  `Vendored ${Object.keys(properties).length} Zed colour keys: ` +
    `${publishedCount} from the published schema, ` +
    `${fromBundled.length} added from the themes bundled in ${path}, ` +
    `${fromExtras.length} added from the hand-listed extras. ` +
    `Vendored ${captures.size} syntax capture names from the same bundled themes.`,
)
