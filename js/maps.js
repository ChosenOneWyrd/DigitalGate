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