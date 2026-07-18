# Dhikr data — single source of truth

**`data/dhikr.json` is the master.** Every dhikr in the app comes from here. Edit
this one file, run the build, and the app updates. The same file can also feed a
website and a PDF, so all three always match.

## To add / edit / reorder a dhikr

1. Open **`data/dhikr.json`** and change it:
   - **Reorder**: move an object up/down (order in the file = order in the app).
   - **Edit**: change any field (fix a translation, add a `ref`, etc.).
   - **Add**: copy an existing object and change the fields. `key` must be unique.
2. Run the build:
   ```
   node tools/build-dhikr.js
   ```
   It validates the file and rewrites the data inside `www/index.html`.
3. For the Android app, then run `npx cap copy`.

If you ever hand-edit the dhikr inside `www/index.html` directly, pull those
changes back into the master with `node tools/extract-dhikr.js` (this overwrites
`data/dhikr.json` from the app).

## Fields (per dhikr)

| field | required | meaning |
|-------|----------|---------|
| `key` | ✅ | unique id, e.g. `"sb-3"` (never reuse) |
| `cat` | ✅ | `General`, `Morning`, `Evening`, `AfterPrayer`, `BeforeSleep` |
| `subcat` | – | for General: `Tawhid`, `Tasbih`, `Istighfar`, `Salawat`, `Protection`, `Praise`, `Supplications`, `Personal` |
| `title` | – | short display name |
| `ar` | ✅ | short Arabic shown on the main screen |
| `tl` | – | transliteration |
| `tr` | – | short meaning line |
| `count` | – | prescribed repetitions (e.g. `33`, `100`) |
| `targetOptions` / `defaultTarget` / `inlineTarget` | – | for "1× / 10× / 100×" style pickers |
| `ref` | – | **the dalil / source** (e.g. `"Bukhari 6405, Muslim 2692"`) |
| `arFull` | – | full Arabic (for surahs / long duas). Shown in *Read Full Dhikr* |
| `tlFull` | – | full transliteration |
| `trFull` | – | full translation |
| `note` | – | small footnote under the full text |

**Adding a dalil/resource:** just fill the `ref` field (and put fuller context in
`note` if you like). No other change needed.

**Read Full Dhikr** appears automatically when there's genuinely more to read
(long `ar`, or an `arFull` noticeably longer than `ar`). Short phrases whose
`arFull` is only the phrase + a "(100×)" note won't show the button.

**Numbered surah verses (۝١ ۝٢ …):** in `arFull`, put the ayah-end mark `۝`
followed by the Eastern-Arabic number after each verse, e.g.
`…ٱلْفَلَقِ ۝١ مِن شَرِّ مَا خَلَقَ ۝٢`.

## Website & PDF (same source)

Both can read `data/dhikr.json` directly:
- **Website**: `fetch('data/dhikr.json')` and render, or generate static HTML from it.
- **PDF**: a small script can loop the JSON into a document (grouped by `cat`,
  Arabic + transliteration + translation + `ref`).

Keeping all three pointed at this one file is what makes them tally. Ask and I can
add a `tools/build-pdf.js` / `tools/build-site.js` that generate those from here.
