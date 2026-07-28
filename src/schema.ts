import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

interface WorkbenchSchema {
  properties: Record<string, unknown>
}

const SCHEMA_PATH = fileURLToPath(new URL('../schema/workbench-colors.json', import.meta.url))
const schema = JSON.parse(readFileSync(SCHEMA_PATH, 'utf8')) as WorkbenchSchema

/** Every workbench colour key VSCode recognises, sorted. */
export const colorKeys: readonly string[] = Object.keys(schema.properties).sort()
