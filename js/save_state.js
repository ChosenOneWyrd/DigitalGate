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

function getCurrentMapVisualState() {
  return {
    digivice: {
      visible: !digiviceSprite.classList.contains("hidden"),
      src: digiviceSprite.getAttribute("src") || "",
    },
    placedSprites: Array.from(placedSprites.querySelectorAll(".placed-sprite")).map(
      getPlacedSpriteSaveData
    ),
  };
}

function saveActiveMapState() {
  if (!state.currentMap) return;

  state.mapStates[state.currentMap] = getCurrentMapVisualState();
}

function createEmptyMapVisualState() {
  return {
    digivice: {
      visible: false,
      src: "",
    },
    placedSprites: [],
  };
}

function getMapVisualState(mapPath) {
  return state.mapStates[mapPath] || createEmptyMapVisualState();
}

function ensureMapVisualState(mapPath) {
  if (!state.mapStates[mapPath]) {
    state.mapStates[mapPath] = createEmptyMapVisualState();
  }

  if (!Array.isArray(state.mapStates[mapPath].placedSprites)) {
    state.mapStates[mapPath].placedSprites = [];
  }

  if (!state.mapStates[mapPath].digivice) {
    state.mapStates[mapPath].digivice = {
      visible: false,
      src: "",
    };
  }

  return state.mapStates[mapPath];
}

function getNextSavedSlotForMapState(mapState, side) {
  const usedSlots = new Set(
    (mapState.placedSprites || [])
      .filter((item) => (item.side || "right") === side)
      .map((item) => Number(item.slot))
      .filter((slot) => Number.isInteger(slot) && slot >= 0)
  );

  let slot = 0;

  while (usedSlots.has(slot)) {
    slot += 1;
  }

  return slot;
}

function removeSpriteFromMapState(mapPath, spriteId) {
  const mapState = ensureMapVisualState(mapPath);

  mapState.placedSprites = mapState.placedSprites.filter((item) => {
    return String(item.spriteId) !== String(spriteId);
  });
}

function addSpriteToMapState(mapPath, item) {
  const mapState = ensureMapVisualState(mapPath);

  mapState.placedSprites = mapState.placedSprites.filter((existing) => {
    return String(existing.spriteId) !== String(item.spriteId);
  });

  mapState.placedSprites.push(item);
}

function cloneMapStatesForSave() {
  return JSON.parse(JSON.stringify(state.mapStates || {}));
}

function countSpritesInMapStates(mapStates) {
  return Object.values(mapStates || {}).reduce((total, mapState) => {
    return total + (Array.isArray(mapState?.placedSprites) ? mapState.placedSprites.length : 0);
  }, 0);
}

function getHighestSpriteIdInMapStates(mapStates) {
  let maxId = 0;

  for (const mapState of Object.values(mapStates || {})) {
    const sprites = Array.isArray(mapState?.placedSprites) ? mapState.placedSprites : [];

    for (const sprite of sprites) {
      const id = Number(sprite.spriteId);

      if (Number.isInteger(id) && id > maxId) {
        maxId = id;
      }
    }
  }

  return maxId;
}

function createCurrentSaveState() {
  // Important: capture the currently visible map before exporting.
  saveActiveMapState();

  const mapStates = cloneMapStatesForSave();

  return {
    app: SAVE_STATE_APP,
    version: SAVE_STATE_VERSION,
    savedAt: new Date().toISOString(),
    viewport: {
      width: window.innerWidth,
      height: window.innerHeight,
    },
    currentMap: state.currentMap,
    nextSpriteId: state.nextSpriteId,
    mapStates,
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

  state.activeBattleCount = 0;
  state.battleRunning = false;
  state.evolutionRunning = false;
}

function clearDigiviceVisualState() {
  digiviceSprite.classList.add("hidden");
  digiviceSprite.removeAttribute("src");
}

function restoreDigiviceVisualState(digiviceState) {
  if (digiviceState?.visible && digiviceState?.src) {
    digiviceSprite.src = digiviceState.src;
    digiviceSprite.classList.remove("hidden");
  } else {
    clearDigiviceVisualState();
  }
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

  await nextFrame();
  await nextFrame();

  const rect = sprite.getBoundingClientRect();

  const centerX = clamp(Number(item.xRatio ?? 0.5), 0, 1) * window.innerWidth;
  const centerY = clamp(Number(item.yRatio ?? 0.75), 0, 1) * window.innerHeight;

  sprite.style.left = `${centerX}px`;
  sprite.style.top = `${clamp(centerY - rect.height / 2, 0, window.innerHeight - rect.height)}px`;
  sprite.style.bottom = "auto";

  return sprite;
}

async function restoreMapVisualState(mapPath) {
  clearCurrentScreenState();

  const mapState = getMapVisualState(mapPath);

  restoreDigiviceVisualState(mapState.digivice);

  const sprites = Array.isArray(mapState.placedSprites) ? mapState.placedSprites : [];

  for (const item of sprites) {
    await restoreImportedSprite(item);
  }
}

function normalizeImportedMapStates(saveData) {
  if (saveData?.mapStates && typeof saveData.mapStates === "object") {
    return saveData.mapStates;
  }

  // Backward compatibility with old version-1 save files.
  const importedMap = typeof saveData.currentMap === "string" && saveData.currentMap
    ? saveData.currentMap
    : DEFAULT_MAP;

  return {
    [importedMap]: {
      digivice: saveData.digivice || {
        visible: false,
        src: "",
      },
      placedSprites: Array.isArray(saveData.placedSprites) ? saveData.placedSprites : [],
    },
  };
}

function updateNextSpriteIdAfterImport(saveData = null) {
  const highestSavedId = getHighestSpriteIdInMapStates(state.mapStates);

  const activeDomIds = Array.from(placedSprites.querySelectorAll(".placed-sprite"))
    .map((sprite) => Number(sprite.dataset.spriteId))
    .filter((id) => Number.isInteger(id) && id > 0);

  const highestActiveId = activeDomIds.length ? Math.max(...activeDomIds) : 0;
  const importedNextId = Number(saveData?.nextSpriteId);

  state.nextSpriteId = Math.max(
    Number.isInteger(importedNextId) ? importedNextId : 1,
    highestSavedId + 1,
    highestActiveId + 1
  );
}

async function importSavedStateObject(saveData) {
  if (!saveData || saveData.app !== SAVE_STATE_APP) {
    throw new Error("This does not look like a Digital Gate save file.");
  }

  const importedMapStates = normalizeImportedMapStates(saveData);

  if (!importedMapStates || typeof importedMapStates !== "object") {
    throw new Error("Save file is missing map state data.");
  }

  state.mapStates = JSON.parse(JSON.stringify(importedMapStates));

  const importedMap = typeof saveData.currentMap === "string" && saveData.currentMap
    ? saveData.currentMap
    : DEFAULT_MAP;

  state.currentMap = importedMap;
  mapImage.src = importedMap;

  world.classList.remove("hidden");
  intro.classList.add("hidden");

  state.nextSpriteId = 1;

  await restoreMapVisualState(importedMap);

  updateNextSpriteIdAfterImport(saveData);
}

function importStateFromFile(file, statusElement) {
  if (!file) return;

  const reader = new FileReader();

  reader.addEventListener("load", async () => {
    try {
      const saveData = JSON.parse(String(reader.result || ""));
      await importSavedStateObject(saveData);

      const totalSprites = countSpritesInMapStates(state.mapStates);
      const totalMaps = Object.keys(state.mapStates || {}).length;

      if (statusElement) {
        statusElement.textContent = `Imported ${totalSprites} sprite(s) across ${totalMaps} map(s).`;
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

function renderStatePanel() {
  const wrapper = document.createElement("div");
  wrapper.innerHTML = `
    <h2 class="panel-title">Save / Load State</h2>
    <p class="status-note">
      Export saves every map's Digivice, Tamers, Digimon, Enemies, evolved sprites, and screen positions.
    </p>
  `;

  const exportButton = document.createElement("button");
  exportButton.className = "panel-button";
  exportButton.type = "button";
  exportButton.textContent = "Save All Map States";

  exportButton.addEventListener("click", () => {
    exportCurrentState();
  });

  const importButton = document.createElement("button");
  importButton.className = "panel-button";
  importButton.type = "button";
  importButton.textContent = "Load All Map States";

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