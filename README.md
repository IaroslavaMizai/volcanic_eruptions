# Volcanic Eruptions

An interactive website about volcanic eruptions from 1925 through 2024. Its flat, self-contained file layout and interaction model follow the **Conflict Atlas** web version. The website loads its bundled records from `data.json` and runs independently of Tableau Cloud.

## Files

- `index.html` — website entry point.
- `app.js`, `styles.css` — dashboard interactions and appearance.
- `data.json` — 449 records for 1925–2024 from the published Tableau data source.
- `d3-array.min.js`, `d3-geo.min.js` — libraries used by the charts and globe projection.
- `world-geometry.js` — country geometry for the globe and flat map.
- `THIRD-PARTY-NOTICES.txt` — third-party component attributions.

The website does not need the Tableau Extensions API or a `.twbx` file. It reads `data.json` directly, so once hosted on GitHub Pages it does not connect to Tableau Cloud while visitors use it.

## Year selection and interactions

- The year slider covers **1925–2024** and ends with **All years**. All years is the initial state and the state restored by **Reset filters**.
- A selected year filters the KPIs, map markers, and VEI profile. **All years** shows the full period.
- The `Eruptions over time` / `Deaths over time` chart keeps the annual series for the active non-year filters. The selected year is highlighted by a point and a vertical dotted guide; both disappear in **All years** mode.
- **Play** advances through the years and reaches **All years** at the end.
- Region, sub-region, country, volcano type, VEI risk tier, and VEI category filters update the map, KPIs, profile, and time-series context together. Categories with no matching results remain visible in the filter lists.
- **Eruptions / Deaths** changes the map and chart measures. Globe rotation, zoom, the flat-map transition, tooltips, theme switching, and the author’s social profile links work in the browser.

## Canvas size

The page uses a fixed **1320 × 839 px** canvas, matching the current Tableau workbook. Set the Tableau **Web Page** object to approximately the same size to preserve the layout.

## Publish with GitHub Pages

1. Create a public repository, for example `volcanic-eruptions`.
2. Upload the **contents of this folder** to the repository root. `index.html` must be at the top level. You can upload the `Volcanic-Eruptions-GitHub-Pages.zip` after extracting it.
3. Open **Settings → Pages**.
4. Under **Build and deployment**, choose **Deploy from a branch**, select branch `main` and folder `/(root)`, then click **Save**.
5. Wait for GitHub to show the page address in the Pages section. Open the `https://…github.io/…` link to confirm it loads.

## Embed in Tableau Public

In Tableau Desktop, add a **Web Page** object to the dashboard and enter the GitHub Pages URL. Then publish the Tableau workbook through Tableau Public. GitHub Pages hosts the interactive website; Tableau Public displays it inside the Web Page object.

## Data source and license

Data source: [Global Volcano Eruption Intelligence](https://www.kaggle.com/datasets/kanchana1990/global-volcano-eruption-intelligence). The dataset is listed under **CC BY-SA 4.0**. Retain attribution and follow the license terms when redistributing the data or adapted materials.

Dashboard author: **Iaroslava Mizai**.
