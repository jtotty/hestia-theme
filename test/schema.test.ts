// test/schema.test.ts
import { describe, expect, it } from 'vitest'
import { colorKeys } from '../src/schema'

describe('the vendored key list', () => {
  // The floor was 700 while the schema came from a third-party mirror, which
  // turned out to be 138 keys short of what the editor actually registers.
  // Every one of those was a key the theme never set and the editor therefore
  // painted itself, in its own cool defaults. The list is now derived from the
  // installed editor's colour registry (see scripts/vendor-schema.ts), so the
  // floor is raised to what that yielded: re-vendoring from a source that
  // knows about fewer keys is a regression, not a refresh.
  it('covers the full editor surface, not a subset', () => {
    expect(colorKeys.length).toBeGreaterThanOrEqual(856)
  })

  it('includes the families the mirror schema was missing entirely', () => {
    for (const key of [
      'chart.line',
      'scmGraph.foreground1',
      'inlineEdit.modifiedChangedTextBackground',
      'inlineEdit.gutterIndicator.primaryBackground',
      'testing.uncoveredGutterBackground',
      'terminalSymbolIcon.methodForeground',
      'editorMultiCursor.primary.foreground',
      'tab.selectedBackground',
    ]) {
      expect(colorKeys, key).toContain(key)
    }
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
