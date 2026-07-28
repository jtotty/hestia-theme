import { writeFile } from 'node:fs/promises'

/*
 * An unofficial third-party mirror of the schema VS Code ships, not a
 * Microsoft-published artifact. It is updated by hand and lags real VS Code,
 * so the snapshot it produces is a subset of the keys the editor actually
 * recognises: anything added upstream since the mirror was last refreshed is
 * simply absent, and this project will not set it. Treat the vendored key
 * count as "what we know about", not "what exists".
 */
const SCHEMA_URL =
  'https://raw.githubusercontent.com/wraith13/vscode-schemas/master/en/latest/schemas/workbench-colors.json'

const res = await fetch(SCHEMA_URL)
if (!res.ok) throw new Error(`Schema fetch failed: ${res.status}`)

const schema = (await res.json()) as { properties: Record<string, unknown> }
const count = Object.keys(schema.properties).length
if (count < 700) throw new Error(`Suspiciously few keys: ${count}`)

await writeFile('schema/workbench-colors.json', `${JSON.stringify(schema, null, 2)}\n`)
console.log(`Vendored ${count} colour keys.`)
