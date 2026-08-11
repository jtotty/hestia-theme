import { readFile, writeFile } from 'node:fs/promises'

/*
 * The vendored schema is the theme's definition of "every key that exists",
 * and the build fails on any key in it that has no role mapping. So the list
 * has to be complete: a key missing from it is a key the theme silently never
 * sets, which means the editor paints its own default there. In an all-warm
 * dark theme those defaults show up as cool blues and near-whites, and no test
 * can catch them because nothing knows the key exists.
 *
 * Two sources are merged, because neither is sufficient alone.
 */

/*
 * Source 1: an unofficial third-party mirror of the schema VS Code ships, not
 * a Microsoft-published artifact. It carries the real upstream descriptions,
 * which is why it is still the base. But it is updated by hand and lags real
 * VS Code, so it is a subset: anything added upstream since it was last
 * refreshed is simply absent.
 */
const SCHEMA_URL =
  'https://raw.githubusercontent.com/wraith13/vscode-schemas/master/en/latest/schemas/workbench-colors.json'

/*
 * Source 2: the colour registry of the editor actually installed on this
 * machine, read out of its bundled workbench. This is the authority, not a
 * mirror of it - it is the exact set of keys the editor will honour. Cursor is
 * listed first because it is the primary target and, being a VS Code fork, its
 * registry is a superset: it carries both upstream's keys and its own.
 *
 * Override with EDITOR_BUNDLE to vendor from a different install.
 */
const BUNDLES = [
  '/Applications/Cursor.app/Contents/Resources/app/out/vs/workbench/workbench.desktop.main.js',
  '/Applications/Visual Studio Code.app/Contents/Resources/app/out/vs/workbench/workbench.desktop.main.js',
]

interface Property {
  type: string
  description: string
  format: string
  defaultSnippets: { body: string }[]
}

/**
 * Every `f("some.dotted.id"` call in the bundle, grouped by `f`.
 *
 * The bundle is minified, so the function that registers a colour has a
 * different one- or two-character name in every release and cannot be matched
 * by name. What is stable is its call shape, and that colour ids are dotted
 * strings - so this collects every candidate and lets the caller decide which
 * identifier is the registrar.
 */
function callsByIdentifier(source: string): Map<string, Set<string>> {
  const CALL = /\b([A-Za-z_$][\w$]{0,3})\("([a-z][A-Za-z0-9]*(?:\.[A-Za-z0-9]+)+)"/g
  const calls = new Map<string, Set<string>>()
  for (const [, fn = '', id = ''] of source.matchAll(CALL)) {
    const ids = calls.get(fn) ?? new Set<string>()
    ids.add(id)
    calls.set(fn, ids)
  }
  return calls
}

/**
 * The colour ids the installed editor registers.
 *
 * Command ids and setting keys are dotted strings too, so call shape alone
 * cannot tell the colour registry from any other registrar. The mirror breaks
 * the tie: whichever identifier accounts for the most known colour keys is the
 * one registering colours, and no other registrar comes close to overlapping a
 * list of colour ids.
 *
 * That same overlap is then the correctness check. If the winner does not
 * account for the overwhelming majority of the mirror's keys, the call shape
 * has drifted and the extraction is not trustworthy - in which case this
 * throws rather than quietly vendoring a truncated list, because a truncated
 * list is exactly the failure this script exists to prevent.
 */
const OVERLAP_FLOOR = 0.85

function registeredColorIds(source: string, known: ReadonlySet<string>): Set<string> {
  const overlap = (ids: Set<string>): number => [...ids].filter((id) => known.has(id)).length

  let best = new Set<string>()
  for (const ids of callsByIdentifier(source).values()) {
    if (overlap(ids) > overlap(best)) best = ids
  }

  const matched = overlap(best)
  const floor = Math.ceil(known.size * OVERLAP_FLOOR)
  if (matched < floor) {
    throw new Error(
      `Colour registry extraction is not trustworthy: the best candidate accounts for ` +
        `${matched} of the mirror's ${known.size} keys, below the ${floor} floor. ` +
        `The bundle's call shape has probably changed - fix the pattern rather than ` +
        `vendoring a truncated key list.`,
    )
  }
  return best
}

async function readBundle(): Promise<{ path: string; source: string }> {
  const candidates = process.env.EDITOR_BUNDLE ? [process.env.EDITOR_BUNDLE] : BUNDLES
  for (const path of candidates) {
    try {
      return { path, source: await readFile(path, 'utf8') }
    } catch {
      // Try the next install.
    }
  }
  throw new Error(
    `No editor bundle found. Looked in:\n  ${candidates.join('\n  ')}\n` +
      `Set EDITOR_BUNDLE to the path of a workbench.desktop.main.js.`,
  )
}

const res = await fetch(SCHEMA_URL)
if (!res.ok) throw new Error(`Schema fetch failed: ${res.status}`)

const schema = (await res.json()) as { type: string; properties: Record<string, Property> }
const mirrored = Object.keys(schema.properties)
if (mirrored.length < 700) throw new Error(`Suspiciously few keys in the mirror: ${mirrored.length}`)

const { path, source } = await readBundle()
const registered = registeredColorIds(source, new Set(mirrored))

const editor = path.replace(/^.*\/([^/]+)\.app\/.*$/, '$1')
const added = [...registered].filter((id) => !(id in schema.properties)).sort()
for (const id of added) {
  schema.properties[id] = {
    type: 'string',
    // No description is recoverable: the bundle holds these as indices into a
    // separate localisation table. The provenance is the useful part anyway.
    description: `Registered by ${editor} but absent from the mirror schema.`,
    format: 'color-hex',
    defaultSnippets: [{ body: '${1:#ff0000}' }],
  }
}

/*
 * Kept, not dropped. The extraction is a lower bound - a colour registered
 * through a wrapper this pattern does not see is missed - so a mirror key the
 * editor appears not to register is more likely a gap here than a key the
 * editor removed. Setting a key the editor ignores costs nothing; unsetting
 * one it honours is the bug this script exists to prevent.
 */
const unconfirmed = mirrored.filter((id) => !registered.has(id)).length

/*
 * Upstream's declaration order is preserved and the additions are appended,
 * rather than sorting the merged set. Sorting would rewrite all 718 mirrored
 * entries and, because the build walks the schema in order, reshuffle every
 * line of the generated theme with them - turning both diffs into noise that
 * hides the actual change.
 */
const total = Object.keys(schema.properties).length

await writeFile('schema/workbench-colors.json', `${JSON.stringify(schema, null, 2)}\n`)
console.log(
  `Vendored ${total} colour keys: ${mirrored.length} from the mirror, ` +
    `${added.length} added from ${editor}'s own registry ` +
    `(${unconfirmed} mirror keys the extraction did not confirm, kept anyway).`,
)
