# Digital Gate Website

This is a small static Digital Gate frontend.

## Folder layout

```text
index.html
style.css
app.js
assets_manifest.json
build_site_manifest.py
digimon_digital_gate.mp4
digimon_digital_gate.png       <- shown after the intro video when the user clicks/taps
analyzer1.mp4                  <- played before showing a Digimon Analyzer result
maps/
  adv_digital_forest.png
  adv_*.png
  tamers_*.png
  savers_*.png
digivices/
  *.png / *.gif / *.webp / *.jpg
tamers/
digimon/
enemies/
sprites/
```

## Intro flow

1. The page plays `digimon_digital_gate.mp4` first.
2. When the video ends, it stays on the finished video frame and waits.
3. The user can click/tap anywhere on the screen, press a key, or press **Enter Digital World**.
4. The page shows `digimon_digital_gate.png`, fades into white, then fades out to `maps/adv_digital_forest.png`.

Mobile browsers often block autoplay with sound, so the intro video tries autoplay muted first. If autoplay is blocked, the page shows **Open Digital Gate**.

## How to add maps

Put map images in `maps/`:

- Adventure maps: `adv_something.png`
- Tamers maps: `tamers_something.png`
- Savers maps: `savers_something.png`

Then rebuild the manifest:

```bash
python build_site_manifest.py
```

The browser cannot reliably list folder contents by itself, so the frontend reads `assets_manifest.json`.

When the user changes maps, the current map fades into white and the new map fades back in.

## How to add Digivice sprites

Put Digivice sprites in `digivices/`, then run:

```bash
python build_site_manifest.py
```

Selected Digivice sprites appear floating near the top-right of the map.

## How to add character sprites

Put sprites in these folders and rebuild the manifest:

- `tamers/` for Add Tamer
- `digimon/` for Add Digimon
- `enemies/` for Add Enemy

Added sprites can be dragged. Double-click/tap twice on desktop to remove a placed sprite.

## Digimon Analyzer API

The API base is set in `app.js`:

```js
const ANALYZER_API_BASE = "https://digimon-analyzer-api-921902562817.us-east1.run.app";
```

The frontend calls `/api/search?name=...` first. If the image is missing, it calls `/api/generate?name=...`.

After the analyzer image URL is received, the page plays `analyzer1.mp4` and then displays the returned analyzer image full-screen with a floating back button.

## Run locally

Use a local server instead of opening `index.html` directly, because `fetch("assets_manifest.json")` may be blocked from `file://` URLs.

```bash
python -m http.server 8000
```

Then open:

```text
http://localhost:8000
```
