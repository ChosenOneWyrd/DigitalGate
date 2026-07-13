const SPRITE_MOVEMENT_KEYS = new Set([
  "ArrowUp",
  "ArrowDown",
  "ArrowLeft",
  "ArrowRight",
]);

let selectedPlacedSprite = null;
let selectedPlacedSprites = new Set();

let pressedMovementKeys = new Set();
let keyboardMovementFrameRequest = null;
let keyboardMovementLastTime = 0;
let keyboardMovementFrameIndex = 0;
let keyboardMovementFrameChangedAt = 0;
let keyboardMovementRunning = false;
let lastMapEdgeChangeAt = 0;
let battleHintElement = null;
let dialogueHideTimers = new WeakMap();
let capsLockRunning = false;

function ensureBattleHintElement() {
  if (battleHintElement) return battleHintElement;

  battleHintElement = document.createElement("div");
  battleHintElement.className = "battle-nearby-hint hidden";
  battleHintElement.setAttribute("aria-live", "polite");

  world.appendChild(battleHintElement);

  return battleHintElement;
}

function hideBattleHint() {
  const hint = ensureBattleHintElement();
  hint.classList.add("hidden");
  hint.textContent = "";
}

function showBattleHint(text) {
  const hint = ensureBattleHintElement();
  hint.textContent = text;
  hint.classList.remove("hidden");
}

function isEditableKeyboardTarget(target) {
  if (!target) return false;

  const tagName = String(target.tagName || "").toLowerCase();

  return (
    tagName === "input" ||
    tagName === "textarea" ||
    tagName === "select" ||
    target.isContentEditable
  );
}

function isPlacedSpriteMovable(sprite) {
  if (!sprite) return false;
  if (!sprite.isConnected) return false;
  if (!sprite.classList.contains("placed-sprite")) return false;
  if (!sprite.querySelector(".sprite-visual-sheet")) return false;

  const kind = sprite.dataset.kind;

  if (kind !== "tamer" && kind !== "digimon" && kind !== "enemy") {
    return false;
  }

  if (sprite.classList.contains("evolving")) return false;

  return true;
}

function syncSelectedSpriteClasses() {
  const allSprites = placedSprites.querySelectorAll(".placed-sprite");

  for (const sprite of allSprites) {
    const selected = selectedPlacedSprites.has(sprite);

    sprite.classList.toggle("selected-sprite", selected);
    sprite.classList.toggle("primary-selected-sprite", selected && sprite === selectedPlacedSprite);
  }
}

function pruneSelectedSprites() {
  for (const sprite of Array.from(selectedPlacedSprites)) {
    if (!sprite || !sprite.isConnected) {
      selectedPlacedSprites.delete(sprite);
    }
  }

  if (
    !selectedPlacedSprite ||
    !selectedPlacedSprite.isConnected ||
    !selectedPlacedSprites.has(selectedPlacedSprite)
  ) {
    selectedPlacedSprite = Array.from(selectedPlacedSprites).find(isPlacedSpriteMovable) || null;
  }

  syncSelectedSpriteClasses();
}

function clearAllSelectedSprites() {
  for (const sprite of selectedPlacedSprites) {
    if (sprite && sprite.isConnected) {
        sprite.classList.remove("selected-sprite", "primary-selected-sprite", "keyboard-backward");

        if (canMovementControlSpriteFrame(sprite)) {
        restoreKeyboardIdleFrame(sprite);
        }
    }
  }

  selectedPlacedSprites.clear();
  selectedPlacedSprite = null;
  pressedMovementKeys.clear();
  hideBattleHint();

  if (keyboardMovementFrameRequest) {
    cancelAnimationFrame(keyboardMovementFrameRequest);
    keyboardMovementFrameRequest = null;
  }
}

function selectPlacedSprite(sprite, options = {}) {
  if (!isPlacedSpriteMovable(sprite)) return;

  const {
    additive = false,
    toggle = false,
  } = options;

  if (!additive && !toggle) {
    clearAllSelectedSprites();
    selectedPlacedSprites.add(sprite);
    selectedPlacedSprite = sprite;
  } else if (toggle) {
    if (selectedPlacedSprites.has(sprite)) {
      sprite.classList.remove("selected-sprite", "primary-selected-sprite", "keyboard-backward");
      selectedPlacedSprites.delete(sprite);

      if (selectedPlacedSprite === sprite) {
        selectedPlacedSprite = Array.from(selectedPlacedSprites).find(isPlacedSpriteMovable) || null;
      }
    } else {
      selectedPlacedSprites.add(sprite);
      selectedPlacedSprite = sprite;
    }
  } else if (additive) {
    selectedPlacedSprites.add(sprite);
    selectedPlacedSprite = sprite;
  }

  pruneSelectedSprites();
  updateNearbyBattleHint();
  startCapsLockRunLoopIfNeeded();
}

function clearSelectedPlacedSprite(sprite = null) {
  if (!sprite) {
    clearAllSelectedSprites();
    return;
  }

  if (!selectedPlacedSprites.has(sprite)) return;

  sprite.classList.remove("selected-sprite", "primary-selected-sprite", "keyboard-backward");
  selectedPlacedSprites.delete(sprite);

  if (selectedPlacedSprite === sprite) {
    selectedPlacedSprite = Array.from(selectedPlacedSprites).find(isPlacedSpriteMovable) || null;
  }

  pruneSelectedSprites();

  if (!selectedPlacedSprites.size) {
    pressedMovementKeys.clear();
    hideBattleHint();
  } else {
    updateNearbyBattleHint();
  }
}

function getSelectedMovableSprites() {
  pruneSelectedSprites();

  return Array.from(selectedPlacedSprites).filter(isPlacedSpriteMovable);
}

function getSelectedMovableSprite() {
  pruneSelectedSprites();

  if (selectedPlacedSprite && isPlacedSpriteMovable(selectedPlacedSprite)) {
    return selectedPlacedSprite;
  }

  selectedPlacedSprite = Array.from(selectedPlacedSprites).find(isPlacedSpriteMovable) || null;

  return selectedPlacedSprite;
}

function getPrimarySelectedDigimon() {
  const primary = getSelectedMovableSprite();

  if (primary && primary.dataset.kind === "digimon") {
    return primary;
  }

  return getSelectedMovableSprites().find((sprite) => sprite.dataset.kind === "digimon") || null;
}

function setKeyboardSheetFrame(sprite, frameIndex) {
  const visual = sprite.querySelector(".sprite-visual-sheet");

  if (!visual) return;

  const position = `${(frameIndex / 11) * 100}%`;

  visual.classList.add("battle-frame-locked");
  visual.style.backgroundPosition = `center ${position}`;
}

function restoreKeyboardIdleFrame(sprite) {
  if (!sprite) return;
  if (sprite.classList.contains("evolving")) return;

  const visual = sprite.querySelector(".sprite-visual-sheet");

  if (!visual) return;

  visual.classList.remove("battle-frame-locked");
  visual.style.backgroundPosition = "";
  sprite.classList.remove("keyboard-backward");
}

function getMovementVector() {
  let dx = 0;
  let dy = 0;

  if (pressedMovementKeys.has("ArrowLeft")) dx -= 1;
  if (pressedMovementKeys.has("ArrowRight")) dx += 1;
  if (pressedMovementKeys.has("ArrowUp")) dy -= 1;
  if (pressedMovementKeys.has("ArrowDown")) dy += 1;

  if (dx !== 0 && dy !== 0) {
    const diagonal = Math.sqrt(2);
    dx /= diagonal;
    dy /= diagonal;
  }

  return { dx, dy };
}

function hasMovementKeysPressed() {
  for (const key of SPRITE_MOVEMENT_KEYS) {
    if (pressedMovementKeys.has(key)) return true;
  }

  return false;
}

function updateCapsLockState(event) {
  // Only the actual CapsLock key should change the app's CapsLock mode.
  // This prevents ArrowUp/ArrowDown/ArrowLeft/ArrowRight keyup events from
  // turning CapsLock mode back on after a map change reset.
  if (
    event &&
    event.key === "CapsLock" &&
    typeof event.getModifierState === "function"
  ) {
    capsLockRunning = event.getModifierState("CapsLock");
  }

  syncMobileCapsButtonState();

  return capsLockRunning;
}

function shouldRunInPlaceWithCapsLock() {
  return capsLockRunning && !hasMovementKeysPressed() && getSelectedMovableSprites().length > 0;
}

function startCapsLockRunLoopIfNeeded() {
  if (shouldRunInPlaceWithCapsLock()) {
    startKeyboardMovementLoop();
  }
}

function resetCapsLockRunMode(options = {}) {
  const { restoreFrames = true } = options;

  capsLockRunning = false;
  keyboardMovementRunning = false;
  pressedMovementKeys.clear();

  if (keyboardMovementFrameRequest) {
    cancelAnimationFrame(keyboardMovementFrameRequest);
    keyboardMovementFrameRequest = null;
  }

  if (restoreFrames) {
    const sprites = placedSprites.querySelectorAll(".placed-sprite");

    for (const sprite of sprites) {
      if (canMovementControlSpriteFrame(sprite)) {
        restoreKeyboardIdleFrame(sprite);
      }
    }
  }

  syncMobileCapsButtonState();
}

function isKeyboardRunActive() {
  return keyboardMovementRunning || capsLockRunning;
}

function isSpriteCurrentlyBattling(sprite) {
  return sprite?.dataset?.battling === "1";
}

function canMovementControlSpriteFrame(sprite) {
  if (!sprite) return false;
  if (isSpriteCurrentlyBattling(sprite)) return false;
  if (sprite.classList.contains("evolving")) return false;

  return true;
}

function getElementCenter(element) {
  const visual = element.querySelector(".sprite-visual") || element;
  const rect = visual.getBoundingClientRect();

  return {
    x: rect.left + rect.width / 2,
    y: rect.top + rect.height / 2,
  };
}

function getDistanceBetweenSprites(a, b) {
  const centerA = getElementCenter(a);
  const centerB = getElementCenter(b);

  return Math.hypot(centerA.x - centerB.x, centerA.y - centerB.y);
}

function getNearestEnemyForSprite(sprite, maxDistance = Infinity) {
  if (!sprite || sprite.dataset.kind !== "digimon") {
    return null;
  }

  if (sprite.dataset.battling === "1") {
    return null;
  }

  let nearestEnemy = null;
  let nearestDistance = maxDistance;

  const enemies = Array.from(
    placedSprites.querySelectorAll('.placed-sprite[data-kind="enemy"]')
  );

  for (const enemy of enemies) {
    if (!enemy.isConnected) continue;
    if (enemy.dataset.battling === "1") continue;

    const distance = getDistanceBetweenSprites(sprite, enemy);

    if (distance <= nearestDistance) {
      nearestDistance = distance;
      nearestEnemy = enemy;
    }
  }

  return nearestEnemy;
}

function updateNearbyBattleHint() {
  const sprite = getPrimarySelectedDigimon();

  if (!sprite) {
    hideBattleHint();
    return;
  }

  const enemy = getNearestEnemyForSprite(sprite, BATTLE_NEARBY_DISTANCE);

  if (!enemy) {
    hideBattleHint();
    return;
  }

  const enemyName = enemy.dataset.label || enemy.title || "Enemy";

  showBattleHint(`Press B to battle ${enemyName}`);
}

async function attemptNearbyBattle() {
  const sprite = getPrimarySelectedDigimon();

  if (!sprite) {
    return false;
  }

  const enemy = getNearestEnemyForSprite(sprite, BATTLE_NEARBY_DISTANCE);

  if (!enemy) {
    updateNearbyBattleHint();
    return false;
  }

  hideBattleHint();

  await startBattleBetweenSprites(sprite, enemy, {
    resultBox: null,
    closeMenuOnStart: false,
  });

  updateNearbyBattleHint();

  return true;
}

function applyKeyboardFacing(sprite, dx) {
  if (!sprite) return;

  if (Math.abs(dx) < 0.001) {
    sprite.classList.remove("keyboard-backward");
    return;
  }

  const kind = sprite.dataset.kind;

  let walkingBackward = false;

  if (kind === "enemy") {
    // Enemy normally faces the opposite direction.
    // Left arrow is backward for Enemy.
    walkingBackward = dx < 0;
  } else {
    // Tamer/Digimon right arrow is backward.
    walkingBackward = dx > 0;
  }

  sprite.classList.toggle("keyboard-backward", walkingBackward);
}

function clearSpriteDialogueTimer(sprite) {
  const timer = dialogueHideTimers.get(sprite);

  if (timer) {
    window.clearTimeout(timer);
    dialogueHideTimers.delete(sprite);
  }
}

function ensureSpriteDialogueBubble(sprite) {
  let bubble = sprite.querySelector(".sprite-dialogue-bubble");

  if (bubble) {
    return bubble;
  }

  bubble = document.createElement("div");
  bubble.className = "sprite-dialogue-bubble";

  sprite.appendChild(bubble);

  return bubble;
}

function removeSpriteDialogueBubble(sprite) {
  if (!sprite) return;

  clearSpriteDialogueTimer(sprite);

  const bubble = sprite.querySelector(".sprite-dialogue-bubble");

  if (bubble) {
    bubble.remove();
  }

  delete sprite.dataset.dialogue;
}

function showSpriteDialogue(sprite, text, duration = DIALOGUE_BUBBLE_DURATION) {
  if (!sprite) return;

  const dialogue = String(text || "").trim();

  if (!dialogue) {
    removeSpriteDialogueBubble(sprite);
    return;
  }

  clearSpriteDialogueTimer(sprite);

  const bubble = ensureSpriteDialogueBubble(sprite);
  bubble.classList.remove("editing");
  bubble.textContent = dialogue;

  // Dialogue is temporary, so do not persist it into save data.
  delete sprite.dataset.dialogue;

  const timer = window.setTimeout(() => {
    const currentBubble = sprite.querySelector(".sprite-dialogue-bubble");

    if (currentBubble && !currentBubble.classList.contains("editing")) {
      currentBubble.remove();
    }

    dialogueHideTimers.delete(sprite);
  }, duration);

  dialogueHideTimers.set(sprite, timer);
}

function restoreSpriteDialogue(sprite) {
  // Backward compatibility for old save files that had persistent dialogue.
  // Show it once for 3 seconds, then remove it.
  if (!sprite) return;

  const dialogue = sprite.dataset.dialogue || "";

  if (dialogue) {
    showSpriteDialogue(sprite, dialogue, DIALOGUE_BUBBLE_DURATION);
    delete sprite.dataset.dialogue;
  }
}

function getDialogueTargetSprite() {
  const primary = getSelectedMovableSprite();

  if (primary) {
    return primary;
  }

  return getSelectedMovableSprites()[0] || null;
}

function shouldHandleTalkKey(event) {
  if (String(event.key || "").toLowerCase() !== "t") return false;
  if (isEditableKeyboardTarget(event.target)) return false;

  if (state.mapTransitioning) return false;
  if (intro && !intro.classList.contains("hidden")) return false;
  if (world && world.classList.contains("hidden")) return false;
  if (analyzerViewer && !analyzerViewer.classList.contains("hidden")) return false;
  if (menuPanel && !menuPanel.classList.contains("hidden")) return false;

  return getSelectedMovableSprites().length > 0;
}

function openSpriteDialogueInput(sprite, targets = [sprite]) {
  if (!sprite) return;

  clearSpriteDialogueTimer(sprite);

  const bubble = ensureSpriteDialogueBubble(sprite);
  bubble.classList.add("editing");
  bubble.replaceChildren();

  const input = document.createElement("input");
  input.className = "sprite-dialogue-input";
  input.type = "text";
  input.maxLength = 120;
  input.placeholder = "Type dialogue...";
  input.autocomplete = "off";

  bubble.appendChild(input);

  input.addEventListener("pointerdown", (event) => {
    event.stopPropagation();
  });

  input.addEventListener("click", (event) => {
    event.stopPropagation();
  });

  input.addEventListener("keydown", (event) => {
    event.stopPropagation();

    if (event.key === "Enter") {
      event.preventDefault();

      const text = input.value.trim();

      if (!text) {
        for (const target of targets) {
          removeSpriteDialogueBubble(target);
        }

        return;
      }

      for (const target of targets) {
        showSpriteDialogue(target, text, DIALOGUE_BUBBLE_DURATION);
      }

      return;
    }

    if (event.key === "Escape") {
      event.preventDefault();
      removeSpriteDialogueBubble(sprite);
    }
  });

  window.setTimeout(() => {
    input.focus();
  }, 0);
}

function editSelectedSpriteDialogue(applyToAllSelected = false) {
  const target = getDialogueTargetSprite();

  if (!target) return;

  const targets = applyToAllSelected
    ? getSelectedMovableSprites()
    : [target];

  openSpriteDialogueInput(target, targets);
}

function moveSpriteBy(sprite, dx, dy) {
  const rect = sprite.getBoundingClientRect();

  const width = rect.width || sprite.offsetWidth || getDefaultPlacedSpriteWidth();
  const height = rect.height || sprite.offsetHeight || width;

  const currentCenterX = rect.left + width / 2;
  const currentTop = rect.top;

  const minCenterX = width / 2;
  const maxCenterX = window.innerWidth - width / 2;

  const nextCenterX = clamp(
    currentCenterX + dx,
    minCenterX,
    maxCenterX
  );

  const nextTop = clamp(
    currentTop + dy,
    0,
    window.innerHeight - height
  );

  sprite.style.left = `${nextCenterX}px`;
  sprite.style.top = `${nextTop}px`;
  sprite.style.bottom = "auto";

  return {
    hitLeft: nextCenterX <= minCenterX + MAP_EDGE_CHANGE_MARGIN,
    hitRight: nextCenterX >= maxCenterX - MAP_EDGE_CHANGE_MARGIN,
  };
}

function getSpriteMapTransferDirection(sprite, edgeInfo, vector) {
  if (!sprite) return null;

  const kind = sprite.dataset.kind;

  if (kind !== "digimon" && kind !== "tamer") {
    return null;
  }

  if (edgeInfo.hitRight && vector.dx > 0) {
    return "next";
  }

  if (edgeInfo.hitLeft && vector.dx < 0) {
    return "previous";
  }

  return null;
}

function getSelectedGroupMapTransferDirection(edgeInfoBySprite, vector) {
  for (const [sprite, edgeInfo] of edgeInfoBySprite.entries()) {
    const direction = getSpriteMapTransferDirection(sprite, edgeInfo, vector);

    if (direction) {
      return direction;
    }
  }

  return null;
}

async function transferSelectedSpritesToAdjacentMap(direction) {
  const now = performance.now();

  if (now - lastMapEdgeChangeAt < MAP_EDGE_CHANGE_COOLDOWN) {
    return false;
  }

  const selectedSprites = getSelectedMovableSprites();
  const transferableSprites = selectedSprites.filter((sprite) => {
    const kind = sprite.dataset.kind;
    return kind === "digimon" || kind === "tamer";
  });

  if (!transferableSprites.length) return false;
  if (state.mapTransitioning) return false;
  if (state.evolutionRunning) return false;

  // Walking during battle is allowed, but changing maps during battle is blocked
  // because battle animations still reference the active sprites.
  if (state.battleRunning) return false;

  const mapDirection = direction === "previous" ? "previous" : "next";
  const targetMap = getAdjacentMapPath(mapDirection);

  if (!targetMap || targetMap === state.currentMap) {
    return false;
  }

  const currentMap = state.currentMap;
  const targetMapState = ensureMapVisualState(targetMap);
  const transferredSpriteIds = [];

  // Capture the group's current formation before removing anything.
  const formation = transferableSprites.map((sprite) => {
    const position = getSpritePositionState(sprite);

    return {
      sprite,
      xRatio: position.xRatio,
      yRatio: position.yRatio,
    };
  });

  const minXRatio = Math.min(...formation.map((item) => item.xRatio));
  const maxXRatio = Math.max(...formation.map((item) => item.xRatio));

  // Keep the group near the edge it entered from, but preserve spacing.
  // Moving right into next map: spawn near left edge.
  // Moving left into previous map: spawn near right edge.
  function getTransferredXRatio(item) {
    if (mapDirection === "next") {
      const relativeOffset = item.xRatio - minXRatio;
      return clamp(MAP_EDGE_SPAWN_RATIO + relativeOffset, MAP_EDGE_SPAWN_RATIO, 0.92);
    }

    const relativeOffset = maxXRatio - item.xRatio;
    return clamp(1 - MAP_EDGE_SPAWN_RATIO - relativeOffset, 0.08, 1 - MAP_EDGE_SPAWN_RATIO);
  }

  // Save current map before moving selected sprites between map states.
  saveActiveMapState();

  for (const item of formation) {
    const sprite = item.sprite;
    const transferItem = getPlacedSpriteSaveData(sprite);
    const config = configForImportedSprite(transferItem);

    transferItem.xRatio = getTransferredXRatio(item);
    transferItem.yRatio = item.yRatio;
    transferItem.side = config.side;
    transferItem.slot = getNextSavedSlotForMapState(targetMapState, config.side);

    const transferredSpriteId = transferItem.spriteId;

    transferredSpriteIds.push(transferredSpriteId);

    removeSpriteFromMapState(currentMap, transferredSpriteId);
    addSpriteToMapState(targetMap, transferItem);

    sprite.remove();
    clearSelectedPlacedSprite(sprite);
  }

  lastMapEdgeChangeAt = now;

  await setMap(targetMap);

  // Re-select all transferred sprites after the new map is restored.
  clearAllSelectedSprites();

  for (const spriteId of transferredSpriteIds) {
    const restoredSprite = placedSprites.querySelector(
      `.placed-sprite[data-sprite-id="${spriteId}"]`
    );

    if (restoredSprite) {
      selectPlacedSprite(restoredSprite, {
        additive: true,
      });
    }
  }

  return true;
}

function shouldHandleSpriteMovementKey(event) {
  if (!SPRITE_MOVEMENT_KEYS.has(event.key)) return false;
  if (isEditableKeyboardTarget(event.target)) return false;

  if (state.mapTransitioning) return false;
  if (intro && !intro.classList.contains("hidden")) return false;
  if (world && world.classList.contains("hidden")) return false;
  if (analyzerViewer && !analyzerViewer.classList.contains("hidden")) return false;
  if (menuPanel && !menuPanel.classList.contains("hidden")) return false;

  return getSelectedMovableSprites().length > 0;
}

function shouldHandleBattleKey(event) {
  if (String(event.key || "").toLowerCase() !== "b") return false;
  if (isEditableKeyboardTarget(event.target)) return false;

  if (state.mapTransitioning) return false;
  if (intro && !intro.classList.contains("hidden")) return false;
  if (world && world.classList.contains("hidden")) return false;
  if (analyzerViewer && !analyzerViewer.classList.contains("hidden")) return false;
  if (menuPanel && !menuPanel.classList.contains("hidden")) return false;

  return Boolean(getPrimarySelectedDigimon());
}

function updateKeyboardMovementFrame(sprite, now, forceRunAnimation = false) {
  const running = forceRunAnimation || isKeyboardRunActive();
  const frames = running ? [4, 5] : [2, 3];

  if (now - keyboardMovementFrameChangedAt >= SPRITE_KEYBOARD_FRAME_MS) {
    keyboardMovementFrameIndex = keyboardMovementFrameIndex === 0 ? 1 : 0;
    keyboardMovementFrameChangedAt = now;
  }

  setKeyboardSheetFrame(sprite, frames[keyboardMovementFrameIndex]);
}

async function keyboardMovementTick(now) {
  keyboardMovementFrameRequest = null;

  const sprites = getSelectedMovableSprites();

  if (!sprites.length) {
    hideBattleHint();
    pressedMovementKeys.clear();
    return;
  }

  const elapsedSeconds = Math.min((now - keyboardMovementLastTime) / 1000, 0.05);
  keyboardMovementLastTime = now;

  // Caps Lock ON + no arrow keys:
  // show running animation only, without moving the sprite.
  if (!hasMovementKeysPressed() && capsLockRunning) {
    for (const sprite of sprites) {
        if (!canMovementControlSpriteFrame(sprite)) {
        continue;
        }

        sprite.classList.remove("keyboard-backward");

        // Force frames 4 and 5: run1, run2.
        updateKeyboardMovementFrame(sprite, now, true);
    }

    updateNearbyBattleHint();

    keyboardMovementFrameRequest = requestAnimationFrame(keyboardMovementTick);
    return;
  }

  if (!hasMovementKeysPressed()) {
    for (const sprite of sprites) {
      restoreKeyboardIdleFrame(sprite);
    }

    updateNearbyBattleHint();
    pressedMovementKeys.clear();
    return;
  }

  const vector = getMovementVector();
  const speed = isKeyboardRunActive() ? SPRITE_KEYBOARD_RUN_SPEED : SPRITE_KEYBOARD_WALK_SPEED;

  const edgeInfoBySprite = new Map();

  for (const sprite of sprites) {
    const edgeInfo = moveSpriteBy(
      sprite,
      vector.dx * speed * elapsedSeconds,
      vector.dy * speed * elapsedSeconds
    );

    applyKeyboardFacing(sprite, vector.dx);

    if (canMovementControlSpriteFrame(sprite)) {
        updateKeyboardMovementFrame(sprite, now);
    }

    edgeInfoBySprite.set(sprite, edgeInfo);
  }

  updateNearbyBattleHint();

  const transferDirection = getSelectedGroupMapTransferDirection(edgeInfoBySprite, vector);

  if (transferDirection) {
    const transferred = await transferSelectedSpritesToAdjacentMap(transferDirection);

    if (transferred) {
      pressedMovementKeys.clear();

      for (const sprite of getSelectedMovableSprites()) {
        if (capsLockRunning) {
            updateKeyboardMovementFrame(sprite, performance.now(), true);
        } else {
            restoreKeyboardIdleFrame(sprite);
        }
      }

      if (capsLockRunning) {
        startKeyboardMovementLoop();
      }

      return;
    }
  }

  keyboardMovementFrameRequest = requestAnimationFrame(keyboardMovementTick);
}

function startKeyboardMovementLoop() {
  if (keyboardMovementFrameRequest) return;

  keyboardMovementLastTime = performance.now();
  keyboardMovementFrameChangedAt = 0;

  keyboardMovementFrameRequest = requestAnimationFrame(keyboardMovementTick);
}

function stopKeyboardMovementLoop(options = {}) {
  const {
    restoreFrame = true,
    clearKeys = true,
  } = options;

  if (keyboardMovementFrameRequest) {
    cancelAnimationFrame(keyboardMovementFrameRequest);
    keyboardMovementFrameRequest = null;
  }

  if (clearKeys) {
    pressedMovementKeys.clear();
  }

  const sprites = getSelectedMovableSprites();

  if (restoreFrame) {
    for (const sprite of sprites) {
        if (!canMovementControlSpriteFrame(sprite)) {
            continue;
        }

        if (capsLockRunning) {
            updateKeyboardMovementFrame(sprite, performance.now(), true);
        } else {
            restoreKeyboardIdleFrame(sprite);
        }
    }

    updateNearbyBattleHint();
  }

  if (!sprites.length) {
    hideBattleHint();
  }

  if (capsLockRunning && sprites.length && !hasMovementKeysPressed()) {
    startKeyboardMovementLoop();
  }
}

placedSprites.addEventListener("pointerdown", (event) => {
  if (event.target.closest(".placed-delete-button")) return;

  const sprite = event.target.closest(".placed-sprite");

  if (!sprite) return;

  selectPlacedSprite(sprite, {
    toggle: event.shiftKey || mobileSelectMode,
  });
});

window.addEventListener("keydown", async (event) => {
  updateCapsLockState(event);

  if (event.key === "CapsLock") {
    if (capsLockRunning) {
      startCapsLockRunLoopIfNeeded();
    } else {
      stopKeyboardMovementLoop({
        restoreFrame: true,
        clearKeys: false,
      });
    }

    return;
  }

  if (event.key === "Shift") {
    keyboardMovementRunning = true;
    return;
  }

  if (shouldHandleBattleKey(event)) {
    event.preventDefault();
    await attemptNearbyBattle();
    return;
  }

  if (shouldHandleTalkKey(event)) {
    event.preventDefault();
    editSelectedSpriteDialogue(event.shiftKey);
    return;
  }

  if (!shouldHandleSpriteMovementKey(event)) {
    return;
  }

  event.preventDefault();

  keyboardMovementRunning = event.shiftKey;
  pressedMovementKeys.add(event.key);

  startKeyboardMovementLoop();
});

window.addEventListener("keyup", (event) => {
  updateCapsLockState(event);

  if (event.key === "CapsLock") {
    if (capsLockRunning) {
      startCapsLockRunLoopIfNeeded();
    } else {
      stopKeyboardMovementLoop({
        restoreFrame: true,
        clearKeys: false,
      });
    }

    return;
  }

  if (event.key === "Shift") {
    keyboardMovementRunning = false;
    return;
  }

  if (!SPRITE_MOVEMENT_KEYS.has(event.key)) {
    return;
  }

  if (!pressedMovementKeys.has(event.key)) {
    return;
  }

  event.preventDefault();

  pressedMovementKeys.delete(event.key);

  if (!hasMovementKeysPressed()) {
    stopKeyboardMovementLoop({
      restoreFrame: true,
      clearKeys: false,
    });
  }
});

let mobileControlsElement = null;
let mobileSelectMode = false;

function canUseMobileControls() {
  if (state.mapTransitioning) return false;
  if (intro && !intro.classList.contains("hidden")) return false;
  if (world && world.classList.contains("hidden")) return false;
  if (analyzerViewer && !analyzerViewer.classList.contains("hidden")) return false;
  if (menuPanel && !menuPanel.classList.contains("hidden")) return false;

  if (isEditableKeyboardTarget(document.activeElement)) {
    return false;
  }

  return getSelectedMovableSprites().length > 0;
}

function syncMobileCapsButtonState() {
  const button = mobileControlsElement?.querySelector('[data-mobile-action="caps"]');

  if (!button) return;

  button.classList.toggle("active", capsLockRunning);
  button.setAttribute("aria-pressed", capsLockRunning ? "true" : "false");
}

function syncMobileSelectButtonState() {
  const button = mobileControlsElement?.querySelector('[data-mobile-action="select"]');

  if (!button) return;

  button.classList.toggle("active", mobileSelectMode);
  button.setAttribute("aria-pressed", mobileSelectMode ? "true" : "false");
}

function toggleMobileSelectMode() {
  mobileSelectMode = !mobileSelectMode;
  syncMobileSelectButtonState();
}

function setVirtualMovementKey(key, pressed) {
  if (!SPRITE_MOVEMENT_KEYS.has(key)) return;

  if (pressed) {
    if (!canUseMobileControls()) return;

    pressedMovementKeys.add(key);
    startKeyboardMovementLoop();
    return;
  }

  pressedMovementKeys.delete(key);

  if (!hasMovementKeysPressed()) {
    stopKeyboardMovementLoop({
      restoreFrame: true,
      clearKeys: false,
    });
  }
}

function setVirtualRunActive(active) {
  keyboardMovementRunning = active;

  if (active && hasMovementKeysPressed()) {
    startKeyboardMovementLoop();
  }

  if (!active && !hasMovementKeysPressed() && !capsLockRunning) {
    stopKeyboardMovementLoop({
      restoreFrame: true,
      clearKeys: false,
    });
  }
}

function toggleVirtualCapsLock() {
  capsLockRunning = !capsLockRunning;
  syncMobileCapsButtonState();

  if (capsLockRunning) {
    startCapsLockRunLoopIfNeeded();
  } else {
    stopKeyboardMovementLoop({
      restoreFrame: true,
      clearKeys: false,
    });
  }
}

function bindMobileHoldButton(button, onDown, onUp) {
  let active = false;
  let pointerId = null;

  function release(event = null) {
    if (!active) return;

    if (event) {
      event.preventDefault();
      event.stopPropagation();
    }

    active = false;
    button.classList.remove("active");

    if (
      event &&
      pointerId !== null &&
      button.hasPointerCapture &&
      button.hasPointerCapture(pointerId)
    ) {
      button.releasePointerCapture(pointerId);
    }

    pointerId = null;
    onUp();
  }

  button.addEventListener("pointerdown", (event) => {
    event.preventDefault();
    event.stopPropagation();

    active = true;
    pointerId = event.pointerId;

    button.classList.add("active");

    if (button.setPointerCapture) {
      button.setPointerCapture(pointerId);
    }

    onDown();
  });

  button.addEventListener("pointerup", release);
  button.addEventListener("pointercancel", release);
  button.addEventListener("lostpointercapture", release);

  button.addEventListener("contextmenu", (event) => {
    event.preventDefault();
  });
}

function createMobileControls() {
  if (mobileControlsElement) return;

  const controls = document.createElement("div");
  controls.className = "mobile-controls";
  controls.setAttribute("aria-label", "Mobile controls");

  controls.innerHTML = `
    <div class="mobile-joystick" aria-label="Movement joystick">
      <button class="mobile-joy-button up" type="button" data-mobile-key="ArrowUp" aria-label="Move up">▲</button>
      <button class="mobile-joy-button left" type="button" data-mobile-key="ArrowLeft" aria-label="Move left">◀</button>
      <div class="mobile-joy-center" aria-hidden="true"></div>
      <button class="mobile-joy-button right" type="button" data-mobile-key="ArrowRight" aria-label="Move right">▶</button>
      <button class="mobile-joy-button down" type="button" data-mobile-key="ArrowDown" aria-label="Move down">▼</button>
    </div>

    <div class="mobile-action-stack" aria-label="Action buttons">
        <button class="mobile-action-button" type="button" data-mobile-action="select" aria-label="Toggle multi-select" aria-pressed="false">SELECT</button>
        <button class="mobile-action-button" type="button" data-mobile-action="caps" aria-label="Toggle run in place" aria-pressed="false">FLY</button>
        <button class="mobile-action-button" type="button" data-mobile-action="battle" aria-label="Battle">B</button>
        <button class="mobile-action-button" type="button" data-mobile-action="talk" aria-label="Talk">T</button>
    </div>
  `;

  world.appendChild(controls);
  mobileControlsElement = controls;

  for (const button of controls.querySelectorAll("[data-mobile-key]")) {
    const key = button.dataset.mobileKey;

    bindMobileHoldButton(
      button,
      () => setVirtualMovementKey(key, true),
      () => setVirtualMovementKey(key, false)
    );
  }

  const selectButton = controls.querySelector('[data-mobile-action="select"]');
  const capsButton = controls.querySelector('[data-mobile-action="caps"]');
  const battleButton = controls.querySelector('[data-mobile-action="battle"]');
  const talkButton = controls.querySelector('[data-mobile-action="talk"]');

  selectButton.addEventListener("click", (event) => {
    event.preventDefault();
    event.stopPropagation();

    toggleMobileSelectMode();
  });
  
  capsButton.addEventListener("click", (event) => {
    event.preventDefault();
    event.stopPropagation();

    if (!getSelectedMovableSprites().length) return;

    toggleVirtualCapsLock();
  });

  battleButton.addEventListener("click", async (event) => {
    event.preventDefault();
    event.stopPropagation();

    if (!canUseMobileControls()) return;

    await attemptNearbyBattle();
  });

  talkButton.addEventListener("click", (event) => {
    event.preventDefault();
    event.stopPropagation();

    if (!canUseMobileControls()) return;

    editSelectedSpriteDialogue(false);
  });

  syncMobileCapsButtonState();
  syncMobileSelectButtonState();
}

createMobileControls();

window.addEventListener("blur", () => {
  keyboardMovementRunning = false;
  stopKeyboardMovementLoop();
});