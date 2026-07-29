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

function isSpriteBattling(sprite) {
  return sprite?.dataset?.battling === "1";
}

function setSpriteBattling(sprite, isBattling) {
  if (!sprite) return;

  if (isBattling) {
    sprite.dataset.battling = "1";
  } else {
    delete sprite.dataset.battling;
  }
}

function startBattleTracking(playerSprite, enemySprite) {
  setSpriteBattling(playerSprite, true);
  setSpriteBattling(enemySprite, true);

  state.activeBattleCount += 1;
  state.battleRunning = state.activeBattleCount > 0;
}

function stopBattleTracking(playerSprite, enemySprite) {
  setSpriteBattling(playerSprite, false);
  setSpriteBattling(enemySprite, false);

  state.activeBattleCount = Math.max(0, state.activeBattleCount - 1);
  state.battleRunning = state.activeBattleCount > 0;
}

function formatSpriteOption(sprite, battleData) {
  const stats = getStatsForPlacedSprite(sprite, battleData);
  const label = sprite.dataset.label || "Unknown";

  if (isSpriteBattling(sprite)) {
    return `${label} - already battling`;
  }

  if (!stats.row) {
    return `${label} - stats not found`;
  }

  if (stats.row.baby) {
    return `${stats.row.name} - baby / cannot battle`;
  }

  return `${stats.row.name} - ${stats.row.family === "bememory" ? "BEM" : "DIM"} score ${stats.row.battleScore.toFixed(1)}`;
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

function isCapsLockBattleRunActive() {
  return typeof capsLockRunning !== "undefined" && capsLockRunning;
}

function isSpriteSelectedForCapsLockRun(sprite) {
  if (!sprite || !sprite.isConnected) return false;
  if (!isCapsLockBattleRunActive()) return false;

  if (
    typeof selectedPlacedSprites !== "undefined" &&
    selectedPlacedSprites instanceof Set
  ) {
    return selectedPlacedSprites.has(sprite);
  }

  if (typeof selectedPlacedSprite !== "undefined") {
    return selectedPlacedSprite === sprite;
  }

  return false;
}

function getCapsLockBattleRunFrame(now = performance.now()) {
  const frameMs = typeof SPRITE_WALK_RUN_FRAME_MS === "number"
    ? SPRITE_WALK_RUN_FRAME_MS
    : 300;

  return Math.floor(now / frameMs) % 2 === 0 ? 4 : 5;
}

function setBattleIdleOrCapsRunFrame(sprite, idleFrame = 0) {
  if (!sprite || !sprite.isConnected) return;

  // Only selected sprites use run1/run2 during idle pauses.
  // Non-selected battle sprites, like the Enemy, keep their normal idle frame.
  if (isSpriteSelectedForCapsLockRun(sprite)) {
    setSheetFrame(sprite, getCapsLockBattleRunFrame());
    return;
  }

  setSheetFrame(sprite, idleFrame);
}

async function sleepBattleIdleOrCapsRun(duration, entries) {
  const shouldAnimateAnyCapsRun = entries.some((entry) => {
    return isSpriteSelectedForCapsLockRun(entry.sprite);
  });

  if (!shouldAnimateAnyCapsRun) {
    await sleep(duration);
    return;
  }

  const endAt = performance.now() + duration;

  while (performance.now() < endAt) {
    for (const entry of entries) {
      setBattleIdleOrCapsRunFrame(entry.sprite, entry.idleFrame);
    }

    await sleep(50);
  }
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
  if (isSpriteBattling(playerSprite) || isSpriteBattling(enemySprite)) {
    return;
  }

  startBattleTracking(playerSprite, enemySprite);

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

    setBattleIdleOrCapsRunFrame(playerSprite, 0);
    setBattleIdleOrCapsRunFrame(enemySprite, 1);

    await sleepBattleIdleOrCapsRun(300, [
    { sprite: playerSprite, idleFrame: 0 },
    { sprite: enemySprite, idleFrame: 1 },
    ]);

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

      setBattleIdleOrCapsRunFrame(playerSprite, 0);
      setBattleIdleOrCapsRunFrame(enemySprite, 1);

      await sleepBattleIdleOrCapsRun(BATTLE_BETWEEN_HIT_DELAY, [
        { sprite: playerSprite, idleFrame: 0 },
        { sprite: enemySprite, idleFrame: 1 },
      ]);
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

    stopBattleTracking(playerSprite, enemySprite);

    if (typeof startCapsLockRunLoopIfNeeded === "function") {
        startCapsLockRunLoopIfNeeded();
    }
  }
}

function setBattleResultBoxWarning(resultBox, message) {
  if (!resultBox) return;

  resultBox.classList.remove("hidden");
  resultBox.innerHTML = `<span class="battle-warning">${message}</span>`;
}

function setBattleResultBoxResult(resultBox, playerStats, enemyStats, result) {
  if (!resultBox) return;

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
}

async function startBattleBetweenSprites(playerSprite, enemySprite, options = {}) {
  const {
    resultBox = null,
    closeMenuOnStart = false,
  } = options;

  if (!playerSprite || !enemySprite) {
    setBattleResultBoxWarning(resultBox, "One of the selected sprites no longer exists.");
    return false;
  }

  if (playerSprite.dataset.kind !== "digimon") {
    setBattleResultBoxWarning(resultBox, "Only Digimon can start battles.");
    return false;
  }

  if (enemySprite.dataset.kind !== "enemy") {
    setBattleResultBoxWarning(resultBox, "The target must be an Enemy.");
    return false;
  }

  if (isSpriteBattling(playerSprite) || isSpriteBattling(enemySprite)) {
    setBattleResultBoxWarning(resultBox, "One of these sprites is already in another battle.");
    return false;
  }

  let battleData;

  try {
    battleData = await loadBattleData();
  } catch (error) {
    setBattleResultBoxWarning(resultBox, `Could not load battle data: ${error.message || error}`);
    return false;
  }

  const playerStats = getStatsForPlacedSprite(playerSprite, battleData).row;
  const enemyStats = getStatsForPlacedSprite(enemySprite, battleData).row;

  if (!playerStats || !enemyStats) {
    setBattleResultBoxWarning(resultBox, "Could not find battle stats for one of these sprites.");
    return false;
  }

  if (playerStats.baby || enemyStats.baby) {
    setBattleResultBoxWarning(resultBox, "Baby Digimon with BP 65535 cannot battle.");
    return false;
  }

  const result = calculateBattleResult(playerStats, enemyStats);

  setBattleResultBoxResult(resultBox, playerStats, enemyStats, result);

  if (closeMenuOnStart) {
    toggleMenu(false);
  }

  await playBattleSpriteAnimation(
    playerSprite,
    enemySprite,
    result.playerWins,
    playerStats,
    enemyStats
  );

  return true;
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
    if (!stats.row || stats.row.baby || isSpriteBattling(sprite)) {
        option.disabled = true;
    }

    playerSelect.appendChild(option);
  }

  for (const sprite of enemySprites) {
    const option = document.createElement("option");
    option.value = sprite.dataset.spriteId;
    option.textContent = formatSpriteOption(sprite, battleData);

    const stats = getStatsForPlacedSprite(sprite, battleData);
    if (!stats.row || stats.row.baby || isSpriteBattling(sprite)) {
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

    const playerSprite = placedSprites.querySelector(
      `.placed-sprite[data-sprite-id="${playerSelect.value}"]`
    );
    const enemySprite = placedSprites.querySelector(
      `.placed-sprite[data-sprite-id="${enemySelect.value}"]`
    );

    await startBattleBetweenSprites(playerSprite, enemySprite, {
        resultBox,
        closeMenuOnStart: true,
    });
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