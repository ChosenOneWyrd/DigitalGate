const INTRO_VIDEO = "digimon_digital_gate.mp4";
const INTRO_STILL = "digimon_digital_gate.png";
const ANALYZER_VIDEO = "analyzer1.mp4";
const DEFAULT_MAP = "maps/adv_digital_forest.png";
const ASSET_MANIFEST = "assets_manifest.json";
const ANALYZER_API_BASE = "https://digimon-analyzer-api-921902562817.us-east1.run.app";
const GATE_OPEN_SOUND = "sounds/digital_gate_open.wav";
const MAP_CHANGE_SOUND = "sounds/map_change.wav";
const DIGIVICE_BEEPS_SOUND = "sounds/digivice_beeps.wav";
const BATTLE_DATA_CSV = "battle/vb_data.csv";
const ATTACK_SPRITE_FOLDER = "battle/attacks";
const ATTACK_SPRITE_EXTENSION = "png";
const ATTACK_SPRITE_COUNT = 81;
const ATTACK_SPRITE_INVALID = 65535;
const FALLBACK_HIT_ATTACK_INDEX = 0;
const FALLBACK_MEGA_ATTACK_INDEX = 1;
const BATTLE_HIT_SOUND = "sounds/hit.wav";
const BATTLE_MEGA_HIT_DIGIMON_SOUND = "sounds/mega_hit_digimon.wav";
const BATTLE_MEGA_HIT_ENEMY_SOUND = "sounds/mega_hit_enemy.wav";
const BATTLE_WIN_SOUND = "sounds/win.wav";
const BATTLE_LOSE_SOUND = "sounds/lose.wav";
const BATTLE_BETWEEN_HIT_DELAY = 1000;
const EVOLUTION_SOUND = "sounds/evolution.wav";
const EVOLUTION_EFFECT_GIF = "battle/evolution.gif";
const EVOLUTION_REVEAL_DURATION = 950;
const EVOLUTION_FADE_DURATION = 520;
const EVOLUTION_CURRENT_WIN_DELAY = 960;
const EVOLUTION_WIN_HOLD_DURATION = 950;
const SAVE_STATE_APP = "digital-gate-state";
const SAVE_STATE_VERSION = 2;
const PLACEMENT_EDGE_MARGIN = 18;
const PLACEMENT_STACK_STEP_RATIO = 0.72;
const PLACEMENT_MAX_TEST_COLUMNS = 30;
const SPRITE_KEYBOARD_WALK_SPEED = 180;
const SPRITE_KEYBOARD_RUN_SPEED = 320;
const SPRITE_KEYBOARD_FRAME_MS = 140;
const SPRITE_DIALOGUE_DURATION = 6000;

const MAP_GROUPS = {
  Adventure: "adv_",
  Tamers: "tamers_",
  Savers: "savers_",
};

const SPRITE_FOLDERS = {
  tamers: {
    label: "Tamer",
    assetsKey: "tamers",
    side: "right",
    flip: false,
    kind: "tamer",
  },
  digimon: {
    label: "Digimon",
    assetsKey: "digimon",
    side: "right",
    flip: false,
    kind: "digimon",
  },
  enemies: {
    label: "Enemy",
    assetsKey: "digimon",
    side: "left",
    flip: true,
    kind: "enemy",
  },
};

const DIGITAL_GATE_BEEP_SOUND = "sounds/digital_gate_beep.wav";
const DIGITAL_GATE_BEEP_DELAY = 1000;

const BACKGROUND_MUSIC_VOLUME = 0.45;

const BATTLE_NEARBY_DISTANCE = 490;
const MAP_EDGE_CHANGE_MARGIN = 10;
const MAP_EDGE_SPAWN_RATIO = 0.08;
const MAP_EDGE_CHANGE_COOLDOWN = 900;