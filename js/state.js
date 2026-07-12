const state = {
  currentMap: DEFAULT_MAP,
  assets: {
    maps: [DEFAULT_MAP],
    digivices: [],
    tamers: [],
    digimon: [],
    enemies: [],
    sprites: [],
    music: [],
  },
  introWaitingForContinue: false,
  introTransitionStarted: false,
  mapTransitioning: false,
  nextSpriteId: 1,
  battleData: null,
  battleDataPromise: null,
  activeBattleCount: 0,
  battleRunning: false,
  evolutionRunning: false,
  humanWorldReturning: false,
};

const intro = document.getElementById("intro");
const gateVideo = document.getElementById("gateVideo");
const gateStill = document.getElementById("gateStill");
const startButton = document.getElementById("startButton");
const enterGateButton = document.getElementById("enterGateButton");
const whiteFlash = document.getElementById("whiteFlash");
const world = document.getElementById("world");
const mapImage = document.getElementById("mapImage");
const menuToggle = document.getElementById("menuToggle");
const menuPanel = document.getElementById("menuPanel");
const closeMenu = document.getElementById("closeMenu");
const panelHost = document.getElementById("panelHost");
const digiviceSprite = document.getElementById("digiviceSprite");
const analyzerViewer = document.getElementById("analyzerViewer");
const analyzerVideo = document.getElementById("analyzerVideo");
const analyzerImage = document.getElementById("analyzerImage");
const backToMap = document.getElementById("backToMap");
const placedSprites = document.getElementById("placedSprites");