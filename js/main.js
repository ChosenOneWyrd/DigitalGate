async function init() {
  await loadAssets();

  mapImage.src = state.currentMap;

  preloadImage(INTRO_STILL);

  preloadAttackSprites();
  preloadImage(EVOLUTION_EFFECT_GIF);

  new Audio(BATTLE_HIT_SOUND).preload = "auto";
  new Audio(BATTLE_MEGA_HIT_DIGIMON_SOUND).preload = "auto";
  new Audio(BATTLE_MEGA_HIT_ENEMY_SOUND).preload = "auto";
  new Audio(BATTLE_WIN_SOUND).preload = "auto";
  new Audio(BATTLE_LOSE_SOUND).preload = "auto";
  new Audio(EVOLUTION_SOUND).preload = "auto";

  await tryAutoplayIntro();
}

init();