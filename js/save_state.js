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