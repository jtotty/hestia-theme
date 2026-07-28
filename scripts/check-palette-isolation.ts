import { readdir, readFile } from 'node:fs/promises'

const HEX = /#[0-9a-fA-F]{3,8}(?![0-9a-fA-F])/
const ALLOWED = new Set(['palette.ts'])

const offenders: string[] = []
for (const file of await readdir('src')) {
  if (ALLOWED.has(file)) continue
  const source = await readFile(`src/${file}`, 'utf8')
  const line = source.split('\n').findIndex((l) => HEX.test(l))
  if (line !== -1) offenders.push(`src/${file}:${line + 1}`)
}

if (offenders.length > 0) {
  console.error('Hex literals are only permitted in src/palette.ts. Found in:')
  for (const o of offenders) console.error(`  ${o}`)
  process.exit(1)
}

console.log('Palette isolation OK.')
