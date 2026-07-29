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

function renderInstructionsPanel() {
  const wrapper = document.createElement("div");
  wrapper.className = "instructions-panel";

  wrapper.innerHTML = `
    <h2 class="panel-title">Instructions</h2>

    <div class="instructions-section">
      <h3>Getting Started</h3>
      <p>Open the Digital Gate, then use the settings menu to choose maps, add Tamers, add Digimon, add Enemies, play music, battle, or save and load your current world.</p>
    </div>

    <div class="instructions-section">
      <h3>Adding Characters</h3>
      <p>Use <strong>Add Tamer</strong>, <strong>Add Digimon</strong>, or <strong>Add Enemy</strong>. Selecting a character places it on the current map.</p>
      <p>Click or tap a placed character to select it. Drag a character to move it manually.</p>
    </div>

    <div class="instructions-section">
      <h3>Keyboard Controls</h3>
      <ul>
        <li><strong>Arrow Keys</strong>: Move selected character.</li>
        <li><strong>Shift + Arrow Keys</strong>: Run.</li>
        <li><strong>Caps Lock</strong>: Toggle FLY / run-in-place animation.</li>
        <li><strong>B</strong>: Battle a nearby Enemy.</li>
        <li><strong>T</strong>: Add temporary dialogue above the selected character.</li>
        <li><strong>Shift + Click</strong>: Select multiple characters.</li>
        <li><strong>Shift + T</strong>: Add the same dialogue to all selected characters.</li>
      </ul>
    </div>

    <div class="instructions-section">
      <h3>Mobile Controls</h3>
      <ul>
        <li><strong>▲ ◀ ▶ ▼</strong>: Move selected character.</li>
        <li><strong>SELECT</strong>: Toggle multi-select mode. Then tap characters to add or remove them from selection.</li>
        <li><strong>FLY</strong>: Toggle flying / run-in-place animation.</li>
        <li><strong>B</strong>: Battle a nearby Enemy.</li>
        <li><strong>T</strong>: Add temporary dialogue above the selected character.</li>
      </ul>
    </div>

    <div class="instructions-section">
      <h3>Changing Maps</h3>
      <p>Move a selected Tamer or Digimon to the left or right edge of the screen to travel to the previous or next map.</p>
      <p>Enemies stay on their own map and cannot move between maps.</p>
    </div>

    <div class="instructions-section">
      <h3>Battles</h3>
      <p>Add at least one Digimon and one Enemy. Move your Digimon near an Enemy, then press <strong>B</strong> or tap the mobile <strong>B</strong> button.</p>
      <p>During battle, attack, dodge, win, and lose sprites will play automatically.</p>
    </div>

    <div class="instructions-section">
      <h3>Save / Load</h3>
      <p>Use <strong>Save / Load State</strong> to export or import your Digital World setup, including all map states.</p>
    </div>
  `;

  panelHost.replaceChildren(wrapper);
}

menuPanel.addEventListener("click", (event) => {
  const button = event.target.closest("[data-open-panel]");
  if (!button) return;

  const panelName = button.dataset.openPanel;
  if (panelName === "maps") renderMapsPanel();
  if (panelName === "digivice") renderDigivicePanel();
  if (panelName === "analyzer") renderAnalyzerPanel();
  if (panelName === "instructions") renderInstructionsPanel();
  if (panelName === "tamers") renderSpritePanel("tamers");
  if (panelName === "digimon") renderSpritePanel("digimon");
  if (panelName === "enemies") renderSpritePanel("enemies");
  if (panelName === "battle") renderBattlePanel();
  if (panelName === "music") renderMusicPanel();
  if (panelName === "state") renderStatePanel();
  if (panelName === "humanworld") returnToHumanWorld();
});