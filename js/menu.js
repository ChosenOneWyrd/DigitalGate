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
      <h3>Demo Video</h3>
      <p><a href="https://drive.google.com/file/d/11XuSXSe3T5EkmDCEG0mJb53JwdTAT1bX/view?usp=sharing" target="_blank" rel="noopener noreferrer" style="color: #ffffff;">Watch the demo video</a></p>
    </div>

    <div class="instructions-section">
      <h3>Maps</h3>
      <p>Click on the <strong>Maps</strong> option in the Settings menu and scroll below to change the current map. You can also navigate between maps by moving a character to the edges of the screen by selecting them with Left Click and then using the arrow keys.</p>
      <p>All characters are saved on each map unless defeated or deleted until the browser window is refreshed. You are also allowed to save and load your progress at any time.</p>
    </div>

    <div class="instructions-section">
      <h3>Digivice</h3>
      <p>Click on <strong>Digivice</strong> and scroll below to select a digivice. Once added to the screen, click on the Digivice icon to evolve any digimon present on the screen.</p>
    </div>

    <div class="instructions-section">
      <h3>Adding Characters / Digivice</h3>
      <p>Click on <strong>Add Tamer</strong>, <strong>Add Digimon</strong>, or <strong>Add Enemy</strong> and scroll below to add characters to the current map.</p>
    </div>

    <div class="instructions-section">
      <h3>Moving Characters</h3>
      <p>Click or tap a placed character to select it. To move the characters, use the arrow keys or drag the character to move it manually.</p>
      <p>To select multiple characters, hold Shift and click or tap the characters you want to select.</p>
    </div>

    <div class="instructions-section">
      <h3>Keyboard Controls</h3>
      <ul>
        <li><strong>Left Click</strong>: Select a character.</li>
        <li><strong>Shift + Click</strong>: Select multiple characters.</li>
        <li><strong>Arrow Keys</strong>: Move selected character.</li>
        <li><strong>Shift + Arrow Keys</strong>: Fly or Run.</li>
        <li><strong>Caps Lock</strong>: Toggle Fly / Run-in-place animation.</li>
        <li><strong>B</strong>: Battle a nearby Enemy.</li>
        <li><strong>T</strong>: Add temporary dialogue above the selected character to make it talk.</li>
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
      <h3>Battles</h3>
      <p>Battles happen between one digimon and one enemy at a time. To start abattle, move your Digimon near an Enemy by clicking and using arrow keys, then press the <strong>B</strong> button.</p>
      <p>Alternatively, you can use the Battle option in Settings menu, scroll down and start a battle.</p>
    </div>

    <div class="instructions-section">
      <h3>Talk</h3>
      <p>Select a character with Left Click. Then use the <strong>T</strong> key to add temporary dialogue above the selected character and type in your dialogue, press Enter to confirm.</p>
      <p>Press <strong>Shift + T</strong> to add the same dialogue to all selected characters.</p>
    </div>

    <div class="instructions-section">
      <h3>Music</h3>
      <p>Use the <strong>Music</strong> option in the Settings menu to play a background music and click Stop Music to stop it.</p>
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