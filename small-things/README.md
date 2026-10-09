# The Small Things

*An Unofficial Field Study on the Slight Alterations Caused by One Particular Person*

A letter and a poem, designed as an archived field document: case file, routing slip, field notes, a subject observation report, the World Difference Index™, a control experiment, abandoned measurements, a case conclusion, and a poem recovered from the back of the observer's notebook.

**The finished file is `dist/the-small-things.pdf`.**

## Format

- **Page:** 120 × 213 mm, a narrow field-journal format with a 9:16 ratio, so on a phone each page fills the screen at a readable size. It also prints cleanly.
- **Type:**
  - EB Garamond for the literary voice.
  - IBM Plex Sans Condensed for archival labels.
  - Caveat for the handwritten margin notes.
  - All three are SIL Open Font License; see `assets/fonts/OFL.txt`.
- **Palette:** warm ivory, parchment, charcoal, muted brown, deep navy and gold. The stamps use a faded oxblood and the handwriting a blue-black pen.
- **Names:** they appear in exactly one place, the routing slip. Everywhere else the subject is *you*. The build checks this on every run.

## Edit and rebuild

| What | Where |
| --- | --- |
| Every word of the letter (sections, field notes, margin notes, report, index, lists) | `content/letter.json` |
| The poem | `content/poem.json` |
| Cover text, routing slip, section titles, captions, footers, pull quotes, final page | `content/design.json` |
| Look and feel | `src/styles.css`, `src/pages.css` |

```bash
node scripts/build.mjs --previews   # writes dist/the-small-things.pdf and PNG previews in build/preview/
sh scripts/package.sh               # zips the PDF together with this source
```

The build needs Node 18+ and Playwright's Chromium (`npm i -g playwright`), plus `pdftotext`, `pdfinfo` and `pdffonts` from poppler-utils.

Markup inside the text:
- `*italic*`
- `~~struck~~` for crossed-out professional terminology
- a blank line between paragraphs

## How it is built

`scripts/build.mjs` turns the content into a stream of blocks and draws the figures as inline SVG:
- the survey contours on the cover;
- the propagation of a laugh;
- the distortion grid;
- the flight path;
- the two-condition experiment trace;
- the before/after rows of the World Difference Index.

Chromium loads the page and `src/paginate.js` pours the blocks into fixed pages. Along the way it:
- keeps headings with the text that follows them;
- splits paragraphs between words, with at least two lines on each side;
- splits lists and poem sections cleanly;
- lets lighter sections continue on the same page when there is room;
- fills in the archival folios, running heads and contents page.

The build then prints the PDF and checks it:
- the page count;
- that the names appear only on the routing slip;
- that no fallback fonts were used;
- that no page overflows or ends on a stranded heading.
