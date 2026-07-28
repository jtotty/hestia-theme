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

The theme sets all 718 workbench colour keys listed in the vendored schema snapshot at `schema/workbench-colors.json`, except 4 deliberately left unset.
Those 4 are `button.border`, `editor.lineHighlightBorder`, `editorUnnecessaryCode.opacity` and `minimap.foregroundOpacity`.
The last two are alpha-only keys VS Code reads the alpha channel from, so setting them opaque would disable the effect they exist for.

That snapshot is not the same thing as the set of keys VS Code recognises today.
It comes from an unofficial third-party mirror that lags upstream, so keys added to VS Code after it was taken are not covered.
`textPreformat.border`, `editorGutter.itemBackground` and every `multiDiffEditor.*` key are absent from it and fall back to VS Code's own defaults.
The whole `chat.*` surface is represented by three keys, which is well short of what current VS Code and Cursor define.
Within the snapshot, setting every key means no cool VS Code defaults leak through; outside it, they can.
That is worth knowing in Cursor in particular, where the chat surface is a primary one.

The build is deterministic.
`themes/` is generated and gitignored.

## Building

```bash
npm run build
```

This runs `src/build.ts`, which reads `src/palette.ts` and writes `themes/hestia-color-theme.json`.
