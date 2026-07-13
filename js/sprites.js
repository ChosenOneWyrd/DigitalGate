function usesDigimonSpritesheet(config) {
  return config.assetsKey === "digimon" || config.assetsKey === "tamers";
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
  
  if (typeof selectPlacedSprite === "function") {
    selectPlacedSprite(sprite);
  }
  
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