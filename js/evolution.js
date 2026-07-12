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