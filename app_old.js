const INTRO_VIDEO = "digimon_digital_gate.mp4";
const INTRO_STILL = "digimon_digital_gate.png";
const ANALYZER_VIDEO = "analyzer1.mp4";
const DEFAULT_MAP = "maps/adv_digital_forest.png";
const ASSET_MANIFEST = "assets_manifest.json";
const ANALYZER_API_BASE = "https://digimon-analyzer-api-921902562817.us-east1.run.app";
const GATE_OPEN_SOUND = "sounds/digital_gate_open.wav";
const MAP_CHANGE_SOUND = "sounds/map_change.wav";
const DIGIVICE_BEEPS_SOUND = "sounds/digivice_beeps.wav";
const BATTLE_DATA_CSV = "battle/vb_data.csv";
const ATTACK_SPRITE_FOLDER = "battle/attacks";
const ATTACK_SPRITE_EXTENSION = "png";
const ATTACK_SPRITE_COUNT = 81;
const ATTACK_SPRITE_INVALID = 65535;
const FALLBACK_HIT_ATTACK_INDEX = 0;
const FALLBACK_MEGA_ATTACK_INDEX = 1;
const BATTLE_HIT_SOUND = "sounds/hit.wav";
const BATTLE_MEGA_HIT_DIGIMON_SOUND = "sounds/mega_hit_digimon.wav";
const BATTLE_MEGA_HIT_ENEMY_SOUND = "sounds/mega_hit_enemy.wav";
const BATTLE_WIN_SOUND = "sounds/win.wav";
const BATTLE_LOSE_SOUND = "sounds/lose.wav";
const BATTLE_BETWEEN_HIT_DELAY = 1000;
const EVOLUTION_SOUND = "sounds/evolution.wav";
const EVOLUTION_EFFECT_GIF = "battle/evolution.gif";
const EVOLUTION_REVEAL_DURATION = 950;
const EVOLUTION_FADE_DURATION = 520;
const EVOLUTION_CURRENT_WIN_DELAY = 960;
const EVOLUTION_WIN_HOLD_DURATION = 950;
const SAVE_STATE_APP = "digital-gate-state";
const SAVE_STATE_VERSION = 1;
const PLACEMENT_EDGE_MARGIN = 18;
const PLACEMENT_STACK_STEP_RATIO = 0.72;
const PLACEMENT_MAX_TEST_COLUMNS = 30;

const MAP_GROUPS = {
  Adventure: "adv_",
  Tamers: "tamers_",
  Savers: "savers_",
};

const SPRITE_FOLDERS = {
  tamers: {
    label: "Tamer",
    assetsKey: "tamers",
    side: "right",
    flip: false,
    kind: "tamer",
  },
  digimon: {
    label: "Digimon",
    assetsKey: "digimon",
    side: "right",
    flip: false,
    kind: "digimon",
  },
  enemies: {
    label: "Enemy",
    assetsKey: "digimon",
    side: "left",
    flip: true,
    kind: "enemy",
  },
};

const state = {
  currentMap: DEFAULT_MAP,
  assets: {
    maps: [DEFAULT_MAP],
    digivices: [],
    tamers: [],
    digimon: [],
    enemies: [],
    sprites: [],
  },
  introWaitingForContinue: false,
  introTransitionStarted: false,
  mapTransitioning: false,
  nextSpriteId: 1,
  battleData: null,
  battleDataPromise: null,
  battleRunning: false,
  evolutionRunning: false,
  humanWorldReturning: false,
};

const intro = document.getElementById("intro");
const gateVideo = document.getElementById("gateVideo");
const gateStill = document.getElementById("gateStill");
const startButton = document.getElementById("startButton");
const enterGateButton = document.getElementById("enterGateButton");
const whiteFlash = document.getElementById("whiteFlash");
const world = document.getElementById("world");
const mapImage = document.getElementById("mapImage");
const menuToggle = document.getElementById("menuToggle");
const menuPanel = document.getElementById("menuPanel");
const closeMenu = document.getElementById("closeMenu");
const panelHost = document.getElementById("panelHost");
const digiviceSprite = document.getElementById("digiviceSprite");
const analyzerViewer = document.getElementById("analyzerViewer");
const analyzerVideo = document.getElementById("analyzerVideo");
const analyzerImage = document.getElementById("analyzerImage");
const backToMap = document.getElementById("backToMap");
const placedSprites = document.getElementById("placedSprites");

function sleep(ms) {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}

const activeSounds = new Set();

function nextFrame() {
  return new Promise((resolve) => requestAnimationFrame(resolve));
}

function playOneShot(src, volume = 1) {
  try {
    const audio = new Audio(src);
    audio.preload = "auto";
    audio.volume = volume;

    activeSounds.add(audio);

    audio.addEventListener(
      "ended",
      () => {
        activeSounds.delete(audio);
      },
      { once: true }
    );

    audio.addEventListener(
      "error",
      () => {
        activeSounds.delete(audio);
      },
      { once: true }
    );

    const playPromise = audio.play();

    if (playPromise && typeof playPromise.catch === "function") {
      playPromise.catch((error) => {
        console.warn(`Could not play sound: ${src}`, error);
        activeSounds.delete(audio);
      });
    }

    return audio;
  } catch (error) {
    console.warn(`Could not create sound: ${src}`, error);
    return null;
  }
}

function preloadImage(src) {
  const image = new Image();
  image.src = src;
  return image;
}

function normalizeManifest(manifest) {
  return {
    maps: Array.isArray(manifest?.maps) ? manifest.maps : [DEFAULT_MAP],
    digivices: Array.isArray(manifest?.digivices) ? manifest.digivices : [],
    tamers: Array.isArray(manifest?.tamers) ? manifest.tamers : [],
    digimon: Array.isArray(manifest?.digimon) ? manifest.digimon : [],
    enemies: Array.isArray(manifest?.enemies) ? manifest.enemies : [],
    sprites: Array.isArray(manifest?.sprites) ? manifest.sprites : [],
  };
}

async function loadAssets() {
  try {
    const response = await fetch(ASSET_MANIFEST, { cache: "no-store" });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    state.assets = normalizeManifest(await response.json());
  } catch (error) {
    console.warn("Could not load assets_manifest.json. Using default map only.", error);
    state.assets = normalizeManifest({ maps: [DEFAULT_MAP] });
  }

  if (!state.assets.maps.includes(DEFAULT_MAP)) {
    state.assets.maps.unshift(DEFAULT_MAP);
  }
}

function showStartButton() {
  // startButton.classList.remove("hidden");
}

async function tryAutoplayIntro() {
  gateVideo.src = INTRO_VIDEO;
  gateVideo.muted = true;

  try {
    await gateVideo.play();
  } catch (error) {
    showStartButton();
  }
}

startButton.addEventListener("click", async (event) => {
  event.stopPropagation();
  startButton.classList.add("hidden");

  try {
    gateVideo.currentTime = 0;
    gateVideo.muted = false;
    await gateVideo.play();
  } catch (error) {
    gateVideo.muted = true;
    await gateVideo.play();
  }
});

gateVideo.addEventListener("ended", () => {
  state.introWaitingForContinue = true;
  gateVideo.pause();

  // Make the first tap/click after the video go directly to the intro container,
  // instead of the video element eating the first interaction on some browsers.
  gateVideo.style.pointerEvents = "none";

  // Optional if you ever want the button visible again.
  // enterGateButton.classList.remove("hidden");
});

function requestGateTransition(event) {
  if (!state.introWaitingForContinue || state.introTransitionStarted) return;

  if (event) {
    event.preventDefault();
    event.stopPropagation();
  }

  beginGateStillTransition();
}

intro.addEventListener("pointerdown", requestGateTransition, { capture: true });
intro.addEventListener("click", requestGateTransition, { capture: true });
enterGateButton.addEventListener("pointerdown", requestGateTransition);
enterGateButton.addEventListener("click", requestGateTransition);

window.addEventListener("keydown", (event) => {
  if (!state.introWaitingForContinue || state.introTransitionStarted) return;

  const ignoredKeys = ["Tab", "Shift", "Control", "Alt", "Meta"];
  if (ignoredKeys.includes(event.key)) return;

  requestGateTransition(event);
});

async function beginGateStillTransition() {
  state.introWaitingForContinue = false;
  state.introTransitionStarted = true;

  enterGateButton.classList.add("hidden");

  gateStill.src = INTRO_STILL;
  gateStill.classList.remove("hidden");

  // Let the browser paint the still image immediately.
  await nextFrame();
  await nextFrame();

  // Keep the still visible briefly before it fades into white.
  await sleep(350);

  whiteFlash.classList.add("gate-slow");
  await nextFrame();

  playOneShot(GATE_OPEN_SOUND);
  whiteFlash.classList.add("on");

  await sleep(1450);

  world.classList.remove("hidden");
  mapImage.src = state.currentMap;
  intro.classList.add("hidden");

  await sleep(350);

  whiteFlash.classList.remove("on");

  await sleep(1450);

  whiteFlash.classList.remove("gate-slow");
}

function toggleMenu(forceOpen = null) {
  const shouldOpen = forceOpen ?? menuPanel.classList.contains("hidden");
  menuPanel.classList.toggle("hidden", !shouldOpen);
  menuToggle.setAttribute("aria-expanded", String(shouldOpen));
}

menuToggle.addEventListener("click", () => toggleMenu());
closeMenu.addEventListener("click", () => toggleMenu(false));
digiviceSprite.addEventListener("click", (event) => {
  event.preventDefault();
  event.stopPropagation();

  if (digiviceSprite.classList.contains("hidden")) return;

  playOneShot(DIGIVICE_BEEPS_SOUND);
  renderEvolutionPanel();
  toggleMenu(true);
});

menuPanel.addEventListener("click", (event) => {
  const button = event.target.closest("[data-open-panel]");
  if (!button) return;

  const panelName = button.dataset.openPanel;
  if (panelName === "maps") renderMapsPanel();
  if (panelName === "digivice") renderDigivicePanel();
  if (panelName === "analyzer") renderAnalyzerPanel();
  if (panelName === "tamers") renderSpritePanel("tamers");
  if (panelName === "digimon") renderSpritePanel("digimon");
  if (panelName === "enemies") renderSpritePanel("enemies");
  if (panelName === "battle") renderBattlePanel();
  if (panelName === "state") renderStatePanel();
  if (panelName === "humanworld") returnToHumanWorld();
});

function basename(path) {
  return path.split("/").pop() || path;
}

function stripExtension(filename) {
  return filename.replace(/\.[^.]+$/, "");
}

function mapLabel(path, prefix) {
  const stem = stripExtension(basename(path));
  return stem.startsWith(prefix) ? stem.slice(prefix.length) : stem;
}

function assetLabel(path) {
  return stripExtension(basename(path)).replace(/_/g, " ");
}

function usesDigimonSpritesheet(config) {
  return config.assetsKey === "digimon" || config.assetsKey === "tamers";
}

function normalizeSearchText(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/\.[^.]+$/, "")
    .replace(/[_-]+/g, " ")
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function assetMatchesSearch(path, query) {
  const normalizedQuery = normalizeSearchText(query);

  if (!normalizedQuery) return true;

  const filename = stripExtension(basename(path));
  const label = assetLabel(path);

  const searchableText = normalizeSearchText(`${filename} ${label} ${path}`);

  return normalizedQuery
    .split(" ")
    .filter(Boolean)
    .every((word) => searchableText.includes(word));
}

function createSpriteChoiceButton(path, config) {
  const button = document.createElement("button");
  button.className = "asset-card";
  button.type = "button";
  button.title = assetLabel(path);

  if (usesDigimonSpritesheet(config)) {
    const thumb = document.createElement("div");
    thumb.className = "spritesheet-thumb";
    thumb.style.backgroundImage = `url("${path}")`;
    thumb.setAttribute("aria-label", assetLabel(path));
    button.appendChild(thumb);

    const name = document.createElement("div");
    name.className = "asset-name";
    name.textContent = assetLabel(path);
    button.appendChild(name);
  } else {
    button.innerHTML = `<img src="${path}" alt="${assetLabel(path)}" loading="lazy">`;
  }

  button.addEventListener("click", () => {
    addPlacedSprite(path, assetLabel(path), config);
    toggleMenu(false);
  });

  return button;
}

function mapsForPrefix(prefix) {
  return state.assets.maps
    .filter((path) => stripExtension(basename(path)).startsWith(prefix))
    .sort((a, b) => a.localeCompare(b));
}

async function setMap(path) {
  if (!path || path === state.currentMap || state.mapTransitioning) {
    toggleMenu(false);
    return;
  }

  state.mapTransitioning = true;
  toggleMenu(false);

  whiteFlash.classList.remove("gate-slow");
  playOneShot(MAP_CHANGE_SOUND);
  whiteFlash.classList.add("on");

  await sleep(875);

  state.currentMap = path;
  mapImage.src = path;

  await sleep(180);

  whiteFlash.classList.remove("on");

  await sleep(875);

  state.mapTransitioning = false;
}

function renderMapsPanel() {
  const wrapper = document.createElement("div");
  wrapper.innerHTML = `<h2 class="panel-title">Maps</h2>`;

  for (const [groupName, prefix] of Object.entries(MAP_GROUPS)) {
    const title = document.createElement("div");
    title.className = "submenu-title";
    title.textContent = groupName;
    wrapper.appendChild(title);

    const maps = mapsForPrefix(prefix);
    if (!maps.length) {
      const empty = document.createElement("p");
      empty.className = "empty-note";
      empty.textContent = `No ${groupName} maps found.`;
      wrapper.appendChild(empty);
      continue;
    }

    for (const path of maps) {
      const button = document.createElement("button");
      button.className = "panel-button";
      button.type = "button";
      button.textContent = mapLabel(path, prefix);
      button.addEventListener("click", () => setMap(path));
      wrapper.appendChild(button);
    }
  }

  panelHost.replaceChildren(wrapper);
}

function renderDigivicePanel() {
  const wrapper = document.createElement("div");
  wrapper.innerHTML = `<h2 class="panel-title">Choose Digivice</h2>`;

  if (!state.assets.digivices.length) {
    wrapper.insertAdjacentHTML(
      "beforeend",
      `<p class="empty-note">No sprites found yet. Put PNG, GIF, WEBP, or JPG files in <strong>digivices/</strong> and rebuild the manifest.</p>`
    );
    panelHost.replaceChildren(wrapper);
    return;
  }

  const grid = document.createElement("div");
  grid.className = "asset-grid";

  for (const path of state.assets.digivices) {
    const button = document.createElement("button");
    button.className = "asset-card";
    button.type = "button";
    button.title = assetLabel(path);
    button.innerHTML = `<img src="${path}" alt="${assetLabel(path)}" loading="lazy">`;
    button.addEventListener("click", () => {
      playOneShot(DIGIVICE_BEEPS_SOUND);

      digiviceSprite.src = path;
      digiviceSprite.classList.remove("hidden");
      toggleMenu(false);
    });
    grid.appendChild(button);
  }

  const clear = document.createElement("button");
  clear.className = "clear-button";
  clear.type = "button";
  clear.textContent = "Hide Digivice";
  clear.addEventListener("click", () => {
    digiviceSprite.classList.add("hidden");
    digiviceSprite.removeAttribute("src");
  });

  wrapper.appendChild(grid);
  wrapper.appendChild(clear);
  panelHost.replaceChildren(wrapper);
}

function renderAnalyzerPanel() {
  const wrapper = document.createElement("div");
  wrapper.innerHTML = `
    <h2 class="panel-title">Digimon Analyzer</h2>
    <form id="analyzerForm" class="search-row">
      <input id="analyzerSearch" class="search-input" type="search" placeholder="Search Digimon..." autocomplete="off" required>
      <button class="search-button" type="submit">Search</button>
    </form>
    <p id="analyzerStatus" class="status-note"></p>
  `;

  panelHost.replaceChildren(wrapper);

  const form = document.getElementById("analyzerForm");
  const input = document.getElementById("analyzerSearch");
  const status = document.getElementById("analyzerStatus");

  input.focus();

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    const name = input.value.trim();
    if (!name) return;

    await searchAnalyzer(name, status);
  });
}

async function fetchAnalyzerEndpoint(endpoint, name) {
  const url = `${ANALYZER_API_BASE}${endpoint}?name=${encodeURIComponent(name)}`;
  const response = await fetch(url);
  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(data?.detail || data?.message || `Analyzer request failed: HTTP ${response.status}`);
  }

  return data;
}

function resolveAnalyzerImageUrl(imageUrl) {
  return new URL(imageUrl, ANALYZER_API_BASE).href;
}

async function searchAnalyzer(name, statusElement) {
  try {
    statusElement.textContent = "Searching analyzer cache...";
    let data = await fetchAnalyzerEndpoint("/api/search", name);

    if (data.status === "missing") {
      statusElement.textContent = "Not cached yet. Generating analyzer image...";
      data = await fetchAnalyzerEndpoint("/api/generate", name);
    }

    if (data.status !== "ready" || !data.imageUrl) {
      throw new Error(data.message || "No analyzer image was returned.");
    }

    statusElement.textContent = "Opening analyzer...";
    await showAnalyzerSequence(resolveAnalyzerImageUrl(data.imageUrl));
  } catch (error) {
    statusElement.textContent = error.message || "Analyzer search failed.";
  }
}

async function showAnalyzerSequence(imageUrl) {
  toggleMenu(false);

  analyzerImage.src = imageUrl;
  analyzerImage.classList.add("hidden");
  backToMap.classList.add("hidden");

  analyzerVideo.src = ANALYZER_VIDEO;
  analyzerVideo.currentTime = 0;
  analyzerVideo.muted = false;
  analyzerVideo.classList.remove("hidden");

  analyzerViewer.classList.remove("hidden");

  await playAnalyzerVideoOrSkip();
  showAnalyzerImageNow();
}

function playAnalyzerVideoOrSkip() {
  return new Promise((resolve) => {
    let finished = false;

    function finish() {
      if (finished) return;
      finished = true;
      analyzerVideo.removeEventListener("ended", finish);
      analyzerVideo.removeEventListener("error", finish);
      resolve();
    }

    analyzerVideo.addEventListener("ended", finish);
    analyzerVideo.addEventListener("error", finish);

    const playPromise = analyzerVideo.play();

    if (playPromise && typeof playPromise.catch === "function") {
      playPromise.catch(async () => {
        try {
          analyzerVideo.muted = true;
          analyzerVideo.currentTime = 0;
          await analyzerVideo.play();
        } catch (error) {
          finish();
        }
      });
    }
  });
}

function showAnalyzerImageNow() {
  analyzerVideo.pause();
  analyzerVideo.classList.add("hidden");
  analyzerImage.classList.remove("hidden");
  backToMap.classList.remove("hidden");
}

backToMap.addEventListener("click", () => {
  analyzerVideo.pause();
  analyzerVideo.classList.add("hidden");
  analyzerViewer.classList.add("hidden");
  analyzerImage.classList.add("hidden");
  backToMap.classList.add("hidden");
  analyzerImage.removeAttribute("src");
  mapImage.src = state.currentMap;
});

function parseCsvLine(line) {
  const values = [];
  let value = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i += 1) {
    const char = line[i];
    const next = line[i + 1];

    if (char === '"' && inQuotes && next === '"') {
      value += '"';
      i += 1;
      continue;
    }

    if (char === '"') {
      inQuotes = !inQuotes;
      continue;
    }

    if (char === "," && !inQuotes) {
      values.push(value);
      value = "";
      continue;
    }

    value += char;
  }

  values.push(value);
  return values;
}

function parseCsv(text) {
  const lines = String(text || "")
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    .split("\n")
    .filter((line) => line.trim().length > 0);

  if (!lines.length) return [];

  const headers = parseCsvLine(lines[0]).map((header) => header.trim());

  return lines.slice(1).map((line, index) => {
    const values = parseCsvLine(line);
    const row = {
      __dataRowNumber: index + 1,
      __spreadsheetRowNumber: index + 2,
    };

    headers.forEach((header, columnIndex) => {
      row[header] = values[columnIndex] ?? "";
    });

    return row;
  });
}

function toNumber(value) {
  const number = Number(String(value ?? "").trim());
  return Number.isFinite(number) ? number : null;
}

function toAttackIndex(value) {
  const index = toNumber(value);

  if (index === null) return null;
  if (!Number.isInteger(index)) return null;
  if (index < 0) return null;
  if (index === ATTACK_SPRITE_INVALID) return null;

  return index;
}

function getAttackSpritePath(index, fallbackIndex = FALLBACK_HIT_ATTACK_INDEX) {
  const attackIndex = toAttackIndex(index);
  const resolvedIndex = attackIndex ?? fallbackIndex;

  return `${ATTACK_SPRITE_FOLDER}/${resolvedIndex}.${ATTACK_SPRITE_EXTENSION}`;
}

function preloadAttackSprites() {
  for (let i = 0; i < ATTACK_SPRITE_COUNT; i += 1) {
    preloadImage(getAttackSpritePath(i));
  }
}

function normalizeBattleKey(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/\.[^.]+$/, "")
    .replace(/_\d+$/, "")
    .replace(/^\d+_+/, "")
    .replace(/[^a-z0-9]+/g, "");
}

function extractSpriteLookupFromPath(path) {
  const stem = stripExtension(basename(path));
  const match = stem.match(/^(\d+)_+(.+)$/);

  if (!match) {
    return {
      rowIndex: null,
      nameKey: normalizeBattleKey(stem),
      displayNameFromFile: assetLabel(path),
    };
  }

  const rowIndex = Number(match[1]);
  const namePart = match[2].replace(/_\d+$/, "");

  return {
    rowIndex: Number.isInteger(rowIndex) ? rowIndex : null,
    nameKey: normalizeBattleKey(namePart),
    displayNameFromFile: namePart.replace(/_/g, " "),
  };
}

function getBattleFamily(row) {
  if (row.bp >= 1000) return "bememory";
  return "dim";
}

function normalizeStat(value, min, max) {
  if (!Number.isFinite(value)) return 0;
  if (!Number.isFinite(min) || !Number.isFinite(max) || max <= min) return 50;
  return Math.max(0, Math.min(100, ((value - min) / (max - min)) * 100));
}

function buildBattleData(rows) {
  const validRows = [];

  for (const row of rows) {
    const name = String(row.col2 || "").trim();
    const rowIndex = toNumber(row.row_index);
    const bp = toNumber(row.col9);
    const hp = toNumber(row.col10);
    const ap = toNumber(row.col11);
    const hitAttackIndex = toAttackIndex(row.col12);
    const megaHitAttackIndex = toAttackIndex(row.col13);

    if (!name || rowIndex === null || bp === null || hp === null || ap === null) {
      continue;
    }

    const baby = bp === 65535;

    validRows.push({
      name,
      nameKey: normalizeBattleKey(name),
      rowIndex,
      file: row.file || "",
      spreadsheetRowNumber: row.__spreadsheetRowNumber,
      bp,
      hp,
      ap,
      baby,
      family: baby ? "baby" : getBattleFamily({ bp }),
      hitAttackIndex,
      megaHitAttackIndex,
    });
  }

  const ranges = {
    dim: {
      bp: { min: Infinity, max: -Infinity },
      hp: { min: Infinity, max: -Infinity },
      ap: { min: Infinity, max: -Infinity },
    },
    bememory: {
      bp: { min: Infinity, max: -Infinity },
      hp: { min: Infinity, max: -Infinity },
      ap: { min: Infinity, max: -Infinity },
    },
  };

  for (const row of validRows) {
    if (row.baby) continue;

    const familyRanges = ranges[row.family];
    if (!familyRanges) continue;

    for (const stat of ["bp", "hp", "ap"]) {
      familyRanges[stat].min = Math.min(familyRanges[stat].min, row[stat]);
      familyRanges[stat].max = Math.max(familyRanges[stat].max, row[stat]);
    }
  }

  for (const row of validRows) {
    if (row.baby) {
      row.normalized = {
        bp: 0,
        hp: 0,
        ap: 0,
      };
      row.battleScore = 0;
      continue;
    }

    const familyRanges = ranges[row.family];

    row.normalized = {
      bp: normalizeStat(row.bp, familyRanges.bp.min, familyRanges.bp.max),
      hp: normalizeStat(row.hp, familyRanges.hp.min, familyRanges.hp.max),
      ap: normalizeStat(row.ap, familyRanges.ap.min, familyRanges.ap.max),
    };

    row.battleScore =
      row.normalized.bp * 0.5 +
      row.normalized.hp * 0.3 +
      row.normalized.ap * 0.2;
  }

  const byName = new Map();
  const byNameAndRowIndex = new Map();

  for (const row of validRows) {
    if (!byName.has(row.nameKey)) {
      byName.set(row.nameKey, []);
    }

    byName.get(row.nameKey).push(row);
    byNameAndRowIndex.set(`${row.nameKey}|${row.rowIndex}`, row);
  }

  for (const candidates of byName.values()) {
    candidates.sort((a, b) => {
      if (a.baby !== b.baby) return a.baby ? 1 : -1;
      return b.battleScore - a.battleScore;
    });
  }

  return {
    rows: validRows,
    byName,
    byNameAndRowIndex,
    ranges,
  };
}

async function loadBattleData() {
  if (state.battleData) return state.battleData;

  if (!state.battleDataPromise) {
    state.battleDataPromise = fetch(BATTLE_DATA_CSV, { cache: "no-store" })
      .then((response) => {
        if (!response.ok) {
          throw new Error(`Could not load ${BATTLE_DATA_CSV}: HTTP ${response.status}`);
        }

        return response.text();
      })
      .then((text) => buildBattleData(parseCsv(text)));
  }

  state.battleData = await state.battleDataPromise;
  return state.battleData;
}

function getStatsForPlacedSprite(sprite, battleData) {
  const path = sprite.dataset.assetPath || "";
  const lookup = extractSpriteLookupFromPath(path);

  let row = null;

  if (lookup.nameKey && lookup.rowIndex !== null) {
    row = battleData.byNameAndRowIndex.get(`${lookup.nameKey}|${lookup.rowIndex}`);
  }

  if (!row && lookup.nameKey && battleData.byName.has(lookup.nameKey)) {
    row = battleData.byName.get(lookup.nameKey)[0];
  }

  return {
    row,
    lookup,
  };
}

function getBattleSprites(kind) {
  return Array.from(placedSprites.querySelectorAll(`.placed-sprite[data-kind="${kind}"]`));
}

function getSpriteDisplayName(sprite, battleData) {
  const stats = getStatsForPlacedSprite(sprite, battleData);

  if (stats.row) {
    return stats.row.name;
  }

  return sprite.dataset.label || "Unknown";
}

function formatSpriteOption(sprite, battleData) {
  const stats = getStatsForPlacedSprite(sprite, battleData);
  const label = sprite.dataset.label || "Unknown";

  if (!stats.row) {
    return `${label} - stats not found`;
  }

  if (stats.row.baby) {
    return `${stats.row.name} - baby / cannot battle`;
  }

  return `${stats.row.name} - ${stats.row.family === "bememory" ? "BEM" : "DIM"} score ${stats.row.battleScore.toFixed(1)}`;
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function calculateBattleResult(playerStats, enemyStats) {
  const playerScore = playerStats.battleScore;
  const enemyScore = enemyStats.battleScore;

  const playerWinChance = clamp(
    1 / (1 + Math.exp((enemyScore - playerScore) / 16)),
    0.08,
    0.92
  );

  const playerRoll = playerScore + Math.random() * 24;
  const enemyRoll = enemyScore + Math.random() * 24;

  const playerWins = Math.random() < playerWinChance || playerRoll > enemyRoll;

  return {
    playerWins,
    playerWinChance,
    playerRoll,
    enemyRoll,
  };
}

function setSheetFrame(sprite, frameIndex) {
  const visual = sprite.querySelector(".sprite-visual-sheet");

  if (!visual) return;

  const position = `${(frameIndex / 11) * 100}%`;
  visual.classList.add("battle-frame-locked");
  visual.style.backgroundPosition = `center ${position}`;
}

function restoreIdleAnimation(sprite) {
  const visual = sprite.querySelector(".sprite-visual-sheet");

  if (!visual) return;

  visual.classList.remove("battle-frame-locked");
  visual.style.backgroundPosition = "";
}

function getSpriteCenter(sprite) {
  const visual = sprite.querySelector(".sprite-visual") || sprite;
  const rect = visual.getBoundingClientRect();

  return {
    x: rect.left + rect.width / 2,
    y: rect.top + rect.height / 2,
  };
}

async function animateBattleEffect(imageSrc, fromSprite, toSprite, options = {}) {
  const {
    mega = false,
    flip = false,
    duration = mega ? 1080 : 780,
  } = options;

  const from = getSpriteCenter(fromSprite);
  const to = getSpriteCenter(toSprite);

  const effect = document.createElement("img");
  effect.className = `battle-effect${mega ? " mega" : ""}${flip ? " flipped" : ""}`;
  effect.src = imageSrc;
  effect.alt = "";
  effect.setAttribute("aria-hidden", "true");

  effect.style.left = `${from.x}px`;
  effect.style.top = `${from.y}px`;

  world.appendChild(effect);

  await nextFrame();
  await nextFrame();

  effect.style.left = `${to.x}px`;
  effect.style.top = `${to.y}px`;

  await sleep(duration);

  effect.style.opacity = "0";
  await sleep(220);

  effect.remove();
}

async function playBattleSpriteAnimation(
  playerSprite,
  enemySprite,
  playerWins,
  playerStats,
  enemyStats
) {
  state.battleRunning = true;

  const playerHitSprite = getAttackSpritePath(
    playerStats?.hitAttackIndex,
    FALLBACK_HIT_ATTACK_INDEX
  );

  const enemyHitSprite = getAttackSpritePath(
    enemyStats?.hitAttackIndex,
    FALLBACK_HIT_ATTACK_INDEX
  );

  const playerMegaHitSprite = getAttackSpritePath(
    playerStats?.megaHitAttackIndex,
    playerStats?.hitAttackIndex ?? FALLBACK_MEGA_ATTACK_INDEX
  );

  const enemyMegaHitSprite = getAttackSpritePath(
    enemyStats?.megaHitAttackIndex,
    enemyStats?.hitAttackIndex ?? FALLBACK_MEGA_ATTACK_INDEX
  );

  try {
    restoreIdleAnimation(playerSprite);
    restoreIdleAnimation(enemySprite);

    await sleep(300);

    // Frame order:
    // 0 idle1, 1 idle2, 2 walk1, 3 walk2, 4 run1, 5 run2,
    // 6 training_idle, 7 training_train, 8 win, 9 lose, 10 attack, 11 dodge.

    // Three normal hits:
    // Digimon shoots col12 at Enemy.
    // Enemy also shoots its own col12 back at Digimon at the same time.
    for (let i = 0; i < 3; i += 1) {
      setSheetFrame(playerSprite, 10); // Digimon attack
      setSheetFrame(enemySprite, 10);  // Enemy attack

      playOneShot(BATTLE_HIT_SOUND);

      await Promise.all([
        animateBattleEffect(playerHitSprite, playerSprite, enemySprite, {
          mega: false,
          flip: false,
          duration: 780,
        }),

        animateBattleEffect(enemyHitSprite, enemySprite, playerSprite, {
          mega: false,
          flip: true,
          duration: 780,
        }),
      ]);

      // Brief impact / reaction pose after both attacks land.
      setSheetFrame(playerSprite, 11);
      setSheetFrame(enemySprite, 11);

      await sleep(220);

      setSheetFrame(playerSprite, 0);
      setSheetFrame(enemySprite, 1);

      await sleep(BATTLE_BETWEEN_HIT_DELAY);
    }

    // Fourth hit:
    // Mega hit happens only once, from the battle winner to the loser.
    if (playerWins) {
      setSheetFrame(playerSprite, 10);
      setSheetFrame(enemySprite, 11);

      playOneShot(BATTLE_MEGA_HIT_DIGIMON_SOUND);

      await animateBattleEffect(playerMegaHitSprite, playerSprite, enemySprite, {
        mega: true,
        flip: false,
        duration: 1080,
      });

      setSheetFrame(playerSprite, 8); // win
      setSheetFrame(enemySprite, 9);  // lose

      playOneShot(BATTLE_WIN_SOUND);
    } else {
      setSheetFrame(enemySprite, 10);
      setSheetFrame(playerSprite, 11);

      playOneShot(BATTLE_MEGA_HIT_ENEMY_SOUND);

      await animateBattleEffect(enemyMegaHitSprite, enemySprite, playerSprite, {
        mega: true,
        flip: true,
        duration: 1080,
      });

      setSheetFrame(playerSprite, 9); // lose
      setSheetFrame(enemySprite, 8);  // win

      playOneShot(BATTLE_LOSE_SOUND);
    }

    await sleep(2600);

    if (playerWins && enemySprite.isConnected) {
      enemySprite.remove();
    }
  } finally {
    if (playerSprite.isConnected) {
      restoreIdleAnimation(playerSprite);
    }

    if (enemySprite.isConnected) {
      restoreIdleAnimation(enemySprite);
    }

    state.battleRunning = false;
  }
}

async function renderBattlePanel() {
  const wrapper = document.createElement("div");
  wrapper.innerHTML = `
    <h2 class="panel-title">Battle</h2>
    <p class="status-note">Loading battle data...</p>
  `;

  panelHost.replaceChildren(wrapper);

  let battleData;

  try {
    battleData = await loadBattleData();
  } catch (error) {
    wrapper.innerHTML = `
      <h2 class="panel-title">Battle</h2>
      <p class="empty-note">Could not load <strong>${BATTLE_DATA_CSV}</strong>.</p>
      <p class="empty-note">${error.message || error}</p>
    `;
    return;
  }

  const playerSprites = getBattleSprites("digimon");
  const enemySprites = getBattleSprites("enemy");

  wrapper.innerHTML = `<h2 class="panel-title">Battle</h2>`;

  if (!playerSprites.length || !enemySprites.length) {
    wrapper.insertAdjacentHTML(
      "beforeend",
      `<p class="empty-note">Add at least one Digimon and one Enemy to the screen first. Tamers cannot battle.</p>`
    );
    panelHost.replaceChildren(wrapper);
    return;
  }

  const playerRow = document.createElement("div");
  playerRow.className = "battle-row";

  const enemyRow = document.createElement("div");
  enemyRow.className = "battle-row";

  const playerLabel = document.createElement("label");
  playerLabel.textContent = "Your Digimon";

  const enemyLabel = document.createElement("label");
  enemyLabel.textContent = "Enemy";

  const playerSelect = document.createElement("select");
  playerSelect.className = "battle-select";

  const enemySelect = document.createElement("select");
  enemySelect.className = "battle-select";

  for (const sprite of playerSprites) {
    const option = document.createElement("option");
    option.value = sprite.dataset.spriteId;
    option.textContent = formatSpriteOption(sprite, battleData);

    const stats = getStatsForPlacedSprite(sprite, battleData);
    if (!stats.row || stats.row.baby) {
      option.disabled = true;
    }

    playerSelect.appendChild(option);
  }

  for (const sprite of enemySprites) {
    const option = document.createElement("option");
    option.value = sprite.dataset.spriteId;
    option.textContent = formatSpriteOption(sprite, battleData);

    const stats = getStatsForPlacedSprite(sprite, battleData);
    if (!stats.row || stats.row.baby) {
      option.disabled = true;
    }

    enemySelect.appendChild(option);
  }

  const startButton = document.createElement("button");
  startButton.className = "panel-button";
  startButton.type = "button";
  startButton.textContent = "Start Battle";

  const resultBox = document.createElement("div");
  resultBox.className = "battle-result hidden";

  startButton.addEventListener("click", async () => {
    if (state.battleRunning) return;

    const playerSprite = placedSprites.querySelector(
      `.placed-sprite[data-sprite-id="${playerSelect.value}"]`
    );
    const enemySprite = placedSprites.querySelector(
      `.placed-sprite[data-sprite-id="${enemySelect.value}"]`
    );

    if (!playerSprite || !enemySprite) {
      resultBox.classList.remove("hidden");
      resultBox.innerHTML = `<span class="battle-warning">One of the selected sprites no longer exists.</span>`;
      return;
    }

    const playerStats = getStatsForPlacedSprite(playerSprite, battleData).row;
    const enemyStats = getStatsForPlacedSprite(enemySprite, battleData).row;

    if (!playerStats || !enemyStats) {
      resultBox.classList.remove("hidden");
      resultBox.innerHTML = `<span class="battle-warning">Could not find battle stats for one of these sprites.</span>`;
      return;
    }

    if (playerStats.baby || enemyStats.baby) {
      resultBox.classList.remove("hidden");
      resultBox.innerHTML = `<span class="battle-warning">Baby Digimon with BP 65535 cannot battle.</span>`;
      return;
    }

    const result = calculateBattleResult(playerStats, enemyStats);

    const winner = result.playerWins ? playerStats : enemyStats;
    const loser = result.playerWins ? enemyStats : playerStats;

    resultBox.classList.remove("hidden");
    resultBox.innerHTML = `
      <div><strong>${playerStats.name}</strong> vs <strong>${enemyStats.name}</strong></div>
      <div>${playerStats.name}: normalized score ${playerStats.battleScore.toFixed(1)}</div>
      <div>${enemyStats.name}: normalized score ${enemyStats.battleScore.toFixed(1)}</div>
      <div>Win chance for ${playerStats.name}: ${(result.playerWinChance * 100).toFixed(1)}%</div>
      <hr>
      <div class="winner">Winner: ${winner.name}</div>
      <div class="loser">Loser: ${loser.name}</div>
    `;

    toggleMenu(false);
    await playBattleSpriteAnimation(playerSprite, enemySprite, result.playerWins, playerStats, enemyStats);
  });

  playerRow.appendChild(playerLabel);
  playerRow.appendChild(playerSelect);

  enemyRow.appendChild(enemyLabel);
  enemyRow.appendChild(enemySelect);

  wrapper.appendChild(playerRow);
  wrapper.appendChild(enemyRow);
  wrapper.appendChild(startButton);
  wrapper.appendChild(resultBox);

  panelHost.replaceChildren(wrapper);
}

function getPlacedDigimonSprites() {
  return Array.from(placedSprites.querySelectorAll(`.placed-sprite[data-kind="digimon"]`));
}

function findPlacedSpriteById(spriteId) {
  return Array.from(placedSprites.querySelectorAll(".placed-sprite")).find(
    (sprite) => sprite.dataset.spriteId === String(spriteId)
  );
}

function formatEvolutionTargetOption(sprite) {
  return sprite.dataset.label || sprite.title || "Unknown Digimon";
}

function createEvolutionChoiceButton(path, targetSelect) {
  const button = document.createElement("button");
  button.className = "asset-card";
  button.type = "button";
  button.title = assetLabel(path);

  const thumb = document.createElement("div");
  thumb.className = "spritesheet-thumb";
  thumb.style.backgroundImage = `url("${path}")`;
  thumb.setAttribute("aria-label", assetLabel(path));
  button.appendChild(thumb);

  const name = document.createElement("div");
  name.className = "asset-name";
  name.textContent = assetLabel(path);
  button.appendChild(name);

  button.addEventListener("click", async () => {
    const targetSpriteId = targetSelect.value;

    if (!targetSpriteId) return;

    toggleMenu(false);
    await evolvePlacedDigimon(targetSpriteId, path, assetLabel(path));
  });

  return button;
}

function getEvolutionEffectGeometry(sprite) {
  const visual = sprite.querySelector(".sprite-visual") || sprite;
  const rect = visual.getBoundingClientRect();

  const width = clamp(
    rect.width * 1.35,
    86,
    Math.min(190, window.innerWidth * 0.34)
  );

  // evolution.gif is tall, roughly 64x256, so keep a 1:4 shape.
  const height = Math.min(window.innerHeight * 0.92, width * 4);

  const centerX = rect.left + rect.width / 2;
  const bottomY = Math.min(window.innerHeight, rect.bottom + 10);

  return {
    left: centerX - width / 2,
    top: bottomY - height,
    width,
    height,
  };
}

async function showEvolutionEffect(sprite) {
  const geometry = getEvolutionEffectGeometry(sprite);

  const effect = document.createElement("div");
  effect.className = "evolution-effect";
  effect.style.left = `${geometry.left}px`;
  effect.style.top = `${geometry.top}px`;
  effect.style.width = `${geometry.width}px`;
  effect.style.height = `${geometry.height}px`;

  const image = document.createElement("img");

  // Cache-buster helps animated GIF restart from the beginning each evolution.
  image.src = `${EVOLUTION_EFFECT_GIF}?v=${Date.now()}`;
  image.alt = "";
  image.setAttribute("aria-hidden", "true");

  effect.appendChild(image);
  world.appendChild(effect);

  await nextFrame();
  await nextFrame();

  effect.classList.add("revealed");

  await sleep(EVOLUTION_REVEAL_DURATION);

  return effect;
}

async function hideEvolutionEffect(effect) {
  if (!effect) return;

  effect.classList.add("fading");

  await sleep(EVOLUTION_FADE_DURATION);

  effect.remove();
}

async function evolvePlacedDigimon(targetSpriteId, evolutionPath, evolutionLabel) {
  if (state.battleRunning || state.evolutionRunning) return;

  const sprite = findPlacedSpriteById(targetSpriteId);

  if (!sprite || sprite.dataset.kind !== "digimon") return;

  const visual = sprite.querySelector(".sprite-visual-sheet");

  if (!visual) return;

  state.evolutionRunning = true;

  let effect = null;

  try {
    playOneShot(EVOLUTION_SOUND);

    sprite.classList.add("evolving");
    visual.classList.add("evolution-fading");

    // Frame order:
    // 0 idle1, 1 idle2, 2 walk1, 3 walk2, 4 run1, 5 run2,
    // 6 training_idle, 7 training_train, 8 win, 9 lose, 10 attack, 11 dodge.

    // First, show the current Digimon's win sprite.
    setSheetFrame(sprite, 8);

    await sleep(EVOLUTION_CURRENT_WIN_DELAY);

    // Reveal battle/evolution.gif from bottom to top while current Digimon is in win pose.
    effect = await showEvolutionEffect(sprite);

    // Fade the current Digimon win sprite out while the evolution beam is visible.
    visual.classList.add("evolution-hidden");

    await sleep(EVOLUTION_FADE_DURATION);

    // Replace the actual spritesheet while hidden.
    sprite.dataset.label = evolutionLabel;
    sprite.dataset.assetPath = evolutionPath;
    sprite.title = evolutionLabel;

    visual.style.backgroundImage = `url("${evolutionPath}")`;
    visual.setAttribute("aria-label", evolutionLabel);

    // Keep the evolved Digimon locked to its win sprite before fading it in.
    setSheetFrame(sprite, 8);

    await nextFrame();

    // Fade the evolved Digimon win sprite in while the beam fades away.
    visual.classList.remove("evolution-hidden");

    await hideEvolutionEffect(effect);
    effect = null;

    // Keep evolved Digimon's win sprite visible for a bit.
    await sleep(EVOLUTION_WIN_HOLD_DURATION);
  } finally {
    if (effect) {
      effect.remove();
    }

    if (sprite.isConnected) {
      const currentVisual = sprite.querySelector(".sprite-visual-sheet");

      if (currentVisual) {
        currentVisual.classList.remove("evolution-fading", "evolution-hidden");
      }

      // Return evolved Digimon to idle1-idle2 animation.
      restoreIdleAnimation(sprite);

      sprite.classList.remove("evolving");
    }

    state.evolutionRunning = false;
  }
}

function renderEvolutionPanel() {
  const assets = state.assets.digimon || [];
  const placedDigimon = getPlacedDigimonSprites();

  const wrapper = document.createElement("div");
  wrapper.innerHTML = `<h2 class="panel-title">Evolution</h2>`;

  if (!placedDigimon.length) {
    wrapper.insertAdjacentHTML(
      "beforeend",
      `<p class="empty-note">Add at least one Digimon to the screen first. Tamers and enemies cannot be evolved from this menu.</p>`
    );
    panelHost.replaceChildren(wrapper);
    return;
  }

  if (!assets.length) {
    wrapper.insertAdjacentHTML(
      "beforeend",
      `<p class="empty-note">No evolution sprites found. Put Digimon spritesheets in <strong>digimon/</strong> and rebuild the manifest.</p>`
    );
    panelHost.replaceChildren(wrapper);
    return;
  }

  const targetRow = document.createElement("div");
  targetRow.className = "evolution-row";

  const targetLabel = document.createElement("label");
  targetLabel.textContent = "Evolve this Digimon";

  const targetSelect = document.createElement("select");
  targetSelect.className = "evolution-select";

  for (const sprite of placedDigimon) {
    const option = document.createElement("option");
    option.value = sprite.dataset.spriteId;
    option.textContent = formatEvolutionTargetOption(sprite);
    targetSelect.appendChild(option);
  }

  targetRow.appendChild(targetLabel);
  targetRow.appendChild(targetSelect);
  wrapper.appendChild(targetRow);

  const searchWrap = document.createElement("div");
  searchWrap.className = "sprite-search-wrap";

  const searchInput = document.createElement("input");
  searchInput.className = "search-input sprite-search-input";
  searchInput.type = "search";
  searchInput.placeholder = "Search evolution Digimon ...";
  searchInput.autocomplete = "off";

  const resultCount = document.createElement("p");
  resultCount.className = "sprite-result-count";

  searchWrap.appendChild(searchInput);
  searchWrap.appendChild(resultCount);
  wrapper.appendChild(searchWrap);

  const empty = document.createElement("p");
  empty.className = "empty-note hidden";
  empty.textContent = "No matching evolution Digimon found.";

  const grid = document.createElement("div");
  grid.className = "asset-grid";

  function renderFilteredEvolutionAssets() {
    const query = searchInput.value;
    const filteredAssets = assets.filter((path) => assetMatchesSearch(path, query));

    grid.replaceChildren();

    resultCount.textContent = query.trim()
      ? `Showing ${filteredAssets.length} of ${assets.length}`
      : `Showing all ${assets.length}`;

    empty.classList.toggle("hidden", filteredAssets.length > 0);

    const fragment = document.createDocumentFragment();

    for (const path of filteredAssets) {
      fragment.appendChild(createEvolutionChoiceButton(path, targetSelect));
    }

    grid.appendChild(fragment);
  }

  searchInput.addEventListener("input", renderFilteredEvolutionAssets);

  wrapper.appendChild(empty);
  wrapper.appendChild(grid);
  panelHost.replaceChildren(wrapper);

  renderFilteredEvolutionAssets();
  searchInput.focus();
}

function renderSpritePanel(folderKey) {
  const config = SPRITE_FOLDERS[folderKey];

  if (!config) return;

  const label = config.label;
  const assets = state.assets[config.assetsKey] || [];
  const shouldShowSearch = usesDigimonSpritesheet(config);

  const wrapper = document.createElement("div");
  wrapper.innerHTML = `<h2 class="panel-title">Add ${label}</h2>`;

  if (!assets.length) {
    wrapper.insertAdjacentHTML(
      "beforeend",
      `<p class="empty-note">No sprites found yet. Put images in <strong>${config.assetsKey}/</strong> and rebuild the manifest.</p>`
    );
    panelHost.replaceChildren(wrapper);
    return;
  }

  let searchInput = null;
  let resultCount = null;

  if (shouldShowSearch) {
    const searchWrap = document.createElement("div");
    searchWrap.className = "sprite-search-wrap";

    searchInput = document.createElement("input");
    searchInput.className = "search-input sprite-search-input";
    searchInput.type = "search";
    searchInput.placeholder = `Search ${label} ...`;
    searchInput.autocomplete = "off";

    resultCount = document.createElement("p");
    resultCount.className = "sprite-result-count";

    searchWrap.appendChild(searchInput);
    searchWrap.appendChild(resultCount);
    wrapper.appendChild(searchWrap);
  }

  const grid = document.createElement("div");
  grid.className = "asset-grid";

  const empty = document.createElement("p");
  empty.className = "empty-note hidden";
  empty.textContent = `No matching ${label} found.`;

  function renderFilteredAssets() {
    const query = searchInput ? searchInput.value : "";
    const filteredAssets = assets.filter((path) => assetMatchesSearch(path, query));

    grid.replaceChildren();

    if (resultCount) {
      resultCount.textContent = query.trim()
        ? `Showing ${filteredAssets.length} of ${assets.length}`
        : `Showing all ${assets.length}`;
    }

    empty.classList.toggle("hidden", filteredAssets.length > 0);

    const fragment = document.createDocumentFragment();

    for (const path of filteredAssets) {
      fragment.appendChild(createSpriteChoiceButton(path, config));
    }

    grid.appendChild(fragment);
  }

  if (searchInput) {
    searchInput.addEventListener("input", renderFilteredAssets);
  }

  wrapper.appendChild(empty);
  wrapper.appendChild(grid);
  panelHost.replaceChildren(wrapper);

  renderFilteredAssets();

  if (searchInput) {
    searchInput.focus();
  }
}

function getUsedPlacementSlots(side) {
  return Array.from(placedSprites.querySelectorAll(`.placed-sprite[data-side="${side}"]`))
    .map((sprite) => Number(sprite.dataset.slot))
    .filter((slot) => Number.isInteger(slot) && slot >= 0);
}

function getNextPlacementSlot(side) {
  const usedSlots = new Set(getUsedPlacementSlots(side));
  let slot = 0;

  // This is what makes deleted positions reusable.
  // If slot 2 was deleted, the next added sprite gets slot 2 again.
  while (usedSlots.has(slot)) {
    slot += 1;
  }

  return slot;
}

function getDefaultPlacedSpriteWidth() {
  const isMobile = window.matchMedia("(max-width: 720px)").matches;

  if (isMobile) {
    return clamp(window.innerWidth * 0.25, 70, 140);
  }

  return clamp(window.innerWidth * 0.13, 72, 160);
}

function getPlacedSpriteDimensions(sprite = null) {
  if (sprite) {
    const rect = sprite.getBoundingClientRect();

    if (rect.width > 0 || rect.height > 0) {
      const fallback = getDefaultPlacedSpriteWidth();

      return {
        width: rect.width || fallback,
        height: rect.height || rect.width || fallback,
      };
    }
  }

  const width = getDefaultPlacedSpriteWidth();

  return {
    width,
    height: width,
  };
}

function getBasePlacedSpriteBottom(sprite = null) {
  if (sprite) {
    const computedBottom = Number.parseFloat(window.getComputedStyle(sprite).bottom);

    if (Number.isFinite(computedBottom)) {
      return computedBottom;
    }
  }

  return window.matchMedia("(max-width: 720px)").matches ? 18 : 24;
}

function getPlacementGap() {
  return Math.min(Math.max(window.innerWidth * 0.14, 96), 180);
}

function getSpriteColumnX(side, column) {
  const gap = getPlacementGap();
  const centerX = window.innerWidth / 2;

  if (side === "left") {
    // Enemies still skip one left-of-center position.
    // column 0 = two gaps left, column 1 = three gaps left, etc.
    return centerX - gap * (column + 2);
  }

  // Tamers/Digimon start at center, then move right.
  // column 0 = center, column 1 = one gap right, etc.
  return centerX + gap * column;
}

function getVisibleColumnCount(side, sprite = null) {
  const dimensions = getPlacedSpriteDimensions(sprite);
  const halfWidth = dimensions.width / 2;

  const minX = halfWidth + PLACEMENT_EDGE_MARGIN;
  const maxX = window.innerWidth - halfWidth - PLACEMENT_EDGE_MARGIN;

  let count = 0;

  for (let column = 0; column < PLACEMENT_MAX_TEST_COLUMNS; column += 1) {
    const x = getSpriteColumnX(side, column);

    if (x < minX || x > maxX) {
      break;
    }

    count += 1;
  }

  // Very small screens may not have enough room for even the first normal column.
  // In that case, keep one clamped column.
  return Math.max(1, count);
}

function getSpritePlacementForSlot(side, slot, sprite = null) {
  const safeSlot = Number.isInteger(Number(slot)) && Number(slot) >= 0
    ? Number(slot)
    : 0;

  const dimensions = getPlacedSpriteDimensions(sprite);
  const columns = getVisibleColumnCount(side, sprite);

  let column;
  let stackLevel;

  if (safeSlot < columns) {
    // Normal horizontal placement.
    column = safeSlot;
    stackLevel = 0;
  } else {
    // Once the side reaches the screen edge, keep using the last visible column
    // and stack upward like a tower.
    column = columns - 1;
    stackLevel = safeSlot - columns + 1;
  }

  const halfWidth = dimensions.width / 2;
  const minX = halfWidth + PLACEMENT_EDGE_MARGIN;
  const maxX = window.innerWidth - halfWidth - PLACEMENT_EDGE_MARGIN;

  const x = clamp(getSpriteColumnX(side, column), minX, maxX);

  const baseBottom = getBasePlacedSpriteBottom(sprite);
  const stackStep = Math.max(46, dimensions.height * PLACEMENT_STACK_STEP_RATIO);

  // Keep tower sprites visible. If the tower reaches the top, later sprites
  // stay near the top instead of disappearing off-screen.
  const maxBottom = Math.max(
    baseBottom,
    window.innerHeight - dimensions.height - PLACEMENT_EDGE_MARGIN
  );

  const bottom = clamp(
    baseBottom + stackLevel * stackStep,
    baseBottom,
    maxBottom
  );

  return {
    x,
    bottom,
    column,
    stackLevel,
  };
}

function getSpriteXForSlot(side, slot, sprite = null) {
  return getSpritePlacementForSlot(side, slot, sprite).x;
}

function addPlacedSprite(path, label, config) {
  const isSheet = usesDigimonSpritesheet(config);

  const sprite = document.createElement("div");
  sprite.className = "placed-sprite";
  sprite.title = label;

  const side = config.side === "left" ? "left" : "right";
  const slot = getNextPlacementSlot(side);

  sprite.dataset.spriteId = String(state.nextSpriteId++);
  sprite.dataset.side = side;
  sprite.dataset.slot = String(slot);
  sprite.dataset.kind = config.kind || "sprite";
  sprite.dataset.label = label;
  sprite.dataset.assetPath = path;

  if (config.flip) {
    sprite.classList.add("enemy-sprite");
  }

  let visual;

  if (isSheet) {
    visual = document.createElement("div");
    visual.className = "sprite-visual sprite-visual-sheet";
    visual.style.backgroundImage = `url("${path}")`;
    visual.setAttribute("role", "img");
    visual.setAttribute("aria-label", label);
  } else {
    visual = document.createElement("img");
    visual.className = "sprite-visual sprite-visual-img";
    visual.src = path;
    visual.alt = label;
  }

  const deleteButton = document.createElement("button");
  deleteButton.className = "placed-delete-button";
  deleteButton.type = "button";
  deleteButton.textContent = "×";
  deleteButton.title = `Remove ${label}`;
  deleteButton.setAttribute("aria-label", `Remove ${label}`);

  deleteButton.addEventListener("pointerdown", (event) => {
    event.preventDefault();
    event.stopPropagation();
  });

  deleteButton.addEventListener("click", (event) => {
    event.preventDefault();
    event.stopPropagation();
    sprite.remove();
  });

  sprite.appendChild(visual);
  sprite.appendChild(deleteButton);

  placedSprites.appendChild(sprite);

  // Now that the sprite is in the DOM, we can measure its real rendered size.
  // That makes the edge detection and tower spacing more accurate.
  const placement = getSpritePlacementForSlot(side, slot, sprite);

  sprite.style.left = `${placement.x}px`;
  sprite.style.bottom = `${placement.bottom}px`;
  sprite.style.top = "auto";

  makeDraggable(sprite);

  return sprite;
}

function makeDraggable(element) {
  let dragging = false;
  let pointerId = null;
  let offsetX = 0;
  let offsetY = 0;

  element.addEventListener("pointerdown", (event) => {
    dragging = true;
    pointerId = event.pointerId;
    element.setPointerCapture(pointerId);

    const rect = element.getBoundingClientRect();
    offsetX = event.clientX - rect.left;
    offsetY = event.clientY - rect.top;
  });

  element.addEventListener("pointermove", (event) => {
    if (!dragging || event.pointerId !== pointerId) return;

    const x = event.clientX - offsetX + element.offsetWidth / 2;
    const y = event.clientY - offsetY + element.offsetHeight / 2;

    element.style.left = `${Math.max(0, Math.min(window.innerWidth, x))}px`;
    element.style.top = `${Math.max(0, Math.min(window.innerHeight, y))}px`;
    element.style.bottom = "auto";
  });

  function stopDragging(event) {
    if (event.pointerId !== pointerId) return;
    dragging = false;
    pointerId = null;
  }

  element.addEventListener("pointerup", stopDragging);
  element.addEventListener("pointercancel", stopDragging);

  element.addEventListener("dblclick", (event) => {
    event.preventDefault();
    event.stopPropagation();
    element.remove();
  });
}

function getSpritePositionState(sprite) {
  const rect = sprite.getBoundingClientRect();

  return {
    xRatio: clamp((rect.left + rect.width / 2) / window.innerWidth, 0, 1),
    yRatio: clamp((rect.top + rect.height / 2) / window.innerHeight, 0, 1),
  };
}

function getPlacedSpriteSaveData(sprite) {
  const position = getSpritePositionState(sprite);

  return {
    spriteId: sprite.dataset.spriteId || "",
    kind: sprite.dataset.kind || "sprite",
    side: sprite.dataset.side || "right",
    slot: Number(sprite.dataset.slot || 0),
    label: sprite.dataset.label || sprite.title || "",
    assetPath: sprite.dataset.assetPath || "",
    xRatio: position.xRatio,
    yRatio: position.yRatio,
  };
}

function createCurrentSaveState() {
  return {
    app: SAVE_STATE_APP,
    version: SAVE_STATE_VERSION,
    savedAt: new Date().toISOString(),
    viewport: {
      width: window.innerWidth,
      height: window.innerHeight,
    },
    currentMap: state.currentMap,
    digivice: {
      visible: !digiviceSprite.classList.contains("hidden"),
      src: digiviceSprite.getAttribute("src") || "",
    },
    placedSprites: Array.from(placedSprites.querySelectorAll(".placed-sprite")).map(
      getPlacedSpriteSaveData
    ),
  };
}

function makeSaveFilename() {
  const stamp = new Date()
    .toISOString()
    .replace(/[:.]/g, "-")
    .replace("T", "_")
    .replace("Z", "");

  return `digital_gate_state_${stamp}.json`;
}

function downloadTextFile(filename, text, mimeType = "application/json") {
  const blob = new Blob([text], { type: mimeType });
  const url = URL.createObjectURL(blob);

  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();

  window.setTimeout(() => URL.revokeObjectURL(url), 500);
}

function exportCurrentState() {
  const saveData = createCurrentSaveState();
  const json = JSON.stringify(saveData, null, 2);

  downloadTextFile(makeSaveFilename(), json);
}

function configForImportedSprite(item) {
  const kind = item.kind || "digimon";

  if (kind === "tamer") {
    return {
      label: "Tamer",
      assetsKey: "tamers",
      side: item.side || "right",
      flip: false,
      kind: "tamer",
    };
  }

  if (kind === "enemy") {
    return {
      label: "Enemy",
      assetsKey: "digimon",
      side: item.side || "left",
      flip: true,
      kind: "enemy",
    };
  }

  return {
    label: "Digimon",
    assetsKey: "digimon",
    side: item.side || "right",
    flip: false,
    kind: "digimon",
  };
}

function clearCurrentScreenState() {
  placedSprites.replaceChildren();

  document.querySelectorAll(".battle-effect, .evolution-effect").forEach((element) => {
    element.remove();
  });

  state.battleRunning = false;
  state.evolutionRunning = false;
}

async function restoreImportedSprite(item) {
  if (!item || !item.assetPath) return null;

  const config = configForImportedSprite(item);
  const label = item.label || assetLabel(item.assetPath);

  const sprite = addPlacedSprite(item.assetPath, label, config);

  if (!sprite) return null;

  if (item.spriteId) {
    sprite.dataset.spriteId = String(item.spriteId);
  }

  sprite.dataset.kind = config.kind;
  sprite.dataset.side = config.side;
  sprite.dataset.label = label;
  sprite.dataset.assetPath = item.assetPath;

  if (Number.isInteger(Number(item.slot))) {
    sprite.dataset.slot = String(Number(item.slot));
  }

  sprite.title = label;

  // Let the browser calculate the sprite's real size first.
  await nextFrame();
  await nextFrame();

  const rect = sprite.getBoundingClientRect();

  const centerX = clamp(Number(item.xRatio ?? 0.5), 0, 1) * window.innerWidth;
  const centerY = clamp(Number(item.yRatio ?? 0.75), 0, 1) * window.innerHeight;

  sprite.style.left = `${centerX}px`;

  // IMPORTANT:
  // xRatio is center-based because CSS uses translateX(-50%).
  // yRatio is also saved center-based, but CSS top is top-edge-based.
  // So subtract half the sprite height.
  sprite.style.top = `${clamp(centerY - rect.height / 2, 0, window.innerHeight - rect.height)}px`;
  sprite.style.bottom = "auto";

  return sprite;
}

function updateNextSpriteIdAfterImport() {
  const ids = Array.from(placedSprites.querySelectorAll(".placed-sprite"))
    .map((sprite) => Number(sprite.dataset.spriteId))
    .filter((id) => Number.isInteger(id) && id > 0);

  const maxId = ids.length ? Math.max(...ids) : 0;
  state.nextSpriteId = Math.max(state.nextSpriteId, maxId + 1);
}

async function importSavedStateObject(saveData) {
  if (!saveData || saveData.app !== SAVE_STATE_APP) {
    throw new Error("This does not look like a Digital Gate save file.");
  }

  if (!Array.isArray(saveData.placedSprites)) {
    throw new Error("Save file is missing placed sprite data.");
  }

  clearCurrentScreenState();

  const importedMap = typeof saveData.currentMap === "string" && saveData.currentMap
    ? saveData.currentMap
    : DEFAULT_MAP;

  state.currentMap = importedMap;
  mapImage.src = importedMap;

  world.classList.remove("hidden");
  intro.classList.add("hidden");

  if (saveData.digivice?.visible && saveData.digivice?.src) {
    digiviceSprite.src = saveData.digivice.src;
    digiviceSprite.classList.remove("hidden");
  } else {
    digiviceSprite.classList.add("hidden");
    digiviceSprite.removeAttribute("src");
  }

  for (const item of saveData.placedSprites) {
    await restoreImportedSprite(item);
  }

  updateNextSpriteIdAfterImport();
}

function importStateFromFile(file, statusElement) {
  if (!file) return;

  const reader = new FileReader();

  reader.addEventListener("load", async () => {
    try {
      const saveData = JSON.parse(String(reader.result || ""));
      await importSavedStateObject(saveData);

      if (statusElement) {
        statusElement.textContent = `Imported ${saveData.placedSprites.length} sprite(s).`;
      }

      toggleMenu(false);
    } catch (error) {
      if (statusElement) {
        statusElement.textContent = error.message || "Could not import save file.";
      }
    }
  });

  reader.addEventListener("error", () => {
    if (statusElement) {
      statusElement.textContent = "Could not read the selected file.";
    }
  });

  reader.readAsText(file);
}

async function playIntroVideoFromStart() {
  gateVideo.pause();
  gateVideo.src = INTRO_VIDEO;
  gateVideo.muted = false;

  try {
    gateVideo.currentTime = 0;
  } catch (error) {
    console.warn("Could not reset intro video time.", error);
  }

  try {
    await gateVideo.play();
  } catch (error) {
    try {
      gateVideo.muted = true;
      gateVideo.currentTime = 0;
      await gateVideo.play();
    } catch (mutedError) {
      console.warn("Could not replay intro video automatically.", mutedError);

      // Fallback: show the existing start button if the browser blocks playback.
      startButton.classList.remove("hidden");
    }
  }
}

async function returnToHumanWorld(statusElement = null) {
  if (state.humanWorldReturning) return;

  if (state.battleRunning || state.evolutionRunning) {
    if (statusElement) {
      statusElement.textContent = "Please wait until the current battle/evolution finishes.";
    }
    return;
  }

  state.humanWorldReturning = true;

  try {
    toggleMenu(false);

    // Hide analyzer if it is open.
    analyzerVideo.pause();
    analyzerVideo.classList.add("hidden");
    analyzerViewer.classList.add("hidden");
    analyzerImage.classList.add("hidden");
    backToMap.classList.add("hidden");
    analyzerImage.removeAttribute("src");

    // Reset only the intro flow flags.
    // This does NOT clear map, Digivice, Digimon, Tamers, Enemies, or positions.
    state.introWaitingForContinue = false;
    state.introTransitionStarted = false;

    startButton.classList.add("hidden");
    enterGateButton.classList.add("hidden");
    gateStill.classList.add("hidden");
    gateVideo.style.pointerEvents = "auto";

    whiteFlash.classList.remove("gate-slow");
    whiteFlash.classList.add("on");

    await sleep(450);

    // Show human-world intro, hide digital world, but preserve all world DOM/state.
    intro.classList.remove("hidden");
    world.classList.add("hidden");

    await nextFrame();

    await playIntroVideoFromStart();

    await sleep(180);

    whiteFlash.classList.remove("on");

    if (statusElement) {
      statusElement.textContent = "Returned to the Human World. Your Digital World state is still preserved.";
    }
  } finally {
    await sleep(450);
    state.humanWorldReturning = false;
  }
}

function renderStatePanel() {
  const wrapper = document.createElement("div");
  wrapper.innerHTML = `
    <h2 class="panel-title">Save / Load State</h2>
    <p class="status-note">
      Export saves the current map, Digivice, Tamers, Digimon, Enemies, evolved sprites, and their screen positions.
    </p>
  `;

  const exportButton = document.createElement("button");
  exportButton.className = "panel-button";
  exportButton.type = "button";
  exportButton.textContent = "Save Current State";

  exportButton.addEventListener("click", () => {
    exportCurrentState();
  });

  const importButton = document.createElement("button");
  importButton.className = "panel-button";
  importButton.type = "button";
  importButton.textContent = "Load State";

  const fileInput = document.createElement("input");
  fileInput.type = "file";
  fileInput.accept = ".json,application/json";
  fileInput.className = "hidden";

  const status = document.createElement("p");
  status.className = "status-note";

  importButton.addEventListener("click", () => {
    fileInput.value = "";
    fileInput.click();
  });

  fileInput.addEventListener("change", () => {
    const file = fileInput.files && fileInput.files[0];
    importStateFromFile(file, status);
  });

  wrapper.appendChild(exportButton);
  wrapper.appendChild(importButton);
  wrapper.appendChild(fileInput);
  wrapper.appendChild(status);

  panelHost.replaceChildren(wrapper);
}

async function init() {
  await loadAssets();

  mapImage.src = state.currentMap;

  // Preload the gate still image so the first click after the video works immediately.
  preloadImage(INTRO_STILL);

  // Preload battle effect sprites.
  preloadAttackSprites();
  preloadImage(EVOLUTION_EFFECT_GIF);

  // Preload battle sounds.
  new Audio(BATTLE_HIT_SOUND).preload = "auto";
  new Audio(BATTLE_MEGA_HIT_DIGIMON_SOUND).preload = "auto";
  new Audio(BATTLE_MEGA_HIT_ENEMY_SOUND).preload = "auto";
  new Audio(BATTLE_WIN_SOUND).preload = "auto";
  new Audio(BATTLE_LOSE_SOUND).preload = "auto";
  new Audio(EVOLUTION_SOUND).preload = "auto";

  await tryAutoplayIntro();
}

init();
