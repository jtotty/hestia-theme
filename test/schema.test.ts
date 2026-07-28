// test/schema.test.ts
import { describe, expect, it } from 'vitest'
import { colorKeys } from '../src/schema'

describe('the vendored key list', () => {
  it('covers the full VSCode surface, not a subset', () => {
    expect(colorKeys.length).toBeGreaterThanOrEqual(700)
  })

  it('includes the keys that fall back to a cool default when left unset', () => {
    for (const key of [
      'activityBar.activeBorder',
      'tab.activeBorderTop',
      'statusBar.focusBorder',
      'statusBarItem.focusBorder',
      'statusBarItem.remoteBackground',
      'terminal.tab.activeBorder',
      'welcomePage.progress.foreground',
      'inputOption.activeBorder',
      'actionBar.toggledBackground',
    ]) {
      expect(colorKeys, key).toContain(key)
    }
  })

  it('includes the full ANSI terminal set', () => {
    for (const name of ['Black', 'Red', 'Green', 'Yellow', 'Blue', 'Magenta', 'Cyan', 'White']) {
      expect(colorKeys).toContain(`terminal.ansi${name}`)
      expect(colorKeys).toContain(`terminal.ansiBright${name}`)
    }
  })
})
