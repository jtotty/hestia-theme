# Hestia

A VS Code / Cursor colour theme.
The palette comes from a Ghostty terminal theme and is reproduced across the editor chrome.

## Install

Not published to the marketplace yet, so build the `.vsix` locally.

```bash
git clone https://github.com/jtotty/hestia-theme
cd hestia-theme
npm install
npm run build
npm run package
```

`npm run package` writes `hestia-theme-<version>.vsix` to the repo root.
Install it with `code --install-extension hestia-theme-<version>.vsix`, or from the Extensions view via "Install from VSIX...".

## Design

The theme is all-warm by design.
Every emitted colour passes a warm gate: OKLCH hue within `[15, 170]`, unless chroma is at or below 0.002.

Jade (`#6fc2a0` / `#82d2b2`) is the one sanctioned slight-cool accent.
It sits at hue 165.6 and 166.7, and carries types in syntax highlighting.

Colours come from 23 named roles in `src/palette.ts`, the only file permitted to contain hex literals.
A lint script enforces that isolation.
Three of those roles have no terminal counterpart and are derived along the warm neutral ramp in OKLCH rather than hand-picked.

Comments sit at 2.37:1 against the background, deliberately below WCAG AA, so they recede.
Every role carrying real content clears 4.5:1.

## Terminal parity

All 16 ANSI terminal slots, plus background, foreground, cursor and selection, are byte-identical to the Ghostty theme file.
The integrated terminal is meant to match Ghostty exactly, with no separate terminal palette to drift out of sync.

## Coverage

The theme sets all 856 workbench colour keys listed in the vendored schema snapshot at `schema/workbench-colors.json`, except 6 deliberately left unset.
Those 6 are `contrastBorder`, `contrastActiveBorder`, `button.border`, `editor.lineHighlightBorder`, `editorUnnecessaryCode.opacity` and `minimap.foregroundOpacity`.
The two contrast keys exist for high-contrast accessibility themes and stack an extra border on top of every border already defined, which is the opposite of this theme's recessive chrome.
The two opacity keys are alpha-only keys VS Code reads the alpha channel from, so setting them opaque would disable the effect they exist for.

The snapshot is built by `npm run vendor-schema` from two sources, because neither is complete on its own.
The base is an unofficial third-party mirror of the schema VS Code ships (718 keys).
It carries the real upstream descriptions, but it is maintained by hand and lags upstream, so anything added since its last refresh is absent.
On top of that, the script reads the colour registry straight out of the installed editor's `workbench.desktop.main.js` - Cursor first, then VS Code - which is the authoritative set of keys that editor will honour, and merges in the 138 keys the mirror was missing.

The bundle is minified, so the registrar function cannot be matched by name.
The script matches call shape instead and picks the identifier whose dotted-string arguments overlap the mirror's key list most.
If the winner accounts for less than 85% of the mirror's keys the call shape has drifted, and the script throws rather than quietly vendoring a truncated list.
Mirror keys the extraction does not confirm are kept, not dropped: the extraction is a lower bound, and setting a key the editor ignores costs nothing while unsetting one it honours does not.

`vendor-schema` needs a local Cursor or VS Code install, so it is a manual step and never runs in CI.
The CI-side guard is a floor on the vendored key count in `test/schema.test.ts`.

Coverage is still not the whole of what the editor draws.
`textPreformat.border` appears in neither source, and the whole `chat.*` surface is represented by three keys, which is well short of what Cursor's chat UI renders.
Whether those gaps are keys the editor really lacks or keys the extraction misses is unconfirmed.
Within the snapshot, setting every key means no cool editor defaults leak through; outside it, they can.
That is worth knowing in Cursor in particular, where the chat surface is a primary one.

The build is deterministic.
`themes/` is generated and gitignored.

## Building

```bash
npm run build
```

This runs `src/build.ts`, which reads `src/palette.ts` and writes `themes/hestia-color-theme.json`.
