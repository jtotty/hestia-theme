import { describe, expect, it } from 'vitest'
import { bundledCaptures, styleKeys } from '../src/zed-schema'

describe('the vendored Zed key list', () => {
  /*
   * Zed's published schema knows 138 colour keys. The editor installed on this
   * machine honours 187, and every one of the extra 49 is a key the theme
   * would otherwise never set - which in Zed means the editor paints its own
   * default there, and those defaults are cool. Re-vendoring from a source
   * that knows about fewer keys is a regression, not a refresh.
   */
  it('covers more than the published schema knows about', () => {
    expect(styleKeys.length).toBeGreaterThanOrEqual(187)
  })

  it('includes the families the published schema is missing entirely', () => {
    for (const key of [
      'minimap.thumb.background',
      'editor.diff_hunk.added.background',
      'version_control.word_added',
      'vim.visual.background',
      'panel.overlay_background',
      'debugger.accent',
      'element.selection_background',
      'editor.debugger_active_line.background',
    ]) {
      expect(styleKeys, key).toContain(key)
    }
  })

  it('includes the full ANSI terminal set, base, bright and dim', () => {
    for (const name of ['black', 'red', 'green', 'yellow', 'blue', 'magenta', 'cyan', 'white']) {
      expect(styleKeys).toContain(`terminal.ansi.${name}`)
      expect(styleKeys).toContain(`terminal.ansi.bright_${name}`)
      expect(styleKeys).toContain(`terminal.ansi.dim_${name}`)
    }
  })

  it('carries the capture names Zed styles in its own themes', () => {
    expect(bundledCaptures.length).toBeGreaterThanOrEqual(47)
    for (const capture of ['comment', 'keyword', 'function', 'string', 'type', 'variable']) {
      expect(bundledCaptures).toContain(capture)
    }
  })
})
