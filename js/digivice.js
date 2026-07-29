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

        state.digivice = {
            visible: true,
            src: path,
        };

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
    state.digivice = {
        visible: false,
        src: "",
    };

    digiviceSprite.classList.add("hidden");
    digiviceSprite.removeAttribute("src");
  });

  wrapper.appendChild(grid);
  wrapper.appendChild(clear);
  panelHost.replaceChildren(wrapper);
}