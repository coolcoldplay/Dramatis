# Twin Peaks Season 2 Visualization Guide

Use `data/twin-peaks-season-2.json` with the current Dramatis import flow (`存档` -> `导入 JSON`). The dataset is designed to open as a curated atlas, not as an unfiltered force-directed hairball.

## Recommended Views

1. **Season 2 Overview**
   - Keep `Node Type`, `Plotline`, and `Importance` tag rings visible.
   - Keep relation/action labels hidden by default; rely on hover tooltips.
   - Use the whole graph to see major hubs: Laura case, One-Eyed Jack's, Packard/Ghostwood, Windom Earle, Owl Cave, Black Lodge.

2. **Laura Palmer Case**
   - Show or focus nodes tagged `Laura Case`.
   - Important hubs: `Laura Palmer Case`, `Secret Diary / Harold Smith`, `Maddy Murder`, `Killer Reveal / Leland Death`.
   - Good export after hiding low-priority Horne/Packard/side-comedy nodes.

3. **Windom Earle / Black Lodge**
   - Focus `Windom Earle/FBI` and `Black Lodge` plotlines.
   - Key path: `Windom Earle` -> `Windom Earle Chess Game` -> `Project Blue Book` -> `Owl Cave Petroglyph` -> `Miss Twin Peaks Pageant` -> `Black Lodge` -> `Possessed Cooper Cliffhanger`.

4. **Packard / Ghostwood Business Line**
   - Focus `Packard/Ghostwood`.
   - Key path: `Packard Mill Fire Aftermath` -> `Josie Packard` -> `Josie Revealed / Death`, plus `Catherine`, `Andrew`, `Eckhardt Puzzle Box`, and `Ghostwood Estates`.

5. **Town Relationship Subplots**
   - Focus `Johnson/Leo/Bobby`, `Ed/Norma/Nadine`, and `Teen/Harold/James` separately.
   - These are intentionally not the default export view because they add many crossings when combined with the Black Lodge arc.

## Import And Cleanup Tips

- After import, use `显示` to keep line labels hidden unless you are making an annotated export.
- Use the episode slider to inspect chronological buildup from S2E1 to S2E22.
- For a clean poster export, hide nodes tagged `Context/Hidden`, then export PNG/SVG.
- For analysis, keep hidden nodes available and unhide individual plotlines as needed.

## Why Event Nodes Exist

Twin Peaks Season 2 is not just a social graph. Directly connecting every character to every interaction makes the diagram unreadable. Event nodes let the graph say: several people are connected through a shared event, clue, or location. That preserves plot causality while reducing long crossing edges.

## Suggested Next Manual Pass

- Add character portraits if desired.
- Move clusters slightly after import if your canvas aspect ratio differs.
- If a relationship feels too noisy, mark that edge hidden rather than deleting it; the extraction report keeps the reason for its inclusion.
