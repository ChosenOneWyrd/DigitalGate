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

menuPanel.addEventListener("click", (event) => {
  const button = event.target.closest("[data-open-panel]");
  if (!button) return;

  const panelName = button.dataset.openPanel;
  if (panelName === "maps") renderMapsPanel();
  if (panelName === "digivice") renderDigivicePanel();
  if (panelName === "analyzer") renderAnalyzerPanel();
  if (panelName === "tamers") renderSpritePanel("tamers");
  if (panelName === "digimon") renderSpritePanel("digimon");
  if (panelName === "enemies") renderSpritePanel("enemies");
  if (panelName === "battle") renderBattlePanel();
  if (panelName === "music") renderMusicPanel();
  if (panelName === "state") renderStatePanel();
  if (panelName === "humanworld") returnToHumanWorld();
});