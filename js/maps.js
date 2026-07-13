function mapsForPrefix(prefix) {
  return state.assets.maps
    .filter((path) => stripExtension(basename(path)).startsWith(prefix))
    .sort((a, b) => a.localeCompare(b));
}

function getOrderedMapPaths() {
  const ordered = [];
  const used = new Set();

  for (const prefix of Object.values(MAP_GROUPS)) {
    for (const path of mapsForPrefix(prefix)) {
      if (!used.has(path)) {
        ordered.push(path);
        used.add(path);
      }
    }
  }

  const leftovers = state.assets.maps
    .filter((path) => !used.has(path))
    .sort((a, b) => a.localeCompare(b));

  return ordered.concat(leftovers);
}

function getAdjacentMapPath(direction) {
  const maps = getOrderedMapPaths();

  if (!maps.length) return null;

  const currentIndex = maps.indexOf(state.currentMap);

  if (currentIndex < 0) {
    return maps[0];
  }

  if (direction === "previous") {
    return maps[(currentIndex - 1 + maps.length) % maps.length];
  }

  return maps[(currentIndex + 1) % maps.length];
}

async function setMap(path) {
  if (!path || path === state.currentMap || state.mapTransitioning) {
    toggleMenu(false);
    return;
  }

  if (state.battleRunning || state.evolutionRunning) {
    const warning = document.createElement("p");
    warning.className = "battle-warning";
    warning.textContent = "Please wait until the current battle/evolution finishes before changing maps.";
    panelHost.appendChild(warning);
    return;
  }

  state.mapTransitioning = true;
  toggleMenu(false);

  // Save the map that is currently visible before leaving it.
  saveActiveMapState();

  whiteFlash.classList.remove("gate-slow");
  playOneShot(MAP_CHANGE_SOUND);
  whiteFlash.classList.add("on");

  await sleep(875);

  state.currentMap = path;
  mapImage.src = path;

  // Restore the new map's own Digivice/Tamers/Digimon/Enemies.
  await restoreMapVisualState(path);

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